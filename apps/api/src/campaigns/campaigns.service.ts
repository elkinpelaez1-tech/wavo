import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
    try {
      const { contact_ids, ...campaignData } = dto;
      console.log("[CampaignsService] Creando campaña:", { userId, name: dto.name, recipients: contact_ids.length });

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

      if (error) {
        console.error("[CampaignsService] Error al insertar campaña:", error);
        throw new Error(`DB Error (Campaign): ${error.message} - Code: ${error.code}`);
      }

      // Crear logs iniciales en campaign_recipients
      if (contact_ids.length > 0) {
        const logs = contact_ids.map((contactId) => ({
          campaign_id: campaign.id,
          contact_id: contactId,
          status: 'pending',
        }));

        const { error: logsError } = await this.supabase.client
          .from('campaign_recipients')
          .insert(logs);

        if (logsError) {
          console.error("[CampaignsService] Error al insertar destinatarios:", logsError);
        }
      }

      return campaign;
    } catch (err: any) {
      console.error("[CampaignsService] Error en create:", err);
      throw new InternalServerErrorException(err.message || 'Error al crear campaña');
    }
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(id, userId);
    if (campaign.status !== 'draft')
      throw new BadRequestException('Solo se pueden editar campañas en borrador');

    const { data, error } = await this.supabase.client
      .from('campaigns')
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.supabase.client.from('campaigns').delete().eq('id', id).eq('user_id', userId);
    return { deleted: true };
  }

  async launch(id: string, userId: string) {
    const campaign = await this.findOne(id, userId);
    if (!['draft', 'scheduled'].includes(campaign.status))
      throw new BadRequestException('La campaña no puede lanzarse en su estado actual');

    // BLOQUEO: No permitir lanzamiento sin template
    if (!campaign.template_name || campaign.template_name.trim() === '') {
      await this.supabase.client
        .from('campaigns')
        .update({ status: 'draft' })
        .eq('id', id);
      throw new BadRequestException('No puedes lanzar una campaña sin asignar un template HSM primero.');
    }

    await this.enqueueCampaign(campaign);
    return { launched: true };
  }

  async getStats(id: string, userId: string) {
    const campaign = await this.findOne(id, userId);
    const { data: logs } = await this.supabase.client
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', id);

    const stats = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    logs?.forEach((l) => { if (stats[l.status] !== undefined) stats[l.status]++; });

    return { ...campaign, stats };
  }

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
    const { data: logs } = await this.supabase.client
      .from('campaign_recipients')
      .select('contact_id, contacts(phone_normalized, custom_fields, opted_out, deleted_at)')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending');

    const active = logs?.filter((l: any) => {
      const contact = Array.isArray(l.contacts) ? l.contacts[0] : l.contacts;
      return contact && !contact.opted_out && !contact.deleted_at;
    }) ?? [];

    await this.supabase.client
      .from('campaigns')
      .update({ status: 'running' })
      .eq('id', campaign.id);

    for (let i = 0; i < active.length; i++) {
      const log: any = active[i];
      const contact = Array.isArray(log.contacts) ? log.contacts[0] : log.contacts;
      const phone = contact?.phone_normalized;
      const customFields = contact?.custom_fields || {};
      const bodyVars = Object.values(customFields).map(String);

      await this.producer.enqueue(
        log.contact_id,
        campaign.id,
        phone,
        campaign.template_name,
        bodyVars,
        campaign.image_url,
        i * 1000,
      );
    }

    await this.supabase.client
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaign.id);
  }
}
