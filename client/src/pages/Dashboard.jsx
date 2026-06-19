import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const formatDate = (d) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
const formatCLP  = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

const IconTicketPlaceholder = () => (
  <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1" className="empty-icon">
    <rect x="2" y="10" width="32" height="16" rx="2" />
    <line x1="12" y1="10" x2="12" y2="26" strokeDasharray="4 3" />
  </svg>
);

function RifaCard({ rifa }) {
  const navigate = useNavigate();
  return (
    <div className="rifa-card" id={`rifa-card-${rifa._id}`} onClick={() => navigate(`/rifa/${rifa._id}`)}>
      {rifa.imagenPremio
        ? <img src={`${API}${rifa.imagenPremio}`} alt={rifa.nombrePremio} className="rifa-card-img" />
        : (
          <div className="rifa-card-img-placeholder">
            <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1" style={{ width: 36, height: 36, opacity: 0.12 }}>
              <rect x="2" y="10" width="32" height="16" rx="2" />
              <line x1="12" y1="10" x2="12" y2="26" strokeDasharray="4 3" />
            </svg>
          </div>
        )
      }
      <div className="rifa-card-body">
        <div className="rifa-card-name">{rifa.nombre}</div>
        <div className="rifa-card-prize">{rifa.nombrePremio}</div>
        <div className="rifa-card-footer">
          <span className={`pill ${rifa.estado}`}>
            <span className="dot" />
            {rifa.estado.charAt(0).toUpperCase() + rifa.estado.slice(1)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--white-30)' }}>
            {formatDate(rifa.fechaSorteo)}
          </span>
        </div>
        <div className="rifa-card-meta">
          <span className="rifa-card-meta-label">Precio / número</span>
          <span className="rifa-card-meta-value">{formatCLP(rifa.precioPorNumero)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [rifas, setRifas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    axios.get(`${API}/api/rifas`)
      .then(r => setRifas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="section-label">Panel de control</div>
            <h1>Rifas</h1>
            <p style={{ marginTop: 4 }}>
              {rifas.length} sorteo{rifas.length !== 1 ? 's' : ''} registrado{rifas.length !== 1 ? 's' : ''}
            </p>
          </div>
          {user?.rol === 'admin' && (
            <Link to="/nueva-rifa" className="btn btn-primary" id="btn-nueva-rifa">
              Nueva Rifa
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div className="animate-pulse" style={{ color: 'var(--white-30)', fontSize: '0.85rem' }}>
            Cargando rifas…
          </div>
        </div>
      ) : rifas.length === 0 ? (
        <div className="empty-state">
          <IconTicketPlaceholder />
          <h3>Sin rifas registradas</h3>
          <p>Crea tu primera rifa para comenzar</p>
          {user?.rol === 'admin' && (
            <Link to="/nueva-rifa" className="btn btn-primary" style={{ marginTop: 8 }} id="btn-primera-rifa">
              Crear primera rifa
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
          {rifas.map(r => <RifaCard key={r._id} rifa={r} />)}
        </div>
      )}
    </div>
  );
}
