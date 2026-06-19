import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, getToken } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import NumberGrid from '../components/NumberGrid';
import BuyerModal from '../components/BuyerModal';
import EditCompraModal from '../components/EditCompraModal';
import EditRifaModal from '../components/EditRifaModal';
import socket from '../socket';

const formatDate = (d) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
const formatCLP  = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

export default function RifaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [rifa, setRifa]           = useState(null);
  const [compras, setCompras]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCompra, setEditCompra] = useState(null); // compra a editar
  const [showEditRifa, setShowEditRifa] = useState(false);
  const [selectedNums, setSelectedNums] = useState([]);
  const [tab, setTab]             = useState('grilla');

  const handleNumberClick = (num) => {
    setSelectedNums(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/rifas/${id}`),
      axios.get(`${API}/api/compras/${id}`)
    ]).then(([r, c]) => { setRifa(r.data); setCompras(c.data); })
      .catch(() => toast.error('Error cargando la rifa'))
      .finally(() => setLoading(false));

    socket.connect();
    socket.emit('join_rifa', id);

    socket.on('compra_nueva', (compra) => {
      setCompras(prev => [compra, ...prev]);
      toast.success(`Compra registrada — ${compra.comprador}`);
    });
    socket.on('compra_eliminada', ({ id: cid }) => {
      setCompras(prev => prev.filter(c => c._id !== cid));
    });
    socket.on('compra_actualizada', (updated) => {
      setCompras(prev => prev.map(c => c._id === updated._id ? updated : c));
    });

    let interval = null;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      interval = setInterval(() => {
        axios.get(`${API}/api/compras/${id}`)
          .then(c => setCompras(c.data))
          .catch(console.error);
      }, 15000);
    }

    return () => {
      socket.emit('leave_rifa', id);
      socket.off('compra_nueva');
      socket.off('compra_eliminada');
      socket.off('compra_actualizada');
      socket.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [id]);

  const handleDeleteRifa = async () => {
    if (!window.confirm('¿Eliminar esta rifa permanentemente?')) return;
    try {
      await axios.delete(`${API}/api/rifas/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Rifa eliminada');
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDeleteCompra = async (compraId) => {
    if (!window.confirm('¿Eliminar esta compra?')) return;
    try {
      await axios.delete(`${API}/api/compras/${compraId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Compra eliminada');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  if (loading) return (
    <div className="page" style={{ paddingTop: 80, textAlign: 'center' }}>
      <span className="animate-pulse" style={{ color: 'var(--white-30)', fontSize: '0.85rem' }}>Cargando…</span>
    </div>
  );

  if (!rifa) return (
    <div className="page" style={{ paddingTop: 80, textAlign: 'center' }}>
      <p>Rifa no encontrada.</p>
      <Link to="/" className="btn btn-ghost" style={{ marginTop: 16 }}>Volver</Link>
    </div>
  );

  const numerosVendidos = compras.flatMap(c => c.numeros).length;
  const porcentaje      = ((numerosVendidos / rifa.totalNumeros) * 100).toFixed(1);
  const recaudado       = compras.reduce((a, c) => a + c.montoTotal, 0);
  const faltante        = (rifa.totalNumeros - numerosVendidos) * rifa.precioPorNumero;

  return (
    <div className="page">
      {/* Guest banner */}
      {!user && (
        <div className="guest-banner">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="5" r="2.5" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
          <p>Vista de solo lectura. <Link to="/login" style={{ color: 'var(--white-60)', fontWeight: 600 }}>Ingresar como administrador</Link></p>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Rifas</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{rifa.nombre}</span>
      </div>

      {/* Header */}
      <div className="rifa-detail-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1>{rifa.nombre}</h1>
            <span className={`pill ${rifa.estado}`}><span className="dot"/>{rifa.estado}</span>
          </div>
          <p style={{ marginBottom: 16 }}>Premio: <strong style={{ color: 'var(--white-90)' }}>{rifa.nombrePremio}</strong></p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {rifa.fechaInicio && (
              <div>
                <div className="section-label">Inicio</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatDate(rifa.fechaInicio)}</div>
              </div>
            )}
            <div>
              <div className="section-label">Sorteo</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatDate(rifa.fechaSorteo)}</div>
            </div>
            <div>
              <div className="section-label">Precio / número</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatCLP(rifa.precioPorNumero)}</div>
            </div>
          </div>
        </div>

        <div className="rifa-detail-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          {rifa.imagenPremio && (
            <img
              src={`${API}${rifa.imagenPremio}`}
              alt={rifa.nombrePremio}
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border-light)' }}
            />
          )}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btn-danger btn-sm" id="btn-delete-rifa" onClick={handleDeleteRifa}>Eliminar rifa</button>
              <button className="btn btn-ghost btn-sm" id="btn-editar-rifa" onClick={() => setShowEditRifa(true)}>Editar Rifa</button>
              <Link to={`/rifa/${id}/vista`} className="btn btn-ghost btn-sm" id="btn-vista" target="_blank">Vista Supervisor</Link>
              <Link to={`/rifa/${id}/analytics`} className="btn btn-ghost btn-sm" id="btn-analytics">Analytics</Link>
              <button className="btn btn-primary" id="btn-registrar-compra" onClick={() => setShowModal(true)}>
                Registrar Compra
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Vendidos</div>
          <div className="stat-value">{numerosVendidos}<span style={{ fontSize: '1rem', color: 'var(--white-20)', fontWeight: 400 }}>/41</span></div>
          <div style={{ marginTop: 10 }}>
            <div className="progress-bar-bg">
              <div className={`progress-bar-fill ${parseFloat(porcentaje) >= 75 ? 'success' : ''}`} style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Avance</div>
          <div className="stat-value">{porcentaje}%</div>
          <div className="stat-sub">{41 - numerosVendidos} disponibles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recaudado</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCLP(recaudado)}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Por Recaudar</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCLP(faltante)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'grilla' ? 'active' : ''}`} id="tab-grilla" onClick={() => setTab('grilla')}>Grilla de Números</button>
        <button className={`tab-btn ${tab === 'lista'  ? 'active' : ''}`} id="tab-lista"  onClick={() => setTab('lista')}>Compradores</button>
      </div>

      {tab === 'grilla' ? (
        <div className="card">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--white)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--white-40)' }}>Vendido</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--white-40)' }}>Disponible</span>
            </div>
          </div>
          <NumberGrid compras={compras} isAdmin={isAdmin} onCellClick={handleNumberClick} selectedNums={selectedNums} />
        </div>
      ) : (
        compras.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" className="empty-icon">
              <rect x="6" y="16" width="36" height="22" rx="2" /><line x1="16" y1="16" x2="16" y2="38" strokeDasharray="4 3" />
            </svg>
            <h3>Sin compras registradas</h3>
            <p>Los números vendidos aparecerán aquí</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Comprador</th>
                  <th>Números</th>
                  <th>Cant.</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th>Nota</th>
                  {isAdmin && <th style={{ width: 140 }}></th>}
                </tr>
              </thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c._id} id={`compra-row-${c._id}`}>
                    <td style={{ fontWeight: 600 }}>{c.comprador}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.numeros.sort((a,b)=>a-b).map(n => (
                          <span key={n} style={{ background: 'var(--white)', color: 'var(--bg)', padding: '1px 6px', borderRadius: 3, fontSize: '0.68rem', fontWeight: 700 }}>
                            {String(n).padStart(2,'0')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: 'var(--white-60)' }}>{c.numeros.length}</td>
                    <td style={{ fontWeight: 700 }}>{formatCLP(c.montoTotal)}</td>
                    <td style={{ color: 'var(--white-30)', fontSize: '0.78rem' }}>
                      {new Date(c.createdAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ color: 'var(--white-30)', fontSize: '0.78rem' }}>{c.nota || '—'}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            id={`btn-edit-${c._id}`}
                            onClick={() => setEditCompra(c)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            id={`btn-del-${c._id}`}
                            onClick={() => handleDeleteCompra(c._id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showModal && (
        <BuyerModal
          rifaId={id}
          precioPorNumero={rifa.precioPorNumero}
          compras={compras}
          onClose={() => setShowModal(false)}
          initialSelectedNums={selectedNums}
          onSuccess={() => setSelectedNums([])}
        />
      )}

      {isAdmin && selectedNums.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          width: '90%',
          maxWidth: 600,
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: 'var(--white)',
              color: 'var(--bg)',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '2px 8px',
              borderRadius: 6
            }}>
              {selectedNums.length}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--white-80)' }}>
              Número(s) seleccionado(s): <strong style={{ color: 'var(--white)' }}>{selectedNums.join(', ')}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedNums([])}>
              Limpiar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              Vender
            </button>
          </div>
        </div>
      )}

      {editCompra && (
        <EditCompraModal
          compra={editCompra}
          todasCompras={compras}
          precioPorNumero={rifa.precioPorNumero}
          onClose={() => setEditCompra(null)}
          onSuccess={() => setEditCompra(null)}
        />
      )}

      {showEditRifa && (
        <EditRifaModal
          rifa={rifa}
          onClose={() => setShowEditRifa(false)}
          onSuccess={(updatedRifa) => {
            setRifa(updatedRifa);
            setShowEditRifa(false);
          }}
        />
      )}
    </div>
  );
}
