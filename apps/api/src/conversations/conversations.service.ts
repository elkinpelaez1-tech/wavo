import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MetaService } from '../meta/meta.service';
import { normalizePhone } from '../common/utils/phone.utils';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private supabase: SupabaseService,
    private metaService: MetaService,
  ) {}

  async findAll(userId: string, search?: string) {
    let query = this.supabase.client
      .from('conversations')
      .select(`
        *,
        contacts (
          id,
          name,
          phone,
          phone_normalized,
          tags,
          custom_fields,
          opted_out
        ),
        campaigns (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      this.logger.error(`Error al listar conversaciones: ${error.message}`);
      throw new Error(error.message);
    }

    const conversations = (data || []).map((c: any) => {
      const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts;
      const campaign = Array.isArray(c.campaigns) ? c.campaigns[0] : c.campaigns;
      const { contacts: _, campaigns: __, ...rest } = c;
      return {
        ...rest,
        contact: contact || null,
        campaign: campaign || null,
      };
    });

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      return conversations.filter((c) => {
        const contactName = c.contact?.name?.toLowerCase() || '';
        const contactPhone = c.contact?.phone?.toLowerCase() || '';
        const phoneNormalized = c.contact?.phone_normalized?.toLowerCase() || '';
        const lastMsg = c.last_message_text?.toLowerCase() || '';
        return (
          contactName.includes(term) ||
          contactPhone.includes(term) ||
          phoneNormalized.includes(term) ||
          lastMsg.includes(term)
        );
      });
    }

    return conversations;
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.client
      .from('conversations')
      .select(`
        *,
        contacts (
          id,
          name,
          phone,
          phone_normalized,
          tags,
          custom_fields,
          opted_out
        ),
        campaigns (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const contact = Array.isArray(data.contacts) ? data.contacts[0] : data.contacts;
    const campaign = Array.isArray(data.campaigns) ? data.campaigns[0] : data.campaigns;
    const { contacts: _, campaigns: __, ...rest } = data;

    return {
      ...rest,
      contact: contact || null,
      campaign: campaign || null,
    };
  }

  async getMessages(conversationId: string, userId: string) {
    // Validar que la conversación pertenece al usuario
    const conversation = await this.findOne(conversationId, userId);

    const { data: messages, error } = await this.supabase.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Error al obtener mensajes de conversación ${conversationId}: ${error.message}`);
      throw new Error(error.message);
    }

    return {
      conversation,
      messages: messages || [],
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.findOne(conversationId, userId);

    const { data, error } = await this.supabase.client
      .from('conversations')
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error al marcar conversación como leída: ${error.message}`);
      throw new Error(error.message);
    }

    return data;
  }

  async sendMessage(conversationId: string, userId: string, text: string) {
    const trimmedText = text?.trim();
    if (!trimmedText) {
      throw new BadRequestException('El cuerpo del mensaje no puede estar vacío');
    }

    // 1. Validar que la conversación existe y pertenece al usuario
    const conversation = await this.findOne(conversationId, userId);
    if (!conversation.contact) {
      throw new BadRequestException('La conversación no tiene un contacto asociado');
    }

    // 2. Extraer y normalizar teléfono del contacto
    const phone =
      conversation.contact.phone_normalized ||
      normalizePhone(conversation.contact.phone);

    if (!phone) {
      throw new BadRequestException('El contacto no tiene un teléfono válido para WhatsApp');
    }

    // 3. Enviar mensaje de texto a través de Meta WhatsApp Cloud API
    let metaResult: any;
    try {
      metaResult = await this.metaService.sendText(phone, trimmedText);
    } catch (metaErr: any) {
      const metaErrorData = metaErr.response?.data?.error;
      const errorCode = metaErrorData?.code;
      const errorMsg = metaErrorData?.message || metaErr.message || 'Error al enviar mensaje a Meta';
      
      this.logger.error(`[ConversationsService] Error enviando mensaje a Meta (${phone}): [${errorCode}] ${errorMsg}`);
      
      // Manejo amigable de la ventana de 24h de Meta (Customer Service Window)
      if (errorCode === 131047) {
        throw new BadRequestException(
          'No es posible enviar mensaje de texto libre: han pasado más de 24 horas desde el último mensaje del contacto (Ventana de atención de Meta expirada).'
        );
      }
      
      throw new BadRequestException(`Meta API Error: [${errorCode || 'ERR'}] ${errorMsg}`);
    }

    const metaMessageId = metaResult?.messages?.[0]?.id || null;
    const now = new Date().toISOString();

    // 4. Guardar en la tabla messages como outbound
    const { data: createdMessage, error: msgInsertError } = await this.supabase.client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        contact_id: conversation.contact.id,
        direction: 'outbound',
        sender_type: 'user',
        message_type: 'text',
        body: trimmedText,
        meta_message_id: metaMessageId,
        status: 'sent',
        raw_payload: metaResult,
        created_at: now,
      })
      .select()
      .single();

    if (msgInsertError) {
      this.logger.error(`Error guardando mensaje saliente en DB: ${msgInsertError.message}`);
      throw new InternalServerErrorException('Mensaje enviado pero falló el registro en base de datos');
    }

    // 5. Actualizar conversations con el último mensaje y fecha
    await this.supabase.client
      .from('conversations')
      .update({
        last_message_text: trimmedText,
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', conversationId)
      .eq('user_id', userId);

    this.logger.log(`Mensaje saliente enviado y registrado: Conv ${conversationId} - MsgID: ${metaMessageId}`);
    return createdMessage;
  }
}
