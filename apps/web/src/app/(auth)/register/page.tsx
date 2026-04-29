'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', business_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { register, loading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Error al registrar';
      if (err.response?.data?.message) {
        errorMessage = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message;
      }
      setError(errorMessage);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-wavo-sand">
      <div className="card w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <svg width="36" height="36" viewBox="0 0 48 48">
            <path d="M6,24 Q14,10 22,24 Q30,38 38,24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10,24 Q18,8 26,24 Q34,40 42,24" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round"/>
            <path d="M14,24 Q22,6 30,24 Q38,42 46,24" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-2xl font-extrabold text-wavo-dark tracking-tight">wavo</span>
        </div>

        <h1 className="text-lg font-medium text-wavo-text mb-1">Crear cuenta</h1>
        <p className="text-sm text-wavo-muted mb-6">Empieza a enviar campañas hoy</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tu nombre</label>
            <input className="input" placeholder="Juan Pérez" onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Nombre del negocio</label>
            <input className="input" placeholder="Mi Empresa S.A.S." onChange={set('business_name')} required />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="input" placeholder="tu@empresa.com" onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input type="password" className="input" placeholder="Mínimo 6 caracteres" onChange={set('password')} required minLength={6} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-wavo-muted text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-wavo-green font-medium hover:underline">Ingresar</a>
        </p>
      </div>
    </div>
  );
}
