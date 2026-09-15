import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  MetaWebhookPayload,
  MessageStatus,
  IncomingMessage,
} from './dto/meta-webhook.dto';
import { normalizePhone } from '../common/utils/phone.utils';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private supabase: SupabaseService) {}

  async processPayload(payload: MetaWebhookPayload) {
    if (payload.object !== 'whatsapp_business_account') return;

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;
        const { statuses, messages } = change.value;
        if (statuses?.length)
          for (const s of statuses) await this.handleStatus(s);
        if (messages?.length)
          for (const m of messages) await this.handleIncoming(m);
      }
    }
  }

  private async handleStatus(status: MessageStatus) {
    this.logger.log(`📨 Webhook status: ${status.id} → ${status.status}`);

    const statusWeights: Record<string, number> = {
      pending: 0,
      sent: 1,
      delivered: 2,
      read: 3,
      failed: 1,
    };

    // 1. Actualizar en campaign_recipients si existe (campañas masivas)
    const { data: currentRecipient } = await this.supabase.client
      .from('campaign_recipients')
      .select('id, status, delivered_at, read_at')
      .eq('message_id', status.id)
      .maybeSingle();

    if (currentRecipient) {
      const currentWeight = statusWeights[currentRecipient.status] || 0;
      const newWeight = statusWeights[status.status] || 0;

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (newWeight >= currentWeight || status.status === 'failed') {
        updateData.status = status.status;
      }

      if (status.status === 'delivered' && !currentRecipient.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      } else if (status.status === 'read') {
        if (!currentRecipient.read_at) updateData.read_at = new Date().toISOString();
        if (!currentRecipient.delivered_at) updateData.delivered_at = new Date().toISOString();
      }

      if (status.errors?.length) {
        const err: any = status.errors[0];
        updateData.error_message = `[${err.code || 'ERR'}] ${err.title || err.message || 'Error'}`;
      }

      await this.supabase.client
        .from('campaign_recipients')
        .update(updateData)
        .eq('id', currentRecipient.id);
    }

    // 2. Actualizar en messages si existe (mensajes de chat 1-a-1)
    const { data: currentMessage } = await this.supabase.client
      .from('messages')
      .select('id, status')
      .eq('meta_message_id', status.id)
      .maybeSingle();

    if (currentMessage) {
      const currentMsgWeight = statusWeights[currentMessage.status] || 0;
      const newMsgWeight = statusWeights[status.status] || 0;

      if (newMsgWeight >= currentMsgWeight || status.status === 'failed') {
        await this.supabase.client
          .from('messages')
          .update({ status: status.status })
          .eq('id', currentMessage.id);
      }
    }

    if (!currentRecipient && !currentMessage) {
      this.logger.warn(`No se encontró registro para message_id: ${status.id}`);
    }
  }

  private async handleIncoming(message: IncomingMessage) {
    const phoneNormalized = normalizePhone(message.from);
    if (!phoneNormalized) {
      this.logger.warn(`Mensaje entrante con número de teléfono inválido: ${message.from}`);
      return;
    }

    // Extraer el texto o cuerpo del mensaje
    let bodyText = '';
    if (message.type === 'text') {
      bodyText = message.text?.body || '';
    } else if (message.type === 'button') {
      bodyText = message.button?.text || '';
    } else if (message.type === 'interactive') {
      bodyText =
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        '';
    } else {
      bodyText = message.text?.body || (message.type ? `[${message.type}]` : '');
    }

    // 1. Manejo de Opt-Out (STOP, CANCELAR, BAJA)
    const upperText = bodyText.trim().toUpperCase();
    if (['STOP', 'CANCELAR', 'BAJA'].includes(upperText)) {
      this.logger.warn(`🚫 Opt-out de ${phoneNormalized}`);
      await this.supabase.client
        .from('contacts')
        .update({ opted_out: true, opted_out_at: new Date().toISOString() })
        .eq('phone_normalized', phoneNormalized);
    }

    // 2. Buscar contacto asociado al número normalizado
    const { data: contact, error: contactError } = await this.supabase.client
      .from('contacts')
      .select('id, user_id')
      .eq('phone_normalized', phoneNormalized)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contactError) {
      this.logger.error(`Error buscando contacto para ${phoneNormalized}: ${contactError.message}`);
      return;
    }

    if (!contact) {
      this.logger.warn(`Mensaje entrante de contacto no registrado: ${phoneNormalized} (MsgID: ${message.id})`);
      return;
    }

    // 3. Idempotencia: Verificar si el mensaje ya fue insertado previamente
    if (message.id) {
      const { data: existingMessage } = await this.supabase.client
        .from('messages')
        .select('id')
        .eq('meta_message_id', message.id)
        .maybeSingle();

      if (existingMessage) {
        this.logger.log(`Mensaje duplicado de Meta ignorado (idempotencia): ${message.id}`);
        return;
      }
    }

    // 4. Relación con Campaña a través de context.id
    let campaignId: string | null = null;
    const contextMessageId = message.context?.id || null;
    if (contextMessageId) {
      const { data: recipient } = await this.supabase.client
        .from('campaign_recipients')
        .select('campaign_id')
        .eq('message_id', contextMessageId)
        .maybeSingle();

      if (recipient?.campaign_id) {
        campaignId = recipient.campaign_id;
      }
    }

    // 5. Buscar o crear la conversación para (user_id, contact_id)
    const { data: existingConv } = await this.supabase.client
      .from('conversations')
      .select('id, unread_count, last_campaign_id')
      .eq('user_id', contact.user_id)
      .eq('contact_id', contact.id)
      .maybeSingle();

    const now = new Date().toISOString();
    let conversationId: string;
    const finalCampaignId = campaignId || existingConv?.last_campaign_id || null;

    if (!existingConv) {
      const { data: newConv, error: convInsertError } = await this.supabase.client
        .from('conversations')
        .insert({
          user_id: contact.user_id,
          contact_id: contact.id,
          last_campaign_id: finalCampaignId,
          status: 'open',
          unread_count: 1,
          last_message_text: bodyText,
          last_message_at: now,
        })
        .select('id')
        .single();

      if (convInsertError) {
        // En caso de carrera / inserción concurrente, recuperar existente
        const { data: fallbackConv } = await this.supabase.client
          .from('conversations')
          .select('id, unread_count')
          .eq('user_id', contact.user_id)
          .eq('contact_id', contact.id)
          .single();

        if (!fallbackConv) {
          this.logger.error(`Error creando conversación: ${convInsertError.message}`);
          return;
        }

        conversationId = fallbackConv.id;
        await this.supabase.client
          .from('conversations')
          .update({
            last_message_text: bodyText,
            last_message_at: now,
            unread_count: (fallbackConv.unread_count || 0) + 1,
            last_campaign_id: finalCampaignId,
            updated_at: now,
          })
          .eq('id', conversationId);
      } else {
        conversationId = newConv.id;
      }
    } else {
      conversationId = existingConv.id;
      await this.supabase.client
        .from('conversations')
        .update({
          last_message_text: bodyText,
          last_message_at: now,
          unread_count: (existingConv.unread_count || 0) + 1,
          last_campaign_id: finalCampaignId,
          updated_at: now,
        })
        .eq('id', conversationId);
    }

    // 6. Insertar el mensaje entrante en messages
    const { error: msgInsertError } = await this.supabase.client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: contact.user_id,
        contact_id: contact.id,
        direction: 'inbound',
        sender_type: 'contact',
        message_type: message.type || 'text',
        body: bodyText,
        meta_message_id: message.id || null,
        status: 'delivered',
        context_message_id: contextMessageId,
        raw_payload: message,
        created_at: now,
      });

    if (msgInsertError) {
      this.logger.error(`Error al insertar mensaje entrante: ${msgInsertError.message}`);
    } else {
      this.logger.log(`Mensaje entrante guardado para contacto ${contact.id} (Conv: ${conversationId})`);
    }
  }
}
