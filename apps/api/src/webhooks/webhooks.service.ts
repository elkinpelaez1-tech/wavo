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

    const { data: current, error: fetchError } = await this.supabase.client
      .from('campaign_recipients')
      .select('id, status, delivered_at, read_at')
      .eq('message_id', status.id)
      .maybeSingle();

    if (fetchError || !current) {
      this.logger.warn(`No se encontró recipient para message_id: ${status.id}`);
      return;
    }

    const statusWeights: Record<string, number> = {
      pending: 0,
      sent: 1,
      delivered: 2,
      read: 3,
      failed: 1,
    };

    const currentWeight = statusWeights[current.status] || 0;
    const newWeight = statusWeights[status.status] || 0;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Solo actualizar el status si es un avance o si es failed
    if (newWeight >= currentWeight || status.status === 'failed') {
      updateData.status = status.status;
    }

    if (status.status === 'delivered' && !current.delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    } else if (status.status === 'read') {
      if (!current.read_at) updateData.read_at = new Date().toISOString();
      if (!current.delivered_at) updateData.delivered_at = new Date().toISOString();
    }

    if (status.errors?.length) {
      const err: any = status.errors[0];
      updateData.error_message = `[${err.code || 'ERR'}] ${err.title || err.message || 'Error'}`;
    }

    await this.supabase.client
      .from('campaign_recipients')
      .update(updateData)
      .eq('id', current.id);
  }

  private async handleIncoming(message: IncomingMessage) {
    const body = message.text?.body?.trim().toUpperCase();
    if (['STOP', 'CANCELAR', 'BAJA'].includes(body)) {
      const normalized = normalizePhone(message.from);
      this.logger.warn(`🚫 Opt-out de ${normalized}`);
      await this.supabase.client
        .from('contacts')
        .update({ opted_out: true, opted_out_at: new Date().toISOString() })
        .eq('phone_normalized', normalized);
    }
  }
}
