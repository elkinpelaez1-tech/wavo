'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuthStore } from '@/lib/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadUser();
  }, []);

  return (
    <div className="flex min-h-screen bg-wavo-sand">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
