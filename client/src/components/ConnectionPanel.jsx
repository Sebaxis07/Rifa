import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ConnectionPanel.css';

export default function ConnectionPanel() {
  const { user } = useAuth();
  const [expanded, setExpanded]       = useState(false);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [lastFetch, setLastFetch]     = useState(null);

  /* ── Fetch ─────────────────────────────────────────── */
  const fetchSupervisoresEstado = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const url = apiUrl
        ? `${apiUrl}/api/auth/supervisores-estado`
        : '/api/auth/supervisores-estado';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al obtener estado de supervisores');
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

  /* ── Polling ─────────────────────────────────────────── */
  useEffect(() => {
    if (!user || user.rol !== 'admin') return;
    fetchSupervisoresEstado();
    const interval = setInterval(fetchSupervisoresEstado, 30000);
    return () => clearInterval(interval);
  }, [user]);

  /* ── Guard (after all hooks) ─────────────────────────── */
  if (!user || user.rol !== 'admin') return null;

  /* ── Derived ─────────────────────────────────────────── */
  const conectados = supervisores.filter(s => s.estado === 'conectado').length;
  const total      = supervisores.length;

  const fabState = conectados === total && total > 0
    ? 'all-online'
    : conectados > 0
      ? 'partial-online'
      : 'offline';

  /* ── Helpers ─────────────────────────────────────────── */
  const getInitials = (nombre = '') =>
    nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  const timeAgo = (fecha) => {
    if (!fecha) return 'Nunca';
    const diff = Math.floor((Date.now() - new Date(fecha)) / 1000);
    if (diff < 60)   return 'ahora mismo';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400)return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
  };

  const lastFetchAgo = lastFetch
    ? (() => {
        const s = Math.floor((Date.now() - lastFetch) / 1000);
        return s < 5 ? 'ahora' : `hace ${s}s`;
      })()
    : null;

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="connection-panel-container">

      {/* ── FAB trigger ── */}
      <button
        className={`connection-indicator ${fabState}`}
        onClick={() => setExpanded(o => !o)}
        title={`${conectados}/${total} supervisores en línea`}
      >
        <div className="indicator-dot" />
        <span className="indicator-count">{conectados}</span>
        <span className="indicator-sep">/</span>
        <span className="indicator-label">{total} sup.</span>

        {/* Chevron */}
        <svg
          className={`indicator-chevron ${expanded ? 'open' : ''}`}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* ── Panel ── */}
      {expanded && (
        <>
          <div className="connection-panel">

            {/* Header */}
            <div className="panel-header">
              <div className="panel-header-left">
                <p className="panel-title">Supervisores</p>
                <span className="panel-subtitle">Panel de acceso en vivo</span>
              </div>
              <div className="panel-header-right">
                <div className="summary-pills">
                  {conectados > 0 && (
                    <span className="summary-pill online">
                      <span className="summary-pill-dot" />
                      {conectados} en línea
                    </span>
                  )}
                  {total - conectados > 0 && (
                    <span className="summary-pill offline">
                      {total - conectados} fuera
                    </span>
                  )}
                </div>
                <button className="close-btn" onClick={() => setExpanded(false)}>✕</button>
              </div>
            </div>

            {/* Content */}
            <div className="panel-content">

              {/* Loading */}
              {loading && total === 0 && (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Obteniendo estado…</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="error-state">
                  <p>{error}</p>
                  <button onClick={fetchSupervisoresEstado} className="retry-btn">
                    Reintentar
                  </button>
                </div>
              )}

              {/* Empty */}
              {supervisores.length === 0 && !loading && !error && (
                <div className="empty-state">
                  <span className="empty-icon">👥</span>
                  <p>No hay supervisores registrados</p>
                </div>
              )}

              {/* List */}
              {supervisores.length > 0 && (
                <div className="supervisores-list">
                  {supervisores.map((sup, i) => {
                    const isOnline = sup.estado === 'conectado';
                    const initials = getInitials(sup.nombre);
                    return (
                      <div key={sup._id}>
                        <div className="supervisor-item">

                          {/* Avatar */}
                          <div className={`supervisor-avatar ${isOnline ? 'online' : 'offline'}`}>
                            {initials}
                            <span className={`avatar-status-dot ${isOnline ? 'online' : 'offline'}`} />
                          </div>

                          {/* Info */}
                          <div className="supervisor-info">
                            <span className="supervisor-name">{sup.nombre}</span>
                            <span className="supervisor-email">{sup.email}</span>
                          </div>

                          {/* Meta */}
                          <div className="supervisor-meta">
                            <span className={`status-chip ${isOnline ? 'online' : 'offline'}`}>
                              <span className="status-chip-dot" />
                              {isOnline ? 'En línea' : 'Inactivo'}
                            </span>
                            <span className="last-login">
                              {timeAgo(sup.ultimaConexion)}
                            </span>
                          </div>
                        </div>

                        {/* Divider (not on last) */}
                        {i < supervisores.length - 1 && (
                          <div className="supervisor-divider" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
              <button className="footer-refresh-btn" onClick={fetchSupervisoresEstado}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1.5 8A6.5 6.5 0 1 0 4 3" />
                  <polyline points="1 1 1 4 4 4" />
                </svg>
                Actualizar
              </button>
              {lastFetchAgo && (
                <span className="footer-timestamp">Actualizado {lastFetchAgo}</span>
              )}
            </div>

          </div>

          {/* Backdrop */}
          <div className="panel-backdrop" onClick={() => setExpanded(false)} />
        </>
      )}
    </div>
  );
}
