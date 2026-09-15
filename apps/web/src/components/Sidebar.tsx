'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Panel',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/conversations',
    label: 'Conversaciones',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/campaigns',
    label: 'Campañas',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/contacts',
    label: 'Contactos',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/calendar',
    label: 'Calendario',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 7V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/templates',
    label: 'Templates',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/stats',
    label: 'Estadísticas',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Configuración',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-white' : 'text-white/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#064E3B] py-6 flex flex-col shrink-0 border-r border-[#065F46]/40 select-none shadow-sm">
      {/* Brand Header */}
      <div className="px-5 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5 border border-white/15 shadow-inner">
            <img 
              src="/logo.png" 
              alt="Wavo" 
              className="w-full h-full object-cover object-top" 
            />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">wavo</span>
            <span className="block text-[10px] text-white/60 font-medium tracking-wide">WhatsApp Marketing</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-xl cursor-pointer transition-all duration-150 ${
                active
                  ? 'text-white bg-white/15 font-semibold shadow-xs border border-white/10'
                  : 'text-white/70 hover:bg-white/8 hover:text-white font-medium'
              }`}
            >
              {item.icon(active)}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status Card */}
      <div className="px-4 pt-4 border-t border-white/10">
        <div className="bg-white/8 rounded-xl p-3 border border-white/10 flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#129F78] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#129F78]"></span>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">WhatsApp Cloud API</p>
            <p className="text-[9px] text-white/60 truncate">Sincronización activa</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
