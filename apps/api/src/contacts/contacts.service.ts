import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizePhone } from '../common/utils/phone.utils';

export class CreateContactDto {
  name: string;
  phone: string;
  tags?: string[];
  custom_fields?: Record<string, string>;
}

@Injectable()
export class ContactsService {
  constructor(private supabase: SupabaseService) {}

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

  async create(userId: string, dto: CreateContactDto) {
    const phoneNormalized = normalizePhone(dto.phone);
    console.log("[ContactsService] Creando contacto:", { userId, phoneNormalized });

    // Verificar duplicados manualmente para dar error claro
    const { data: existing } = await this.supabase.client
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('phone_normalized', phoneNormalized)
      .is('deleted_at', null)
      .single();

    if (existing) {
      console.warn("[ContactsService] Contacto duplicado detectado");
      throw new ConflictException('Ya existe un contacto con este número');
    }

    const { data, error } = await this.supabase.client
      .from('contacts')
      .insert({
        ...dto,
        user_id: userId,
        phone_normalized: phoneNormalized,
      })
      .select()
      .single();

    if (error) {
      console.error("[ContactsService] Error al insertar en Supabase:", error);
      throw new Error(error.message);
    }
    
    console.log("[ContactsService] Contacto creado con éxito:", data.id);
    return data;
  }

  async importBulk(userId: string, contacts: CreateContactDto[]) {
    const rows = contacts.map((c) => ({
      ...c,
      user_id: userId,
      phone_normalized: normalizePhone(c.phone),
    }));

    const { data, error } = await this.supabase.client
      .from('contacts')
      .upsert(rows, { onConflict: 'user_id,phone_normalized' })
      .select();

    if (error) throw new Error(error.message);
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
