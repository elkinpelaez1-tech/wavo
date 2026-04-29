import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizePhone } from '../common/utils/phone.utils';

import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, string>;
}


@Injectable()
export class ContactsService {
  constructor(private supabase: SupabaseService) { }

  async findAll(userId: string, page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.client
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('opted_out', false)
      .range(from, from + limit - 1)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { data, total: count, page, limit };
  }

  async create(userId: string, dto: CreateContactDto, plan: string = 'free') {
    if (plan === 'free') {
      const { count } = await this.supabase.client
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);
      
      if ((count || 0) >= 50) {
        throw new BadRequestException('Límite de 50 contactos alcanzado. Actualiza a PRO para agregar más.');
      }
    }
    try {
      console.log("[ContactsService] RAW DTO:", dto);
      const phoneNormalized = normalizePhone(dto?.phone);
      console.log("[ContactsService] Iniciando creación:", { userId, phoneNormalized, name: dto?.name });

      if (!phoneNormalized) {
        throw new Error(`El teléfono recibido ("${dto?.phone}") no es válido después de la normalización.`);
      }

      // Verificar duplicados manualmente para dar error claro
      const { data: existing, error: checkError } = await this.supabase.client
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('phone_normalized', phoneNormalized)
        .is('deleted_at', null)
        .maybeSingle();

      if (checkError) {
        console.error("[ContactsService] Error al verificar duplicados:", checkError);
      }

      if (existing) {
        throw new ConflictException('Ya existe un contacto con este número');
      }

      const { data, error } = await this.supabase.client
        .from('contacts')
        .insert({
          name: dto.name,
          phone: dto.phone,
          phone_normalized: phoneNormalized,
          user_id: userId,
          tags: dto.tags || [],
          custom_fields: dto.custom_fields || {},
        })
        .select()
        .single();

      if (error) {
        console.error("[ContactsService] Error de Supabase al insertar:", error);
        throw new Error(`DB Error: ${error.message} - Code: ${error.code} - Hint: ${error.hint}`);
      }

      return data;
    } catch (err: any) {
      console.error("[ContactsService] Error capturado en create:", err);
      if (err instanceof ConflictException) throw err;
      throw new InternalServerErrorException(err.message || 'Error desconocido en el servidor');
    }
  }

  async importBulk(userId: string, contacts: CreateContactDto[], plan: string = 'free') {
    if (plan === 'free') {
      const { count } = await this.supabase.client
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);
      
      const available = 50 - (count || 0);
      if (available <= 0) {
        throw new BadRequestException('Límite de 50 contactos alcanzado. Actualiza a PRO.');
      }
      if (contacts.length > available) {
        throw new BadRequestException(`Solo puedes importar ${available} contactos más en el plan FREE.`);
      }
    }
    const rows = contacts
      .map((c) => ({
        ...c,
        user_id: userId,
        phone_normalized: normalizePhone(c.phone),
      }))
      .filter((r) => r.phone_normalized); // Ignorar si no se pudo normalizar

    if (rows.length === 0) return { imported: 0 };

    const { data, error } = await this.supabase.client
      .from('contacts')
      .upsert(rows, { onConflict: 'user_id,phone_normalized' })
      .select();

    if (error) {
      console.error("[ContactsService] Error en importBulk:", error);
      throw new Error(error.message);
    }
    return { imported: data?.length ?? 0 };
  }

  async update(id: string, userId: string, dto: Partial<CreateContactDto>) {
    const updateData: any = { ...dto };
    if (dto.phone) {
      updateData.phone_normalized = normalizePhone(dto.phone);
    }

    const { data, error } = await this.supabase.client
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !data) throw new NotFoundException();
    return data;
  }

  async remove(id: string, userId: string) {
    const { error } = await this.supabase.client
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
