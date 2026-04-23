import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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
      .eq('opted_out', false)
      .range(from, from + limit - 1)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { data, total: count, page, limit };
  }

  async create(userId: string, dto: CreateContactDto) {
    const { data, error } = await this.supabase.client
      .from('contacts')
      .insert({ ...dto, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async importBulk(userId: string, contacts: CreateContactDto[]) {
    const rows = contacts.map((c) => ({ ...c, user_id: userId }));
    const { data, error } = await this.supabase.client
      .from('contacts')
      .upsert(rows, { onConflict: 'phone,user_id' })
      .select();
    if (error) throw new Error(error.message);
    return { imported: data?.length ?? 0 };
  }

  async update(id: string, userId: string, dto: Partial<CreateContactDto>) {
    const { data, error } = await this.supabase.client
      .from('contacts')
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !data) throw new NotFoundException();
    return data;
  }

  async remove(id: string, userId: string) {
    await this.supabase.client
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    return { deleted: true };
  }
}
