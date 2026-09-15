import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  scheduled_at?: string;
  created_at?: string;
  stats?: {
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

const statusBadge = (s: string) => {
  if (s === 'running') return <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide bg-[#E8F7F0] text-[#065F46] border border-[#0F8F6F]/20">ENVIANDO</span>;
  if (s === 'scheduled') return <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide bg-amber-50 text-amber-800 border border-amber-200/60">PROGRAMADA</span>;
  if (s === 'completed') return <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide bg-[#F1FAF5] text-[#065F46] border border-[#E4ECE7]">COMPLETADA</span>;
  return <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide bg-[#F8FAF9] text-[#64716B] border border-[#E4ECE7]">BORRADOR</span>;
};

export function CampaignItem({ campaign }: { campaign: Campaign }) {
  const date = campaign.scheduled_at || campaign.created_at || new Date().toISOString();
  const timeAgo = formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });

  return (
    <div className="flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-[#F8FAF9] transition-colors border-b border-[#E4ECE7] last:border-0 group cursor-default">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-[#17201C] font-semibold group-hover:text-[#0F8F6F] transition-colors">{campaign.name}</div>
          {statusBadge(campaign.status)}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[#64716B] flex items-center gap-1.5 font-medium">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {campaign.total_recipients} destinatarios
            </span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          {campaign.stats && (
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1 text-[#0F8F6F]" title="Entregados">
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {campaign.stats.delivered}
              </div>
              <div className="flex items-center gap-1 text-[#065F46]" title="Leídos">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {campaign.stats.read}
              </div>
              {campaign.stats.failed > 0 && (
                <div className="flex items-center gap-1 text-red-500" title="Fallidos">
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {campaign.stats.failed}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
