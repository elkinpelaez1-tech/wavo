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

      if (!templateName) {
        throw new Error('No se puede enviar mensaje sin template_name');
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

      // 2. Actualizar registro en campaign_recipients (NO message_logs)
      const { error: dbError } = await this.supabase.client
        .from('campaign_recipients')
        .update({
          meta_message_id: messageId,
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .match({ campaign_id: campaignId, contact_id: contactId });

      if (dbError) {
        this.logger.error(`[Worker] Error actualizando DB para ${phone}: ${dbError.message}`);
      }

      // 3. Incrementar contador en campaña
      // Usamos una actualización simple si no hay RPC
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
      
      this.logger.error(`[Worker] FALLO Meta - Tel: ${phone} - Error: ${errorMessage}`);

      await this.supabase.client
        .from('campaign_recipients')
        .update({
          status: 'failed',
          error_code: errorCode.toString(),
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .match({ campaign_id: campaignId, contact_id: contactId });

      throw error; // BullMQ reintentará según configuración
    }
  }
}
