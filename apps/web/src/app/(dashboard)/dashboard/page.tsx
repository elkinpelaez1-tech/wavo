'use client';
import { useEffect, useState } from 'react';
import api, { getDashboardMetrics } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface Stats {
  sent_today: number;
  delivery_rate: number;
  open_rate: number;
  optouts_week: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  scheduled_at: string;
  template_name?: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    running: 'badge-green',
    completed: 'badge-blue',
    scheduled: 'badge-amber',
    failed: 'badge-red',
    draft: 'badge-amber',
  };
  const labels: Record<string, string> = {
    running: 'Activa', completed: 'Completa',
    scheduled: 'Programada', failed: 'Fallida', draft: 'Borrador',
  };
  return <span className={map[s] || 'badge-amber'}>{labels[s] || s}</span>;
};

import { MetricCard } from '@/components/dashboard/MetricCard';
import { CampaignItem } from '@/components/dashboard/CampaignItem';
import { ProgressBar } from '@/components/dashboard/ProgressBar';
import { CalendarUI } from '@/components/dashboard/CalendarUI';

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({
    sent_today: 0,
    delivery_rate: 0,
    open_rate: 0,
    optouts_week: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single();
          if (profile) setPlan(profile.plan);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();

    getDashboardMetrics().then((data) => {
      setStats({
        sent_today: data.sent_today,
        delivery_rate: data.delivery_rate,
        open_rate: data.open_rate,
        optouts_week: data.optouts_week,
      });
      setCampaigns(data.campaigns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Onboarding Message */}
      <div className="bg-[#E8F7F0] border border-[#0F8F6F]/20 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-300">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-base shadow-2xs shrink-0">
          🚀
        </div>
        <p className="text-xs font-semibold text-[#065F46]">
          Empieza creando un contacto y luego lanza tu primera campaña en WhatsApp
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Panel principal</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              plan === 'pro' 
                ? 'bg-[#E8F7F0] text-[#065F46] border border-[#0F8F6F]/25' 
                : 'bg-zinc-100 text-zinc-700 border border-zinc-200/60'
            }`}>
              {plan}
            </span>
          </div>
          <p className="text-xs text-[#64716B] capitalize mt-1 font-medium">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <a 
            href="/dashboard/contacts" 
            className="btn-secondary flex items-center gap-1.5"
          >
            <span>+ Crear contacto</span>
          </a>
          <a 
            href="/dashboard/campaigns/new" 
            className="btn-primary flex items-center gap-1.5"
          >
            <span>+ Nueva campaña</span>
          </a>
          {plan === 'free' && (
            <button className="bg-[#17201C] hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer">
              Actualizar a PRO
            </button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Enviados hoy" 
          value={loading ? '...' : stats.sent_today.toLocaleString()} 
          sub="↑ 12% vs ayer" 
        />
        <MetricCard 
          label="Tasa de entrega" 
          value={loading ? '...' : `${stats.delivery_rate}%`} 
          sub="↑ 2.1% esta semana" 
        />
        <MetricCard 
          label="Tasa de apertura" 
          value={loading ? '...' : `${stats.open_rate}%`} 
          sub="↑ 5.3% este mes" 
        />
        <MetricCard 
          label="Opt-outs (7 días)" 
          value={loading ? '...' : stats.optouts_week.toString()} 
          sub="↑ 3 desde ayer" 
          isWarning={true}
        />
      </div>

      {/* Grid: Campañas y Rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campañas activas */}
        <div className="bg-white border border-[#E4ECE7] rounded-2xl p-5 shadow-xs flex flex-col hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#17201C]">Campañas activas</h2>
            <a href="/dashboard/campaigns" className="text-xs font-semibold text-[#0F8F6F] hover:underline">Ver todas</a>
          </div>
          {loading ? (
            <p className="text-xs text-[#64716B] py-6 text-center font-medium">Cargando datos...</p>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-[#E8F7F0] text-[#065F46] rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl border border-[#0F8F6F]/20 shadow-2xs">
                📢
              </div>
              <h3 className="text-sm font-bold text-[#17201C] mb-1">Aún no tienes campañas</h3>
              <p className="text-xs text-[#64716B] mb-5 font-medium">Llega a tus clientes hoy mismo a través de WhatsApp.</p>
              <a href="/dashboard/campaigns/new" className="btn-primary inline-block">
                Crear campaña
              </a>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#E4ECE7]">
              {campaigns.map(c => <CampaignItem key={c.id} campaign={c} />)}
            </div>
          )}
        </div>

        {/* Rendimiento por campaña */}
        <div className="bg-white border border-[#E4ECE7] rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200">
          <h2 className="text-xs font-semibold text-[#17201C] mb-5">Rendimiento global</h2>
          <div className="flex flex-col gap-2">
            <ProgressBar label="Entregado" percentage={stats.delivery_rate} color="#0F8F6F" delay={100} />
            <ProgressBar label="Abierto" percentage={stats.open_rate} color="#129F78" delay={200} />
            <ProgressBar label="Respondió" percentage={0} color="#065F46" delay={300} />
            <ProgressBar label="Fallido" percentage={Math.max(0, 100 - stats.delivery_rate - stats.open_rate)} color="#E4ECE7" delay={400} />
            <ProgressBar label="Opt-out" percentage={stats.optouts_week > 0 ? 2 : 0} color="#F0997B" delay={500} />
          </div>
        </div>
      </div>

      {/* Calendario */}
      <CalendarUI />
    </div>
  );
}
