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
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout: storeLogout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      storeLogout(); // This clears the local store and redirects
    } catch (error) {
      console.error('Logout error:', error);
      storeLogout(); // Fallback
    }
  };

  useEffect(() => {
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#2c2a1e] tracking-tight">Panel principal</h1>
          <p className="text-[13px] text-[#908c72] capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex gap-3 items-center">
          <a href="/dashboard/campaigns/new" className="bg-wavo-green hover:bg-[#0F6E56] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-wavo-green/20">
            + Nueva campaña
          </a>
          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-[34px] h-[34px] rounded-full bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center text-xs font-bold shrink-0 border border-[#1D9E75]/20 hover:shadow-md transition-all cursor-pointer outline-none"
            >
              WA
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EDE8D0] rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#2c2a1e] hover:bg-[#FDFCF5] hover:text-wavo-green transition-colors flex items-center gap-2 font-medium"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Campañas activas */}
        <div className="bg-[#FDFCF5] border border-[#EDE8D0] rounded-xl p-5 shadow-sm flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-[#2c2a1e]">Campañas activas</h2>
            <a href="/dashboard/campaigns" className="text-[11px] font-medium text-[#1D9E75] hover:underline">Ver todas</a>
          </div>
          {loading ? (
            <p className="text-[12px] text-[#908c72] py-4">Cargando datos...</p>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[12px] text-[#908c72] mb-3">No hay campañas activas</p>
              <a href="/dashboard/campaigns/new" className="text-[#1D9E75] font-medium text-xs hover:underline">Crear primera campaña</a>
            </div>
          ) : (
            <div className="flex flex-col">
              {campaigns.map(c => <CampaignItem key={c.id} campaign={c} />)}
            </div>
          )}
        </div>

        {/* Rendimiento por campaña */}
        <div className="bg-[#FDFCF5] border border-[#EDE8D0] rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <h2 className="text-[13px] font-semibold text-[#2c2a1e] mb-5">Rendimiento global</h2>
          <div className="flex flex-col gap-2">
            <ProgressBar label="Entregado" percentage={stats.delivery_rate} color="#1D9E75" delay={100} />
            <ProgressBar label="Abierto" percentage={stats.open_rate} color="#5DCAA5" delay={200} />
            <ProgressBar label="Respondió" percentage={0} color="#0F6E56" delay={300} />
            <ProgressBar label="Fallido" percentage={Math.max(0, 100 - stats.delivery_rate - stats.open_rate)} color="#EDE8D0" delay={400} />
            <ProgressBar label="Opt-out" percentage={stats.optouts_week > 0 ? 2 : 0} color="#F0997B" delay={500} />
          </div>
        </div>
      </div>

      {/* Calendario */}
      <CalendarUI />
    </div>
  );
}
