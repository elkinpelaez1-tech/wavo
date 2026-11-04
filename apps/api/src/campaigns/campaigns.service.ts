import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { SupabaseService } from '../supabase/supabase.service';
import { MessageProducer } from '../queue/message.producer';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private supabase: SupabaseService,
    private producer: MessageProducer,
    private metaService: MetaService,
  ) {}

  async findAll(userId: string) {
    const { data: campaigns, error } = await this.supabase.client
      .from('campaigns')
      .select(`
        *,
        campaign_recipients (
          status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (campaigns || []).map((c: any) => {
      const recipients = c.campaign_recipients || [];
      const rawStats = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      recipients.forEach((r: any) => {
        if (rawStats[r.status] !== undefined) rawStats[r.status]++;
      });

      const sentCount = c.sent_count > 0 ? c.sent_count : (rawStats.sent + rawStats.delivered + rawStats.read);
      const deliveredCount = rawStats.delivered + rawStats.read;
      const readCount = rawStats.read;
      const failedCount = rawStats.failed;

      const { campaign_recipients: _, ...rest } = c;
      return {
        ...rest,
        sent_count: sentCount,
        delivered_count: deliveredCount,
        read_count: readCount,
        failed_count: failedCount,
        stats: {
          pending: rawStats.pending,
          sent: sentCount,
          delivered: deliveredCount,
          read: readCount,
          failed: failedCount,
        },
      };
    });
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

      // Obtener el idioma real de la plantilla sincronizada
      let templateLanguage = 'es';
      if (dto.template_name) {
        const { data: template } = await this.supabase.client
          .from('templates')
          .select('language')
          .eq('meta_template_name', dto.template_name)
          .eq('user_id', userId)
          .maybeSingle();

        if (!template?.language) {
          throw new BadRequestException(
            `La plantilla "${dto.template_name}" no existe o no ha sido sincronizada desde Meta.`
          );
        }
        templateLanguage = template.language;
      }

      const { data: campaign, error } = await this.supabase.client
        .from('campaigns')
        .insert({
          ...campaignData,
          template_language: templateLanguage,
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
      if (err instanceof HttpException) throw err;
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

  async launch(id: string, userId: string, plan: string = 'free') {
    if (plan === 'free') {
      const { count } = await this.supabase.client
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['running', 'scheduled']);
      
      if ((count || 0) >= 1) {
        throw new BadRequestException('Ya tienes una campaña activa. Actualiza a PRO para lanzar múltiples campañas simultáneas.');
      }
    }
    const campaign = await this.findOne(id, userId);
    if (!['draft', 'scheduled', 'failed'].includes(campaign.status))
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

    const rawStats = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    logs?.forEach((l: any) => {
      if (rawStats[l.status] !== undefined) rawStats[l.status]++;
    });

    const sentCount = campaign.sent_count > 0 ? campaign.sent_count : (rawStats.sent + rawStats.delivered + rawStats.read);
    const deliveredCount = rawStats.delivered + rawStats.read;
    const readCount = rawStats.read;
    const failedCount = rawStats.failed;

    return {
      ...campaign,
      sent_count: sentCount,
      delivered_count: deliveredCount,
      read_count: readCount,
      failed_count: failedCount,
      stats: {
        pending: rawStats.pending,
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
      },
    };
  }

  async getRecipients(campaignId: string, userId: string, status?: string) {
    // 1. Validar que la campaña pertenece al usuario autenticado
    await this.findOne(campaignId, userId);

    // 2. Consultar destinatarios con los datos del contacto
    let query = this.supabase.client
      .from('campaign_recipients')
      .select(`
        id,
        campaign_id,
        contact_id,
        status,
        message_id,
        error_message,
        sent_at,
        delivered_at,
        read_at,
        contacts (
          id,
          name,
          phone,
          phone_normalized,
          whatsapp_status,
          deleted_at
        )
      `)
      .eq('campaign_id', campaignId);

    if (status && status.trim()) {
      query = query.eq('status', status.trim());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => {
      const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
      return {
        id: row.id,
        campaign_id: row.campaign_id,
        contact_id: row.contact_id,
        status: row.status,
        message_id: row.message_id,
        error_message: row.error_message,
        sent_at: row.sent_at,
        delivered_at: row.delivered_at,
        read_at: row.read_at,
        contact: contact ? {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          phone_normalized: contact.phone_normalized,
          whatsapp_status: contact.whatsapp_status,
          deleted_at: contact.deleted_at,
        } : null,
        is_deleted: !!contact?.deleted_at,
      };
    });
  }

  async depurateFailedRecipients(campaignId: string, userId: string) {
    // 1. Validar que la campaña pertenece al usuario autenticado
    await this.findOne(campaignId, userId);

    // 2. Obtener los contact_ids de los destinatarios fallidos de esta campaña
    const { data: failedLogs, error } = await this.supabase.client
      .from('campaign_recipients')
      .select('contact_id')
      .eq('campaign_id', campaignId)
      .eq('status', 'failed');

    if (error) throw new Error(error.message);

    const contactIds = (failedLogs || [])
      .map((l: any) => l.contact_id)
      .filter((id: any): id is string => Boolean(id));

    if (contactIds.length === 0) {
      return { depurated_count: 0 };
    }

    // 3. Ejecutar Soft Delete sobre esos contactos garantizando pertenencia al user_id
    const { data: updated, error: updateError } = await this.supabase.client
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', contactIds)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id');

    if (updateError) throw new Error(updateError.message);

    return { depurated_count: updated?.length || 0 };
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

    // Determinar si la plantilla requiere VIDEO, IMAGE o TEXT
    let headerType: 'image' | 'video' | null = null;
    if (campaign.template_name) {
      const { data: tmpl } = await this.supabase.client
        .from('templates')
        .select('components')
        .eq('meta_template_name', campaign.template_name)
        .eq('user_id', campaign.user_id)
        .maybeSingle();

      const headerComp = tmpl?.components?.find(
        (c: any) => c.type?.toUpperCase() === 'HEADER',
      );
      const format = headerComp?.format?.toUpperCase();
      if (format === 'VIDEO') {
        headerType = 'video';
      } else if (format === 'IMAGE') {
        headerType = 'image';
      }
    }

    const mediaUrl =
      headerType === 'video'
        ? (campaign.video_url || campaign.media_url || campaign.image_url)
        : (campaign.image_url || campaign.media_url);

    for (let i = 0; i < active.length; i++) {
      const log: any = active[i];
      const contact = Array.isArray(log.contacts) ? log.contacts[0] : log.contacts;
      const phone = contact?.phone_normalized;
      const customFields = contact?.custom_fields || {};
      const bodyVars = Object.values(customFields).map(String);

      console.log(`[CampaignsService] Enviando mensaje directo a Meta para: ${phone} (ID: ${log.contact_id})`);
      try {
        const result = await this.metaService.sendTemplate(
          phone,
          campaign.template_name,
          bodyVars,
          mediaUrl,
          campaign.template_language,
          headerType || 'image',
        );

        const messageId = result.messages?.[0]?.id;
        this.logger.log(`[CampaignsService] Éxito Meta - Tel: ${phone} - MsgID: ${messageId}`);

        await this.supabase.client
          .from('campaign_recipients')
          .update({
            message_id: messageId,
            status: 'sent',
            updated_at: new Date().toISOString(),
          })
          .match({ campaign_id: campaign.id, contact_id: log.contact_id });

        // Incrementar contador en campaña
        const { data: currentCampaign } = await this.supabase.client
          .from('campaigns')
          .select('sent_count')
          .eq('id', campaign.id)
          .single();

        await this.supabase.client
          .from('campaigns')
          .update({ sent_count: (currentCampaign?.sent_count || 0) + 1 })
          .eq('id', campaign.id);
      } catch (error: any) {
        const errorCode = error.response?.data?.error?.code || 'ERROR';
        const errorMessage = error.response?.data?.error?.message || error.message;
        const fullError = error.response?.data || 'No response data';

        this.logger.error(`[CampaignsService] FALLÓ Meta - Tel: ${phone} - Error: ${errorMessage}`);
        this.logger.error(`[CampaignsService] Detalle completo de Meta: ${JSON.stringify(fullError)}`);

        await this.supabase.client
          .from('campaign_recipients')
          .update({
            status: 'failed',
            error_message: `[${errorCode}] ${errorMessage}`,
            updated_at: new Date().toISOString(),
          })
          .match({ campaign_id: campaign.id, contact_id: log.contact_id });
      }
    }

    await this.supabase.client
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaign.id);
  }

  // Cola y semáforo para limitar conversiones concurrentes de FFmpeg a 1 proceso a la vez
  private conversionQueue: Promise<void> = Promise.resolve();

  private async withConversionLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.conversionQueue;
    let release: () => void;
    this.conversionQueue = new Promise((resolve) => {
      release = resolve;
    });
    await prev.catch(() => {});
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  private async optimizeVideoForWhatsApp(inputPath: string): Promise<string> {
    const tempDir = os.tmpdir();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const outputPath = path.join(tempDir, `wavo-opt-${uniqueId}.mp4`);

    let ffmpegPath: string | null = null;
    try {
      const ffmpegModule = require('ffmpeg-static');
      ffmpegPath = typeof ffmpegModule === 'string' ? ffmpegModule : (ffmpegModule?.default || null);
    } catch {
      ffmpegPath = null;
    }

    if (!ffmpegPath) {
      ffmpegPath = 'ffmpeg';
    }

    return this.withConversionLock(async () => {
      await new Promise<void>((resolve, reject) => {
        execFile(
          ffmpegPath!,
          [
            '-y',
            '-i', inputPath,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-profile:v', 'main',
            '-level', '4.0',
            '-preset', 'fast',
            '-threads', '2',
            '-movflags', '+faststart',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-sn', '-dn',
            '-crf', '24',
            '-vf', "scale='min(720,iw)':-2",
            outputPath,
          ],
          { timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              this.logger.error(`[Video Optimization Error]: ${error.message} - Stderr: ${stderr}`);
              return reject(error);
            }
            resolve();
          },
        );
      });

      const inSize = fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0;
      const outSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
      this.logger.log(`[Video Optimization] Optimizado con éxito: ${inSize} bytes -> ${outSize} bytes (720p, H.264, AAC, yuv420p, FastStart, threads: 2)`);

      return outputPath;
    });
  }

  async uploadMedia(userId: string, file: any) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/3gpp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      throw new BadRequestException(`Formato de archivo no soportado: ${file.mimetype}`);
    }

    const isVideo = file.mimetype.startsWith('video/');
    const maxRawSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    const fileSize = file.size || (file.path && fs.existsSync(file.path) ? fs.statSync(file.path).size : file.buffer?.length || 0);

    if (fileSize > maxRawSize) {
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      throw new BadRequestException(`El archivo excede el tamaño máximo permitido (${isVideo ? '50MB' : '10MB'})`);
    }

    const ext = file.originalname?.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');

    // Archivos temporales que deben eliminarse obligatoriamente al finalizar
    const tempFilesToClean: string[] = [];
    if (file.path) {
      tempFilesToClean.push(file.path);
    }

    let inputFilePath = file.path;
    // Si viene en memoria (e.g. desde test unitario), escribir temporalmente a disco
    if (!inputFilePath && file.buffer) {
      const tempIn = path.join(os.tmpdir(), `wavo-in-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${cleanExt}`);
      await fs.promises.writeFile(tempIn, file.buffer);
      inputFilePath = tempIn;
      tempFilesToClean.push(tempIn);
    }

    let finalFilePath = inputFilePath;
    let uploadMimeType = file.mimetype;
    let finalExt = cleanExt;

    try {
      if (isVideo && inputFilePath) {
        this.logger.log(`[CampaignsService] Procesando y optimizando video por flujo para WhatsApp: ${file.originalname}`);
        try {
          const optimizedPath = await this.optimizeVideoForWhatsApp(inputFilePath);
          finalFilePath = optimizedPath;
          tempFilesToClean.push(optimizedPath);
          uploadMimeType = 'video/mp4';
          finalExt = 'mp4';
        } catch (convErr: any) {
          this.logger.warn(`[Video Optimization Fallback] Conversión falló: ${convErr.message}. Usando archivo original.`);
          finalFilePath = inputFilePath;
        }

        const finalSize = fs.existsSync(finalFilePath) ? fs.statSync(finalFilePath).size : 0;
        if (finalSize > 16 * 1024 * 1024) {
          throw new BadRequestException('El video optimizado excede el límite de 16MB de WhatsApp Cloud API');
        }
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${finalExt}`;
      const filePath = `campaigns/${userId}/${fileName}`;

      // Leer el archivo optimizado (tamaño ligero ~3-5MB) y subir a Supabase Storage
      const uploadBuffer = await fs.promises.readFile(finalFilePath);
      const { error: uploadError } = await this.supabase.client.storage
        .from('campaign-images')
        .upload(filePath, uploadBuffer, {
          contentType: uploadMimeType,
          upsert: true,
        });

      if (uploadError) {
        throw new InternalServerErrorException(`Error al subir archivo a Storage: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = this.supabase.client.storage
        .from('campaign-images')
        .getPublicUrl(filePath);

      return { publicUrl, filePath };
    } finally {
      // Limpieza garantizada de todos los archivos temporales
      for (const tempPath of tempFilesToClean) {
        try {
          if (fs.existsSync(tempPath)) {
            await fs.promises.unlink(tempPath);
          }
        } catch (cleanErr) {
          this.logger.warn(`Error limpiando archivo temporal ${tempPath}: ${cleanErr}`);
        }
      }
    }
  }
}
