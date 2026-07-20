import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { API, getToken } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import NumberGrid from '../components/NumberGrid';
import BuyerModal from '../components/BuyerModal';
import EditCompraModal from '../components/EditCompraModal';
import EditRifaModal from '../components/EditRifaModal';
import socket from '../socket';

const formatDate = (d) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
const formatCLP  = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const getTransferStatus = (compra) => {
  if (compra.transferido) {
    return {
      status: 'success',
      label: 'Transferido',
      icon: '✅',
      daysLeftText: 'Pago verificado'
    };
  }

  const createdTime = new Date(compra.createdAt).getTime();
  const limitTime = createdTime + 3 * 24 * 60 * 60 * 1000;
  const msRemaining = limitTime - Date.now();

  if (msRemaining <= 0) {
    const daysOverdue = Math.floor(Math.abs(msRemaining) / (24 * 60 * 60 * 1000));
    return {
      status: 'danger',
      label: 'Vencido',
      icon: '⚠️',
      daysLeftText: daysOverdue === 0 ? 'Venció hoy' : `Vencido hace ${daysOverdue}d`
    };
  }

  const hoursRemaining = Math.floor(msRemaining / (60 * 60 * 1000));
  if (hoursRemaining <= 24) {
    return {
      status: 'warning',
      label: 'Expira pronto',
      icon: '⚠️',
      daysLeftText: `Vence en ${hoursRemaining}h`
    };
  }

  const daysRemaining = Math.floor(hoursRemaining / 24);
  const remainingHours = hoursRemaining % 24;
  return {
    status: 'pending',
    label: 'Pendiente',
    icon: '⏳',
    daysLeftText: `Vence en ${daysRemaining}d ${remainingHours}h`
  };
};

export default function RifaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [rifa, setRifa]             = useState(null);
  const [compras, setCompras]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editCompra, setEditCompra] = useState(null);
  const [showEditRifa, setShowEditRifa] = useState(false);
  const [selectedNums, setSelectedNums] = useState([]);
  const [tab, setTab]               = useState('grilla');

  const exportToExcel = () => {
    if (compras.length === 0) {
      toast.error('No hay compras para exportar');
      return;
    }
    const data = compras.map((c) => ({
      Comprador: c.comprador,
      'Números': c.numeros.sort((a, b) => a - b).map(n => String(n).padStart(2, '0')).join(', '),
      'Cant. Números': c.numeros.length,
      'Monto Total (CLP)': c.montoTotal,
      'Transferido': c.transferido ? 'SI' : 'NO',
      'Fecha Compra': new Date(c.createdAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    // Column widths
    ws['!cols'] = [
      { wch: 28 }, // Comprador
      { wch: 32 }, // Números
      { wch: 14 }, // Cant.
      { wch: 20 }, // Monto
      { wch: 14 }, // Transferido
      { wch: 20 }, // Fecha
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compradores');
    const fileName = `${rifa?.nombre?.replace(/\s+/g, '_') || 'rifa'}_compradores.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Excel exportado: ${fileName}`);
  };

  const handleToggleTransfer = async (compra) => {
    try {
      const newStatus = !compra.transferido;
      await axios.put(`${API}/api/compras/${compra._id}`, 
        { transferido: newStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success(newStatus ? 'Pago verificado correctamente' : 'Pago marcado como pendiente');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar transferencia');
    }
  };

  const handleNumberClick = (num) => {
    setSelectedNums(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
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
    socket.on('compra_eliminada', ({ id: cid }) => setCompras(prev => prev.filter(c => c._id !== cid)));
    socket.on('compra_actualizada', (updated) => setCompras(prev => prev.map(c => c._id === updated._id ? updated : c)));

    let interval = null;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      interval = setInterval(() => {
        axios.get(`${API}/api/compras/${id}`).then(c => setCompras(c.data)).catch(console.error);
      }, 15000);
    }
    return () => {
      socket.emit('leave_rifa', id);
      socket.off('compra_nueva'); socket.off('compra_eliminada'); socket.off('compra_actualizada');
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-pulse" style={{ color: 'var(--white-20)', fontSize: '0.82rem' }}>Cargando…</div>
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
  const pctNum          = parseFloat(porcentaje);
  const progressColor   = pctNum >= 75 ? 'var(--success)' : pctNum >= 40 ? 'var(--warning)' : 'var(--white)';
  const ocupadosList    = compras.flatMap(c => c.numeros).sort((a, b) => a - b);

  const comprasPendientes = compras.filter(c => !c.transferido);
  const comprasVerificadas = compras.filter(c => c.transferido);
  const totalRecaudadoVerificado = comprasVerificadas.reduce((a, c) => a + c.montoTotal, 0);
  const totalPendiente = comprasPendientes.reduce((a, c) => a + c.montoTotal, 0);
  const tasaRecaudacion = recaudado > 0 ? ((totalRecaudadoVerificado / recaudado) * 100).toFixed(1) : '0.0';

  const expiredOrExpiringCount = compras.filter(c => !c.transferido).reduce((acc, c) => {
    const createdTime = new Date(c.createdAt).getTime();
    const limitTime = createdTime + 3 * 24 * 60 * 60 * 1000;
    const msRemaining = limitTime - Date.now();
    if (msRemaining <= 24 * 60 * 60 * 1000) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <div className="page" style={{ paddingBottom: 80 }}>

      {/* ── Guest banner ── */}
      {!user && (
        <div className="guest-banner" style={{ marginBottom: 20 }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="5" r="2.5" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
          <p>Vista de solo lectura. <Link to="/login" style={{ color: 'var(--white-60)', fontWeight: 600 }}>Ingresar como administrador</Link></p>
        </div>
      )}

      {/* ── Admin Warning Banner ── */}
      {isAdmin && expiredOrExpiringCount > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.22)',
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
        }}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#f87171' }}>
              Alerta de Transferencias Pendientes
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--white-60)' }}>
              Hay <strong>{expiredOrExpiringCount}</strong> compra(s) sin registrar transferencia que han superado o están a menos de 24 horas del límite de 3 días.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setTab('lista')}
            style={{
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              background: 'rgba(239, 68, 68, 0.05)',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            Ver Lista
          </button>
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <div className="breadcrumb" style={{ marginBottom: 24 }}>
        <Link to="/">Rifas</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{rifa.nombre}</span>
      </div>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative',
        background: rifa.imagenPremio
          ? `linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.85) 60%, #080808 100%)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        minHeight: 200,
      }}>
        {/* Fondo imagen borrosa */}
        {rifa.imagenPremio && (
          <img
            src={rifa.imagenPremio.startsWith('data:') ? rifa.imagenPremio : `${API}${rifa.imagenPremio}`}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'blur(40px) saturate(0.4)', opacity: 0.35, zIndex: 0,
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className={`pill ${rifa.estado}`}><span className="dot" />{rifa.estado}</span>
              {isAdmin && (
                <span style={{ fontSize: '0.65rem', color: 'var(--white-20)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                  ID: {id.slice(-6)}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', marginBottom: 6, letterSpacing: '-0.04em' }}>
              {rifa.nombre}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--white-40)', marginBottom: 20 }}>
              Premio: <strong style={{ color: 'var(--white-80, rgba(255,255,255,0.8))' }}>{rifa.nombrePremio}</strong>
            </p>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
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

          {/* Right — image + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
            {rifa.imagenPremio && (
              <img
                src={rifa.imagenPremio.startsWith('data:') ? rifa.imagenPremio : `${API}${rifa.imagenPremio}`}
                alt={rifa.nombrePremio}
                style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 14, border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              />
            )}
            {isAdmin && (
              <div className="rifa-detail-actions" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger btn-sm" id="btn-delete-rifa" onClick={handleDeleteRifa}>Eliminar</button>
                <button className="btn btn-ghost btn-sm" id="btn-editar-rifa" onClick={() => setShowEditRifa(true)}>Editar</button>
                <Link to={`/rifa/${id}/vista`} className="btn btn-ghost btn-sm" id="btn-vista" target="_blank">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 13, height: 13 }}>
                    <circle cx="8" cy="8" r="3" /><path d="M1 8C3 4 13 4 15 8c-2 4-12 4-14 0z" />
                  </svg>
                  Vista supervisor
                </Link>
                <Link to={`/rifa/${id}/analytics`} className="btn btn-ghost btn-sm" id="btn-analytics">Analytics</Link>
                <button className="btn btn-primary btn-sm" id="btn-registrar-compra" onClick={() => setShowModal(true)}>
                  + Registrar compra
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar at bottom of hero */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 32px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--white-30)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Progreso de ventas
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: progressColor }}>
              {numerosVendidos} / {rifa.totalNumeros} · {porcentaje}%
            </span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${porcentaje}%`, background: progressColor, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Números vendidos', value: numerosVendidos, sub: `${41 - numerosVendidos} disponibles`, accent: null },
          { label: 'Avance', value: `${porcentaje}%`, sub: null, accent: progressColor },
          { label: 'Total recaudado', value: formatCLP(recaudado), sub: null, accent: 'var(--success)' },
          { label: 'Por recaudar', value: formatCLP(faltante), sub: null, accent: 'var(--warning)' },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '18px 20px',
            transition: 'border-color 0.18s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 10 }}>
              {label}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: accent || 'var(--white)' }}>
              {value}
            </div>
            {sub && <div style={{ fontSize: '0.72rem', color: 'var(--white-30)', marginTop: 5 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div className="tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
          <button className={`tab-btn ${tab === 'grilla' ? 'active' : ''}`} id="tab-grilla" onClick={() => setTab('grilla')}>
            Grilla de números
          </button>
          <button className={`tab-btn ${tab === 'lista' ? 'active' : ''}`} id="tab-lista" onClick={() => setTab('lista')}>
            Compradores
            {compras.length > 0 && (
              <span style={{
                marginLeft: 7, background: 'var(--surface-3)', color: 'var(--white-40)',
                fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              }}>{compras.length}</span>
            )}
          </button>
          <button className={`tab-btn ${tab === 'transferencias' ? 'active' : ''}`} id="tab-transferencias" onClick={() => setTab('transferencias')}>
            Transferencias
            {compras.length > 0 && (
              <span style={{
                marginLeft: 7, background: 'var(--surface-3)', color: 'var(--white-40)',
                fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              }}>
                {comprasVerificadas.length}/{compras.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Botón exportar Excel ── */}
        {isAdmin && compras.length > 0 && (
          <button
            id="btn-export-excel"
            onClick={exportToExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px',
              borderRadius: 10,
              border: '1px solid rgba(52, 211, 153, 0.3)',
              background: 'rgba(52, 211, 153, 0.08)',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s',
              letterSpacing: '0.02em',
              flexShrink: 0,
              marginBottom: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.16)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            title="Exportar compradores a Excel"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 15, height: 15 }}>
              <rect x="2" y="3" width="16" height="14" rx="2" />
              <path d="M2 7h16" strokeLinecap="round" />
              <path d="M7 7v10" strokeLinecap="round" />
              <path d="M13 3v4" strokeLinecap="round" />
              <path d="M10 11l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Exportar Excel
          </button>
        )}
      </div>

      {/* ── TAB: GRILLA ── */}
      {tab === 'grilla' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--white-20)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {numerosVendidos} vendidos · {rifa.totalNumeros - numerosVendidos} libres
            </span>
            <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--white)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Vendido</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--surface-3)', border: '1px solid var(--border)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Disponible</span>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: 'transparent', border: '1.5px solid var(--white)', boxShadow: '0 0 0 1px var(--white)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Seleccionado</span>
                </div>
              )}
            </div>
          </div>
          <NumberGrid compras={compras} isAdmin={isAdmin} onCellClick={handleNumberClick} selectedNums={selectedNums} />

          {/* Lista de números ocupados */}
          {ocupadosList.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--white-30)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                Lista de Números Vendidos ({ocupadosList.length})
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ocupadosList.map(n => (
                  <span key={n} style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--white)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}>
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: LISTA ── */}
      {tab === 'lista' && (
        compras.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" className="empty-icon">
              <rect x="6" y="16" width="36" height="22" rx="2" /><line x1="16" y1="16" x2="16" y2="38" strokeDasharray="4 3" />
            </svg>
            <h3>Sin compras registradas</h3>
            <p>Los números vendidos aparecerán aquí</p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Comprador', 'Números', 'Cant.', 'Monto', 'Fecha', 'Nota', 'Estado de Pago', ...(isAdmin ? [''] : [])].map(h => (
                    <th key={h} style={{ padding: '12px 18px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--white-25, rgba(255,255,255,0.25))', textAlign: 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compras.map((c, i) => {
                  const transferInfo = getTransferStatus(c);
                  
                  let badgeStyle = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  };

                  if (transferInfo.status === 'success') {
                    badgeStyle = {
                      ...badgeStyle,
                      background: 'rgba(52, 211, 153, 0.12)',
                      color: '#34d399',
                      border: '1px solid rgba(52, 211, 153, 0.2)'
                    };
                  } else if (transferInfo.status === 'danger') {
                    badgeStyle = {
                      ...badgeStyle,
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    };
                  } else if (transferInfo.status === 'warning') {
                    badgeStyle = {
                      ...badgeStyle,
                      background: 'rgba(251, 191, 36, 0.12)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.2)'
                    };
                  } else {
                    badgeStyle = {
                      ...badgeStyle,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    };
                  }

                  return (
                    <tr key={c._id} id={`compra-row-${c._id}`}
                      style={{ borderBottom: i < compras.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                            {c.comprador.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--white-90)' }}>{c.comprador}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {c.numeros.sort((a, b) => a - b).map(n => (
                            <span key={n} style={{ background: 'var(--white)', color: 'var(--bg)', padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                              {String(n).padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '13px 18px', color: 'var(--white-40)', fontWeight: 600 }}>{c.numeros.length}</td>
                      <td style={{ padding: '13px 18px', fontWeight: 700, color: 'var(--white-90)' }}>{formatCLP(c.montoTotal)}</td>
                      <td style={{ padding: '13px 18px', color: 'var(--white-30)', fontSize: '0.75rem' }}>
                        {new Date(c.createdAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '13px 18px', color: 'var(--white-25, rgba(255,255,255,0.25))', fontSize: '0.78rem' }}>
                        {c.nota || <span style={{ opacity: 0.3 }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleTransfer(c)}
                              style={{
                                position: 'relative',
                                width: 34,
                                height: 18,
                                borderRadius: 999,
                                background: c.transferido ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: c.transferido ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.15)',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0 2px',
                                outline: 'none',
                                flexShrink: 0
                              }}
                              title={c.transferido ? "Marcar como pendiente" : "Marcar como verificado"}
                            >
                              <div style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: c.transferido ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
                                transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                                transform: c.transferido ? 'translateX(18px)' : 'translateX(0px)',
                                boxShadow: c.transferido ? '0 0 6px #34d399' : 'none'
                              }} />
                            </button>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={badgeStyle}>
                                <span style={{ fontSize: '0.65rem' }}>{transferInfo.icon}</span>
                                <span>{transferInfo.label}</span>
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--white-30)', fontWeight: 500, paddingLeft: 4 }}>
                              {transferInfo.daysLeftText}
                            </span>
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" id={`btn-edit-${c._id}`} onClick={() => setEditCompra(c)}>Editar</button>
                            <button className="btn btn-danger btn-sm" id={`btn-del-${c._id}`} onClick={() => handleDeleteCompra(c._id)}>Eliminar</button>
                            <Link
                              to={`/comprobante/${c._id}`}
                              target="_blank"
                              className="btn btn-ghost btn-sm"
                              id={`btn-comp-${c._id}`}
                              title="Ver comprobante público"
                              style={{ color: 'rgba(52,211,153,0.8)', borderColor: 'rgba(52,211,153,0.2)' }}
                            >🎟️</Link>
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── TAB: TRANSFERENCIAS ── */}
      {tab === 'transferencias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Tarjetas de Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 8 }}>
                Recaudado (Verificado)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {formatCLP(totalRecaudadoVerificado)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--white-30)', marginTop: 5 }}>
                {comprasVerificadas.length} transacciones
              </div>
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 8 }}>
                Por Recaudar (Pendiente)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {formatCLP(totalPendiente)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--white-30)', marginTop: 5 }}>
                {comprasPendientes.length} transacciones
              </div>
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 8 }}>
                Tasa de Recaudación
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {tasaRecaudacion}%
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${tasaRecaudacion}%`, background: 'var(--success)', borderRadius: 99 }} />
              </div>
            </div>
          </div>

          {/* Grid de dos columnas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20
          }}>
            {/* Columna Pendientes */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid rgba(251, 191, 36, 0.15)',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 8px 32px rgba(251, 191, 36, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
                  <span>⏳</span> Pendientes de Pago
                </h3>
                <span style={{
                  background: 'rgba(251, 191, 36, 0.12)',
                  color: '#fbbf24',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99
                }}>
                  {comprasPendientes.length}
                </span>
              </div>

              {comprasPendientes.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: 12,
                  border: '1.5px dashed var(--border)',
                }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>🎉</div>
                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--white-80)' }}>¡Todo al día!</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--white-35)' }}>No hay transferencias pendientes de verificación</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {comprasPendientes.map(c => {
                    const statusInfo = getTransferStatus(c);
                    return (
                      <div key={c._id} style={{
                        background: 'var(--surface-2)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 12,
                        padding: 14,
                        transition: 'border-color 0.15s, transform 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                              {c.comprador.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--white-90)' }}>{c.comprador}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--white-30)', marginTop: 1 }}>
                                Compra: {new Date(c.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleTransfer(c)}
                              style={{
                                position: 'relative',
                                width: 34,
                                height: 18,
                                borderRadius: 999,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0 2px',
                                outline: 'none',
                                flexShrink: 0
                              }}
                              title="Marcar como verificado"
                            >
                              <div style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.4)',
                                transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                                transform: 'translateX(0px)'
                              }} />
                            </button>
                          )}
                        </div>

                        {c.nota && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--white-40)', background: 'var(--surface-3)', padding: '6px 10px', borderRadius: 6, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                            {c.nota}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {c.numeros.sort((a, b) => a - b).map(n => (
                              <span key={n} style={{ background: 'var(--white)', color: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 800 }}>
                                {String(n).padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--white)' }}>{formatCLP(c.montoTotal)}</div>
                            <div style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              color: statusInfo.status === 'danger' ? '#f87171' : statusInfo.status === 'warning' ? '#fbbf24' : 'var(--white-30)',
                              marginTop: 1
                            }}>
                              {statusInfo.daysLeftText}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Columna Verificados */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid rgba(52, 211, 153, 0.15)',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 8px 32px rgba(52, 211, 153, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>
                  <span>✅</span> Verificados / Transferidos
                </h3>
                <span style={{
                  background: 'rgba(52, 211, 153, 0.12)',
                  color: '#34d399',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99
                }}>
                  {comprasVerificadas.length}
                </span>
              </div>

              {comprasVerificadas.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: 12,
                  border: '1.5px dashed var(--border)',
                }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>⏳</div>
                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--white-80)' }}>Sin verificados</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--white-35)' }}>Aún no se han verificado transferencias de pago</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {comprasVerificadas.map(c => (
                    <div key={c._id} style={{
                      background: 'var(--surface-2)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                      transition: 'border-color 0.15s, transform 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(52,211,153,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: '#34d399', flexShrink: 0 }}>
                            {c.comprador.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--white-90)' }}>{c.comprador}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--white-30)', marginTop: 1 }}>
                              Verificado: {new Date(c.updatedAt || c.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleTransfer(c)}
                            style={{
                              position: 'relative',
                              width: 34,
                              height: 18,
                              borderRadius: 999,
                              background: 'rgba(52, 211, 153, 0.2)',
                              border: '1px solid #34d399',
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0 2px',
                              outline: 'none',
                              flexShrink: 0
                            }}
                            title="Marcar como pendiente"
                          >
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: '#34d399',
                              transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                              transform: 'translateX(18px)',
                              boxShadow: '0 0 6px #34d399'
                            }} />
                          </button>
                        )}
                      </div>

                      {c.nota && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--white-40)', background: 'var(--surface-3)', padding: '6px 10px', borderRadius: 6, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                          {c.nota}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {c.numeros.sort((a, b) => a - b).map(n => (
                            <span key={n} style={{ background: 'var(--white)', color: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 800 }}>
                              {String(n).padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--white)' }}>{formatCLP(c.montoTotal)}</div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            color: '#34d399',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            marginTop: 1
                          }}>
                            <span>✅</span> Pago verificado
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showModal && (
        <BuyerModal
          rifaId={id} precioPorNumero={rifa.precioPorNumero} compras={compras}
          onClose={() => setShowModal(false)}
          initialSelectedNums={selectedNums}
          onSuccess={() => setSelectedNums([])}
        />
      )}

      {editCompra && (
        <EditCompraModal
          compra={editCompra} todasCompras={compras} precioPorNumero={rifa.precioPorNumero}
          onClose={() => setEditCompra(null)} onSuccess={() => setEditCompra(null)}
        />
      )}

      {showEditRifa && (
        <EditRifaModal
          rifa={rifa} onClose={() => setShowEditRifa(false)}
          onSuccess={(updatedRifa) => { setRifa(updatedRifa); setShowEditRifa(false); }}
        />
      )}

      {/* ── Floating selection bar ── */}
      {isAdmin && selectedNums.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 18,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          zIndex: 1000, width: '90%', maxWidth: 560, justifyContent: 'space-between',
          animation: 'slideUp 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'var(--white)', color: 'var(--bg)', fontWeight: 800, fontSize: '0.75rem', padding: '2px 9px', borderRadius: 6 }}>
              {selectedNums.length}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--white-60)' }}>
              Seleccionados: <strong style={{ color: 'var(--white)' }}>{selectedNums.join(', ')}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedNums([])}>Limpiar</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Vender →</button>
          </div>
        </div>
      )}
    </div>
  );
}
