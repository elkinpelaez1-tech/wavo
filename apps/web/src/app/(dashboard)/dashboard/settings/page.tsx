'use client';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Configuración</h1>
        <p className="text-xs text-[#64716B] mt-1 font-medium">Información de cuenta y parámetros de integración con Meta</p>
      </div>

      <div className="card space-y-4">
        <div className="border-b border-[#E4ECE7] pb-3">
          <h2 className="text-sm font-bold text-[#17201C]">Datos de la Cuenta</h2>
          <p className="text-xs text-[#64716B] mt-0.5">Detalles de tu perfil y suscripción activa</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input bg-[#F8FAF9] border-[#E4ECE7] text-[#64716B] cursor-not-allowed font-medium" defaultValue={user?.name} disabled />
          </div>
          <div>
            <label className="label">Negocio</label>
            <input className="input bg-[#F8FAF9] border-[#E4ECE7] text-[#64716B] cursor-not-allowed font-medium" defaultValue={user?.business_name} disabled />
          </div>
          <div>
            <label className="label">Correo Electrónico</label>
            <input className="input bg-[#F8FAF9] border-[#E4ECE7] text-[#64716B] cursor-not-allowed font-medium" defaultValue={user?.email} disabled />
          </div>
          <div>
            <label className="label">Plan Activo</label>
            <div className="pt-1">
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase ${
                user?.plan === 'pro'
                  ? 'bg-[#E8F7F0] text-[#0F8F6F] border border-[#0F8F6F]/20'
                  : 'bg-[#F8FAF9] text-[#64716B] border border-[#E4ECE7]'
              }`}>
                Plan {user?.plan || 'free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#17201C]">Integración Meta WhatsApp</h2>
          <p className="text-xs text-[#64716B] mt-1 leading-relaxed">
            Configura las credenciales de tu app en Meta Developers. Estos valores corresponden a las variables de entorno de tu servidor:
          </p>
        </div>
        <div className="bg-[#17201C] border border-[#2D3732] rounded-xl p-4 font-mono text-xs text-[#E8F7F0] space-y-1.5 shadow-xs overflow-x-auto">
          <p><span className="text-[#64716B]"># Variables de Entorno del Backend</span></p>
          <p><span className="text-[#34D399]">META_APP_ID</span>=<span className="text-[#93C5FD]">tu_app_id</span></p>
          <p><span className="text-[#34D399]">META_APP_SECRET</span>=<span className="text-[#93C5FD]">tu_app_secret</span></p>
          <p><span className="text-[#34D399]">META_PHONE_NUMBER_ID</span>=<span className="text-[#93C5FD]">tu_phone_number_id</span></p>
          <p><span className="text-[#34D399]">META_WHATSAPP_TOKEN</span>=<span className="text-[#93C5FD]">EAAxxxxxxx</span></p>
          <p><span className="text-[#34D399]">META_WEBHOOK_VERIFY_TOKEN</span>=<span className="text-[#93C5FD]">token_secreto</span></p>
        </div>
        <p className="text-[11px] text-[#64716B]">
          Consulta la sección de arquitectura técnica para más información sobre el despliegue seguro.
        </p>
      </div>

      <div className="card space-y-3">
        <div>
          <h2 className="text-sm font-bold text-[#17201C]">Webhook URL</h2>
          <p className="text-xs text-[#64716B] mt-1">Registra esta URL en Meta Developers &gt; WhatsApp &gt; Configuración:</p>
        </div>
        <div className="bg-[#F8FAF9] border border-[#E4ECE7] rounded-xl p-3 text-xs font-mono text-[#0F8F6F] font-semibold select-all">
          https://api.wavo.app/api/webhooks/meta
        </div>
      </div>
    </div>
  );
}
