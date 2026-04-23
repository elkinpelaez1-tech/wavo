import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class TemplatesService {
  constructor(
    private supabase: SupabaseService,
    private meta: MetaService,
  ) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase.client
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async syncFromMeta(userId: string) {
    const metaData = await this.meta.getTemplates();
    const templates = metaData.data || [];

    const rows = templates.map((t: any) => ({
      user_id: userId,
      meta_template_name: t.name,
      display_name: t.name,
      category: t.category,
      language: t.language,
      body_text: t.components?.find((c: any) => c.type === 'BODY')?.text || '',
      has_image: t.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE'),
      status: t.status?.toLowerCase() || 'pending',
    }));

    await this.supabase.client
      .from('templates')
      .upsert(rows, { onConflict: 'meta_template_name,user_id' });

    return { synced: rows.length };
  }
}
