'use client';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-medium text-wavo-text mb-6">Configuración</h1>

      <div className="card mb-4">
        <h2 className="text-sm font-medium text-wavo-text mb-4">Cuenta</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" defaultValue={user?.name} disabled />
          </div>
          <div>
            <label className="label">Negocio</label>
            <input className="input" defaultValue={user?.business_name} disabled />
          </div>
          <div>
            <label className="label">Correo</label>
            <input className="input" defaultValue={user?.email} disabled />
          </div>
          <div>
            <label className="label">Plan</label>
            <input className="input" defaultValue={user?.plan || 'free'} disabled />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="text-sm font-medium text-wavo-text mb-3">Integración Meta WhatsApp</h2>
        <p className="text-sm text-wavo-muted mb-4">
          Configura las credenciales de tu app en Meta Developers. Estos valores van en las variables de entorno del backend.
        </p>
        <div className="space-y-2 text-xs font-mono bg-wavo-sidebar rounded-lg p-3 text-wavo-muted">
          <p>META_APP_ID=tu_app_id</p>
          <p>META_APP_SECRET=tu_app_secret</p>
          <p>META_PHONE_NUMBER_ID=tu_phone_number_id</p>
          <p>META_WHATSAPP_TOKEN=EAAxxxxxxx</p>
          <p>META_WEBHOOK_VERIFY_TOKEN=token_secreto</p>
        </div>
        <p className="text-xs text-wavo-muted mt-3">
          Ver sección 6 del documento técnico para instrucciones completas.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-wavo-text mb-3">Webhook URL</h2>
        <p className="text-sm text-wavo-muted mb-2">Registra esta URL en Meta Developers:</p>
        <div className="bg-wavo-sidebar rounded-lg p-3 text-xs font-mono text-wavo-text">
          https://api.wavo.app/api/webhooks/meta
        </div>
      </div>
    </div>
  );
}
