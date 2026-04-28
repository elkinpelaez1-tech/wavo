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
    const { contactId, campaignId, phone, templateName, bodyVars, imageUrl } = job.data;

    try {
      this.logger.log(`[Worker] Procesando envío para: ${phone} (Campaña: ${campaignId})`);

      if (!templateName || templateName.trim() === '') {
        this.logger.warn(`[Worker] Abortando envío para ${phone}: No hay template_name`);
        return { error: 'No template' };
      }

      // 1. Envío real a Meta
      const result = await this.meta.sendTemplate(
        phone,
        templateName,
        bodyVars,
        imageUrl,
      );

      const messageId = result.messages?.[0]?.id;
      this.logger.log(`[Worker] Exito Meta - Tel: ${phone} - MsgID: ${messageId}`);

      // 2. Actualizar registro en campaign_recipients
      await this.supabase.client
        .from('campaign_recipients')
        .update({
          meta_message_id: messageId,
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .match({ campaign_id: campaignId, contact_id: contactId });

      // 3. Incrementar contador en campaña
      const { data: campaign } = await this.supabase.client
        .from('campaigns')
        .select('sent_count')
        .eq('id', campaignId)
        .single();
      
      await this.supabase.client
        .from('campaigns')
        .update({ sent_count: (campaign?.sent_count || 0) + 1 })
        .eq('id', campaignId);

      return { messageId };
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code || 'ERROR';
      const errorMessage = error.response?.data?.error?.message || error.message;
      const fullError = error.response?.data || 'No response data';
      
      this.logger.error(`[Worker] FALLO Meta - Tel: ${phone} - Error: ${errorMessage}`);
      this.logger.error(`[Worker] Detalle completo de Meta: ${JSON.stringify(fullError)}`);

      await this.supabase.client
        .from('campaign_recipients')
        .update({
          status: 'failed',
          error_code: errorCode.toString(),
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .match({ campaign_id: campaignId, contact_id: contactId });

      throw error;
    }
  }
}
