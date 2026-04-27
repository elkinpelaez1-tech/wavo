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
    <aside className="w-[200px] bg-[#F5F1DF] border-r border-[#EDE8D0] py-5 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 pb-6 flex items-center gap-2">
        <div className="flex items-end gap-[2px] h-[22px]">
          <span className="block w-1 rounded-sm h-[10px] bg-[#5DCAA5]"></span>
          <span className="block w-1 rounded-sm h-[16px] bg-[#1D9E75]"></span>
          <span className="block w-1 rounded-sm h-[22px] bg-[#0F6E56]"></span>
        </div>
        <span className="text-[18px] font-extrabold text-[#0d1f1a] tracking-tight">wavo</span>
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
                  ? 'text-[#1D9E75] bg-[#EAF5EF] border-[#1D9E75] font-medium'
                  : 'text-[#908c72] border-transparent hover:bg-[#EDE8D0] hover:text-[#2c2a1e]'
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
