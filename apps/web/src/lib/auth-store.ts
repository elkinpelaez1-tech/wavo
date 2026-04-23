import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  business_name: string;
  plan: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('wavo_token') : null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('wavo_token', data.access_token);
    set({ token: data.access_token, loading: false });
    const me = await api.get('/auth/me');
    set({ user: me.data });
  },

  register: async (formData) => {
    set({ loading: true });
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('wavo_token', data.access_token);
    set({ token: data.access_token, loading: false });
    const me = await api.get('/auth/me');
    set({ user: me.data });
  },

  logout: () => {
    localStorage.removeItem('wavo_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  loadUser: async () => {
    const token = localStorage.getItem('wavo_token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      localStorage.removeItem('wavo_token');
    }
  },
}));
