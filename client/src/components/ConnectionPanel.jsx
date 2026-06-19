import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ConnectionPanel.css';

export default function ConnectionPanel() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Solo mostrar para admin
  if (!user || user.rol !== 'admin') {
    return null;
  }

  // Fetch supervisores conectados
  const fetchSupervisoresEstado = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const url = apiUrl ? `${apiUrl}/api/auth/supervisores-estado` : '/api/auth/supervisores-estado';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Error al obtener estado de supervisores');
      }

      const data = await res.json();
      setSupervisores(data);
      setLastFetch(new Date());
    } catch (err) {
      console.error('Error fetching supervisores:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inicial y polling cada 30 segundos
  useEffect(() => {
    fetchSupervisoresEstado();
    
    const interval = setInterval(() => {
      fetchSupervisoresEstado();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [user]);

  // Calcular cantidad de conectados
  const conectados = supervisores.filter(s => s.estado === 'conectado').length;
  const total = supervisores.length;

  // Formatear última conexión
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Nunca';
    const now = new Date();
    const lastLogin = new Date(fecha);
    const diffMs = now - lastLogin;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  return (
    <div className="connection-panel-container">
      {/* Indicador circular */}
      <button
        className={`connection-indicator ${conectados === total && total > 0 ? 'all-online' : conectados > 0 ? 'partial-online' : 'offline'}`}
        onClick={() => setExpanded(!expanded)}
        title={`${conectados}/${total} supervisores conectados`}
      >
        <div className="indicator-dot" />
        <span className="indicator-count">{conectados}</span>
      </button>

      {/* Panel expandible */}
      {expanded && (
        <div className="connection-panel">
          <div className="panel-header">
            <h3>Supervisores</h3>
            <button className="close-btn" onClick={() => setExpanded(false)}>✕</button>
          </div>

          <div className="panel-content">
            {loading && total === 0 && (
              <div className="loading">
                <div className="spinner" />
                <p>Cargando...</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={fetchSupervisoresEstado} className="retry-btn">
                  Reintentar
                </button>
              </div>
            )}

            {supervisores.length === 0 && !loading && !error && (
              <div className="empty-state">
                <p>No hay supervisores registrados</p>
              </div>
            )}

            {supervisores.length > 0 && (
              <div className="supervisores-list">
                <div className="list-header">
                  <div className="col-nombre">Nombre</div>
                  <div className="col-estado">Estado</div>
                  <div className="col-conexion">Última conexión</div>
                </div>

                {supervisores.map(sup => (
                  <div key={sup._id} className="supervisor-item">
                    <div className="col-nombre">
                      <span className="supervisor-name">{sup.nombre}</span>
                      <span className="supervisor-email">{sup.email}</span>
                    </div>
                    <div className="col-estado">
                      <div className={`status-badge ${sup.estado}`}>
                        <div className="status-dot" />
                        <span>{sup.estado === 'conectado' ? '🟢 En línea' : '🔴 Desconectado'}</span>
                      </div>
                    </div>
                    <div className="col-conexion">
                      <span className="last-login">{formatearFecha(sup.ultimaConexion)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lastFetch && (
              <div className="panel-footer">
                <span className="last-update">Actualizado hace {Math.round((new Date() - lastFetch) / 1000)}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop para móvil */}
      {expanded && <div className="panel-backdrop" onClick={() => setExpanded(false)} />}
    </div>
  );
}
