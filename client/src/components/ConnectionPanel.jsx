import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './ConnectionPanel.css';

export default function ConnectionPanel() {
  const { user } = useAuth();
  const [expanded, setExpanded]       = useState(false);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [lastFetch, setLastFetch]     = useState(null);

  /* ── Dragging State & Refs ─────────────────────────── */
  const containerRef = useRef(null);
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('connection_panel_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch (_) {
      return { x: 0, y: 0 };
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, hasMoved: false });
  const posRef = useRef(position);
  posRef.current = position;

  const handleStart = (e) => {
    // Solo clic izquierdo
    if (e.button !== undefined && e.button !== 0) return;

    // No arrastrar si hace clic en elementos interactivos del panel (botones, inputs, links)
    const target = e.target;
    if (
      target.closest('.close-btn') || 
      target.closest('button:not(.connection-indicator)') || 
      target.closest('input') || 
      target.closest('a')
    ) {
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      x: clientX - posRef.current.x,
      y: clientY - posRef.current.y,
      startX: clientX,
      startY: clientY,
      hasMoved: false
    };

    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = clientX - dragStartRef.current.startX;
      const dy = clientY - dragStartRef.current.startY;

      if (!dragStartRef.current.hasMoved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragStartRef.current.hasMoved = true;
      }

      let newX = clientX - dragStartRef.current.x;
      let newY = clientY - dragStartRef.current.y;

      // Limitar coordenadas para que no salga completamente de la pantalla
      const margin = 30;
      const maxX = window.innerWidth - margin;
      const minX = -window.innerWidth + margin;
      const maxY = window.innerHeight - margin;
      const minY = -window.innerHeight + margin;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
      localStorage.setItem('connection_panel_pos', JSON.stringify(posRef.current));
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const handleFabClick = (e) => {
    if (dragStartRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setExpanded(o => !o);
  };

  /* ── Click Outside to Close ────────────────────────── */
  useEffect(() => {
    if (!expanded) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [expanded]);

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
  const panelStyle = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.1, 0.8, 0.25, 1)',
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div
      ref={containerRef}
      className={`connection-panel-container ${isDragging ? 'dragging' : ''}`}
      style={panelStyle}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >

      {/* ── FAB trigger ── */}
      <button
        className={`connection-indicator ${fabState}`}
        onClick={handleFabClick}
        title={`${conectados}/${total} supervisores en línea`}
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
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
        <div className="connection-panel">

          {/* Header */}
          <div className="panel-header" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
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
      )}
    </div>
  );
}
