'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Credenciales inválidas';
      if (err.response?.data?.message) {
        errorMessage = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message;
      }
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7EC] to-[#F3EEDD]">
      <div className="card w-full max-w-[360px] shadow-lg border-black/5 hover:-translate-y-0.5 transition-transform duration-300">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <svg width="36" height="36" viewBox="0 0 48 48">
            <path d="M6,24 Q14,10 22,24 Q30,38 38,24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10,24 Q18,8 26,24 Q34,40 42,24" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round"/>
            <path d="M14,24 Q22,6 30,24 Q38,42 46,24" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-2xl font-extrabold text-wavo-dark tracking-tight">wavo</span>
        </div>

        <h1 className="text-lg font-medium text-wavo-text mb-1">Bienvenido de vuelta</h1>
        <p className="text-sm text-wavo-muted mb-6">Ingresa a tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full shadow-md shadow-wavo-green/30 hover:-translate-y-0.5 transition-all duration-300" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-sm text-wavo-muted text-center mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-wavo-green font-medium hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}
