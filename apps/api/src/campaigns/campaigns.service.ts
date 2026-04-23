import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MessageProducer } from '../queue/message.producer';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private supabase: SupabaseService,
    private producer: MessageProducer,
  ) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase.client
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.client
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error || !data) throw new NotFoundException('Campaña no encontrada');
    return data;
  }

  async create(userId: string, dto: CreateCampaignDto) {
    const { contact_ids, ...campaignData } = dto;

    const { data: campaign, error } = await this.supabase.client
      .from('campaigns')
      .insert({
        ...campaignData,
        user_id: userId,
        status: dto.scheduled_at ? 'scheduled' : 'draft',
        total_recipients: contact_ids.length,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Crear logs iniciales por contacto
    const logs = contact_ids.map((contactId) => ({
      campaign_id: campaign.id,
      contact_id: contactId,
      status: 'queued',
    }));

    await this.supabase.client.from('message_logs').insert(logs);

    return campaign;
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(id, userId);
    if (campaign.status !== 'draft')
      throw new BadRequestException('Solo se pueden editar campañas en borrador');

    const { data, error } = await this.supabase.client
      .from('campaigns')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.supabase.client.from('campaigns').delete().eq('id', id);
    return { deleted: true };
  }

  async launch(id: string, userId: string) {
    const campaign = await this.findOne(id, userId);
    if (!['draft', 'scheduled'].includes(campaign.status))
      throw new BadRequestException('La campaña no puede lanzarse en su estado actual');

    await this.enqueueCampaign(campaign);
    return { launched: true };
  }

  async getStats(id: string, userId: string) {
    const campaign = await this.findOne(id, userId);
    const { data: logs } = await this.supabase.client
      .from('message_logs')
      .select('status')
      .eq('campaign_id', id);

    const stats = { queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    logs?.forEach((l) => { if (stats[l.status] !== undefined) stats[l.status]++; });

    return { ...campaign, stats };
  }

  // Cron: cada minuto revisa campañas programadas listas para enviar
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    const { data: campaigns } = await this.supabase.client
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (!campaigns?.length) return;

    for (const campaign of campaigns) {
      this.logger.log(`🚀 Lanzando campaña programada: ${campaign.name}`);
      await this.enqueueCampaign(campaign);
    }
  }

  private async enqueueCampaign(campaign: any) {
    // Obtener contactos activos (no opted_out)
    const { data: logs } = await this.supabase.client
      .from('message_logs')
      .select('contact_id, contacts(phone, custom_fields, opted_out)')
      .eq('campaign_id', campaign.id)
      .eq('status', 'queued');

    const active = logs?.filter((l) => !l.contacts?.opted_out) ?? [];

    // Marcar como running
    await this.supabase.client
      .from('campaigns')
      .update({ status: 'running' })
      .eq('id', campaign.id);

    // Encolar con rate limit: 1 msg/seg
    for (let i = 0; i < active.length; i++) {
      const log = active[i];
      const phone = log.contacts?.phone;
      const customFields = log.contacts?.custom_fields || {};
      const bodyVars = Object.values(customFields).map(String);

      await this.producer.enqueue(
        log.contact_id,
        campaign.id,
        phone,
        campaign.template_name,
        bodyVars,
        campaign.image_url,
        i * 1000, // 1 segundo entre mensajes
      );
    }
  }
}
