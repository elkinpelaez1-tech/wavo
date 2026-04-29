import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Inyectar token JWT automáticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wavo_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirigir a login si el token expiró
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('wavo_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const getDashboardMetrics = async () => {
  try {
    const { data: campaigns } = await api.get('/campaigns');
    
    // Obtener stats de todas las campañas
    const statsPromises = campaigns.map((c: any) => 
      api.get(`/campaigns/${c.id}/stats`).then(res => res.data.stats).catch(() => null)
    );
    
    const allStats = await Promise.all(statsPromises);
    
    // Adjuntar stats a cada campaña
    const campaignsWithStats = campaigns.map((c: any, index: number) => ({
      ...c,
      stats: allStats[index] || { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
    }));
    
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    
    allStats.forEach((stats: any) => {
      if (stats) {
        totalSent += stats.sent || 0;
        totalDelivered += stats.delivered || 0;
        totalRead += stats.read || 0;
      }
    });

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const openRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    return {
      sent_today: totalSent, 
      delivery_rate: deliveryRate,
      open_rate: openRate,
      optouts_week: 0, 
      campaigns: campaignsWithStats.slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      sent_today: 0,
      delivery_rate: 0,
      open_rate: 0,
      optouts_week: 0,
      campaigns: [],
    };
  }
};

export default api;
