import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MetaService } from '../meta/meta.service';
import { SupabaseService } from '../supabase/supabase.service';

@Processor('messages')
export class MessageWorker extends WorkerHost {
  private readonly logger = new Logger(MessageWorker.name);

  constructor(
    private meta: MetaService,
    private supabase: SupabaseService,
  ) {
    super();
  }

  async process(job: Job) {
    const { contactId, campaignId, phone, templateName, bodyVars, imageUrl } =
      job.data;

    try {
      this.logger.log(`Procesando mensaje para ${phone}`);

      const result = await this.meta.sendTemplate(
        phone,
        templateName,
        bodyVars,
        imageUrl,
      );

      const messageId = result.messages?.[0]?.id;

      await this.supabase.client
        .from('message_logs')
        .update({
          meta_message_id: messageId,
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .match({ campaign_id: campaignId, contact_id: contactId });

      await this.supabase.client
        .from('campaigns')
        .update({ sent_count: this.supabase.client.rpc('increment', { x: 1 }) })
        .eq('id', campaignId);

      return { messageId };
    } catch (error) {
      this.logger.error(`Error enviando a ${phone}: ${error.message}`);
      
      const errorCode = error.response?.data?.error?.code || 'ERROR';
      const errorMessage = error.response?.data?.error?.message || error.message;

      await this.supabase.client
        .from('message_logs')
        .update({
          status: 'failed',
          error_code: errorCode.toString(),
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .match({ campaign_id: campaignId, contact_id: contactId });

      throw error; // Reintento por BullMQ
    }
  }
}
