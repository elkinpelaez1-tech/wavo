import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  MetaWebhookPayload,
  MessageStatus,
  IncomingMessage,
} from './dto/meta-webhook.dto';

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
    this.logger.log(`📨 ${status.id} → ${status.status}`);
    await this.supabase.client
      .from('message_logs')
      .update({
        status: status.status,
        delivered_at:
          status.status === 'delivered' ? new Date().toISOString() : null,
        read_at: status.status === 'read' ? new Date().toISOString() : null,
        error_code: status.errors?.[0]?.code ?? null,
        error_message: status.errors?.[0]?.title ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('meta_message_id', status.id);
  }

  private async handleIncoming(message: IncomingMessage) {
    const body = message.text?.body?.trim().toUpperCase();
    if (['STOP', 'CANCELAR', 'BAJA'].includes(body)) {
      this.logger.warn(`🚫 Opt-out de ${message.from}`);
      await this.supabase.client
        .from('contacts')
        .update({ opted_out: true, opted_out_at: new Date().toISOString() })
        .eq('phone', message.from);
    }
  }
}
