'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

const navItems = [
  { href: '/dashboard',            label: 'Panel' },
  { href: '/dashboard/campaigns',  label: 'Campañas' },
  { href: '/dashboard/contacts',   label: 'Contactos' },
  { href: '/dashboard/calendar',   label: 'Calendario' },
  { href: '/dashboard/templates',  label: 'Templates' },
  { href: '/dashboard/stats',      label: 'Estadísticas' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-52 min-h-screen bg-wavo-sidebar border-r border-wavo-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-wavo-border">
        <div className="flex items-center gap-2 mb-1">
          <svg width="24" height="24" viewBox="0 0 48 48">
            <path d="M6,24 Q14,10 22,24 Q30,38 38,24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10,24 Q18,8 26,24 Q34,40 42,24" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round"/>
            <path d="M14,24 Q22,6 30,24 Q38,42 46,24" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-base font-extrabold text-wavo-dark tracking-tight">wavo</span>
        </div>
        <p className="text-xs text-wavo-muted truncate">{user?.business_name || '—'}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-wavo-card text-wavo-text font-medium border-l-2 border-wavo-green'
                  : 'text-wavo-muted hover:bg-wavo-card'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-wavo-border p-4">
        <Link href="/dashboard/settings" className="block text-sm text-wavo-muted hover:text-wavo-text mb-2">
          Configuración
        </Link>
        <button onClick={logout} className="text-xs text-red-500 hover:text-red-700">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
