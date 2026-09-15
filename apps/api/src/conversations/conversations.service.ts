import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private supabase: SupabaseService) {}

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
}
