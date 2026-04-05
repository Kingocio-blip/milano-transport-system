import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Users, Bus, UserCheck, ClipboardList, FileText, Euro } from 'lucide-react';

const statCards = [
  { key: 'total_clientes', label: 'Clientes', icon: Users, color: '#3b82f6' },
  { key: 'total_vehiculos', label: 'Vehiculos', icon: Bus, color: '#10b981' },
  { key: 'total_conductores', label: 'Conductores', icon: UserCheck, color: '#f59e0b' },
  { key: 'servicios_pendientes', label: 'Servicios Pendientes', icon: ClipboardList, color: '#8b5cf6' },
  { key: 'facturas_pendientes', label: 'Facturas Pendientes', icon: FileText, color: '#ef4444' },
  { key: 'ingresos_mes', label: 'Ingresos del Mes', icon: Euro, color: '#06b6d4', isCurrency: true },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando estadisticas...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general del sistema</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.key} className="stat-card">
            <div className="stat-icon" style={{ background: card.color + '20', color: card.color }}>
              <card.icon size={28} />
            </div>
            <div>
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">
                {card.isCurrency ? '€' : ''}
                {stats[card.key]?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}