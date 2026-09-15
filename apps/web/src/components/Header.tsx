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
    <header className="h-16 px-6 lg:px-8 border-b border-[#E4ECE7] bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
      {/* Left info badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F7F0] text-[#065F46] border border-[#0F8F6F]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F8F6F] animate-pulse" />
          WhatsApp Cloud API
        </span>
      </div>

      {/* Right User menu */}
      <div className="flex items-center gap-4">
        {user?.email && (
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-[#17201C] truncate max-w-[200px]">
              {user.name || user.email.split('@')[0]}
            </p>
            <p className="text-[10px] text-[#64716B] truncate max-w-[200px]">
              {user.email}
            </p>
          </div>
        )}

        <div className="relative group/avatar" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl bg-[#E8F7F0] text-[#065F46] flex items-center justify-center text-xs font-bold shrink-0 border border-[#0F8F6F]/25 hover:border-[#0F8F6F] hover:shadow-xs transition-all cursor-pointer outline-none uppercase overflow-hidden"
            title={user?.name || user?.email || 'Wavo'}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.email || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : user?.email ? (
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

          {/* Menu desplegable */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E4ECE7] rounded-2xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-[#E4ECE7]/60 sm:hidden">
                <p className="text-xs font-semibold text-[#17201C] truncate">{user?.name || 'Usuario'}</p>
                <p className="text-[10px] text-[#64716B] truncate">{user?.email}</p>
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() => setMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs text-[#17201C] hover:bg-[#F8FAF9] hover:text-[#0F8F6F] transition-colors flex items-center gap-2.5 font-medium"
              >
                <svg className="w-4 h-4 text-[#64716B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi perfil
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50/50 transition-colors flex items-center gap-2.5 font-medium border-t border-[#E4ECE7]/60 cursor-pointer"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
