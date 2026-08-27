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
    try {
      const metaData = await this.meta.getTemplates();
      const templates = metaData.data || [];
      console.log(`[TemplatesService] Syncing ${templates.length} templates for user ${userId}`);

      if (templates.length === 0) {
        const { error: clearError } = await this.supabase.client
          .from('templates')
          .delete()
          .eq('user_id', userId);
        if (clearError) {
          console.error("[TemplatesService] Error clearing templates:", clearError);
        }
        return { synced: 0 };
      }

      const rows = templates.map((t: any) => ({
        user_id: userId,
        meta_template_name: t.name,
        display_name: t.name,
        category: t.category,
        language: t.language,
        content: t.components?.find((c: any) => c.type === 'BODY')?.text || '',
        components: t.components || [],
        status: t.status?.toLowerCase() || 'pending',
      }));

      const { error: upsertError } = await this.supabase.client
        .from('templates')
        .upsert(rows, { onConflict: 'meta_template_name' });

      if (upsertError) {
        console.error("[TemplatesService] Error upserting templates:", upsertError);
        throw new Error(upsertError.message);
      }

      // Eliminar plantillas obsoletas (las que ya no vienen de Meta para este usuario)
      const currentNames = templates.map((t: any) => t.name);
      const formattedNames = `(${currentNames.join(',')})`;
      const { error: deleteError } = await this.supabase.client
        .from('templates')
        .delete()
        .eq('user_id', userId)
        .not('meta_template_name', 'in', formattedNames);

      if (deleteError) {
        console.error("[TemplatesService] Error deleting stale templates:", deleteError);
      }

      return { synced: rows.length };
    } catch (err: any) {
      console.error('META RAW ERROR:', err.response?.data || err.message);
      throw err;
    }
  }
}
