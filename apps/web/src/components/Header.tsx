'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { getSupabase } from '@/lib/supabase';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout: storeLogout } = useAuthStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      storeLogout();
    } catch (error) {
      console.error('Logout error:', error);
      storeLogout();
    }
  };

  // Cerrar menu al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const userInitial = user?.name ? user.name[0] : user?.email ? user.email[0] : 'W';

  return (
    <header className="h-14 px-6 border-b border-wavo-border/50 bg-wavo-sand/80 backdrop-blur-sm flex items-center justify-end sticky top-0 z-40">
      <div className="relative group/avatar" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-[34px] h-[34px] rounded-full bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center text-xs font-bold shrink-0 border border-[#1D9E75]/20 hover:shadow-md transition-all cursor-pointer outline-none uppercase overflow-hidden"
          title={user?.email || 'Wavo'}
        >
          {user?.email ? (
            userInitial
          ) : (
            <img
              src="/logo.png"
              alt="Wavo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerText = 'W';
                }
              }}
            />
          )}
        </button>

        {/* Tooltip con el correo */}
        {user?.email && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-[#2c2a1e] text-white text-[10px] rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
            {user.email}
          </div>
        )}

        {/* Menu desplegable */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EDE8D0] rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-4 py-2.5 text-[13px] text-[#2c2a1e] hover:bg-[#FDFCF5] hover:text-wavo-green transition-colors flex items-center gap-2 font-medium border-b border-[#EDE8D0]/60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Mi perfil
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-[13px] text-[#2c2a1e] hover:bg-[#FDFCF5] hover:text-red-600 transition-colors flex items-center gap-2 font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
