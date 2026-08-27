'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard',            label: 'Panel' },
  { href: '/dashboard/campaigns',  label: 'Campañas' },
  { href: '/dashboard/contacts',   label: 'Contactos' },
  { href: '/dashboard/calendar',   label: 'Calendario' },
  { href: '/dashboard/templates',  label: 'Templates' },
  { href: '/dashboard/stats',      label: 'Estadísticas' },
  { href: '/dashboard/settings',   label: 'Configuración' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-wavo-green py-5 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 pb-6 flex items-center gap-2.5">
        <img 
          src="/logo.png" 
          alt="Wavo" 
          className="w-8 h-8 object-cover object-top" 
        />
        <span className="text-[19px] font-black text-white tracking-tight">wavo</span>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-5 py-[9px] text-[13px] cursor-pointer border-l-2 transition-all duration-150 ${
                active
                  ? 'text-white bg-white/10 border-white font-medium'
                  : 'text-white/70 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`w-[7px] h-[7px] rounded-full bg-current ${active ? 'opacity-100' : 'opacity-50'}`}></span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
