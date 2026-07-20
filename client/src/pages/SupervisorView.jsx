import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import socket from '../socket';

const formatCLP  = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const formatDate = (d) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
const timeAgo    = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
};

/* ── Big Ring ── */
function BigRing({ pct }) {
  const size = 200, stroke = 14;
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = ((100 - Math.min(pct, 100)) / 100) * circ;
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#ffffff';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke 0.5s' }}
      />
      <text x={size/2} y={size/2 + 12} textAnchor="middle" fill="white"
        fontSize="36" fontWeight="800" fontFamily="Inter, sans-serif"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
      <text x={size/2} y={size/2 + 30} textAnchor="middle" fill="rgba(255,255,255,0.3)"
        fontSize="11" fontFamily="Inter, sans-serif"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        completado
      </text>
    </svg>
  );
}

/* ── Countdown ── */
function Countdown({ fechaSorteo }) {
  const [time, setTime] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = new Date(fechaSorteo) - Date.now();
      if (diff <= 0) return setTime({ done: true });
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ d, h, m, s });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [fechaSorteo]);

  if (time.done) return <div style={{ color: '#34d399', fontWeight: 800, fontSize: '1.1rem' }}>¡Día del sorteo!</div>;
  if (!time.d && time.d !== 0) return null;

  const Unit = ({ val, label }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
        {String(val).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
  const Sep = () => <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)', paddingBottom: 14 }}>:</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <Unit val={time.d} label="días" />
      <Sep /><Unit val={time.h} label="horas" />
      <Sep /><Unit val={time.m} label="min" />
      <Sep /><Unit val={time.s} label="seg" />
    </div>
  );
}

/* ── Live Feed Item ── */
function FeedItem({ compra, isNew }) {
  const ref = useRef();
  useEffect(() => {
    if (isNew && ref.current) {
      ref.current.style.background = 'rgba(255,255,255,0.08)';
      ref.current.style.borderColor = 'rgba(255,255,255,0.2)';
      setTimeout(() => {
        if (ref.current) { ref.current.style.background = ''; ref.current.style.borderColor = ''; }
      }, 2500);
    }
  }, [isNew]);

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 10,
      border: '1px solid transparent',
      transition: 'background 0.4s, border-color 0.4s',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)'
      }}>
        {compra.comprador.substring(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {compra.comprador}
          </div>
          {compra.transferido ? (
            <span title="Pago verificado" style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>✓</span>
          ) : (
            <span title="Pendiente de pago" style={{ color: '#fbbf24', fontSize: '0.75rem', flexShrink: 0 }}>⏳</span>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
          {compra.numeros.length} número{compra.numeros.length !== 1 ? 's' : ''} · {formatCLP(compra.montoTotal)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 3 }}>
          {compra.numeros.slice(0, 4).map(n => (
            <span key={n} style={{ background: 'white', color: 'black', padding: '1px 5px', borderRadius: 3, fontSize: '0.62rem', fontWeight: 800 }}>
              {String(n).padStart(2,'0')}
            </span>
          ))}
          {compra.numeros.length > 4 && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>+{compra.numeros.length - 4}</span>}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>{timeAgo(compra.createdAt)}</div>
      </div>
    </div>
  );
}

export default function SupervisorView() {
  const { id } = useParams();
  const [data, setData]         = useState(null);
  const [rifa, setRifa]         = useState(null);
  const [compras, setCompras]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newIds, setNewIds]     = useState(new Set());

  const fetchAll = async () => {
    try {
      const [rifaR, comprasR, analyticsR] = await Promise.all([
        axios.get(`${API}/api/rifas/${id}`),
        axios.get(`${API}/api/compras/${id}`),
        axios.get(`${API}/api/analytics/${id}`),
      ]);
      setRifa(rifaR.data);
      setCompras(comprasR.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setData(analyticsR.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    socket.connect();
    socket.emit('join_rifa', id);

    socket.on('compra_nueva', (c) => {
      setCompras(prev => [c, ...prev]);
      setNewIds(prev => new Set([...prev, c._id]));
      setData(prev => {
        if (!prev) return prev;
        const numMap = { ...prev.numeroMap };
        c.numeros.forEach(n => { numMap[n] = c.comprador; });
        const tv = prev.totalVendidos + c.numeros.length;
        const pct = parseFloat(((tv / prev.totalNumeros) * 100).toFixed(1));
        return { ...prev, totalVendidos: tv, totalLibres: prev.totalNumeros - tv, porcentaje: pct, dineroRecaudado: prev.dineroRecaudado + c.montoTotal, dineroFaltante: prev.dineroFaltante - c.montoTotal, numeroMap: numMap, totalCompras: prev.totalCompras + 1 };
      });
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(c._id); return s; }), 3000);
    });

    socket.on('compra_eliminada', () => fetchAll());
    socket.on('compra_actualizada', () => fetchAll());

    // Fallback polling for Vercel (since serverless environment doesn't support persistent WebSockets)
    let interval = null;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      interval = setInterval(fetchAll, 10000); // Poll every 10 seconds
    }

    return () => {
      socket.emit('leave_rifa', id);
      socket.off('compra_nueva'); socket.off('compra_eliminada'); socket.off('compra_actualizada');
      socket.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
      <div className="animate-pulse" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>Cargando…</div>
    </div>
  );

  if (!data || !rifa) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter' }}>Rifa no encontrada</p>
    </div>
  );

  const numMap  = data.numeroMap || {};
  const pct     = data.porcentaje;
  const color   = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#ffffff';

  return (
    <div style={{
      minHeight: '100vh', background: '#080808', fontFamily: 'Inter, sans-serif',
      color: 'white', padding: '0',
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: 'white', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 16 16" fill="black" style={{ width: 14, height: 14 }}>
              <rect x="1" y="4" width="14" height="8" rx="1.5" />
              <line x1="5.5" y1="4" x2="5.5" y2="12" stroke="white" strokeWidth="1.2" strokeDasharray="2 1.5" />
            </svg>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
            RifaSystem
          </span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>/ Vista en vivo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>TIEMPO REAL</span>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Hero section */}
        <div className="analytics-2col" style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          gap: 32, alignItems: 'start', marginBottom: 28
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
              Sorteo activo
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>
              {rifa.nombre}
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Premio: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{rifa.nombrePremio}</strong>
            </p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>Fecha del sorteo</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatDate(rifa.fechaSorteo)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>Precio / número</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatCLP(rifa.precioPorNumero)}</div>
              </div>
            </div>
          </div>
          {rifa.imagenPremio && (
            <img src={rifa.imagenPremio.startsWith('data:') ? rifa.imagenPremio : `${API}${rifa.imagenPremio}`} alt={rifa.nombrePremio}
              style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }} />
          )}
        </div>

        {/* Countdown */}
        <div style={{ marginBottom: 28, padding: '20px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>
            Tiempo hasta el sorteo
          </div>
          <Countdown fechaSorteo={rifa.fechaSorteo} />
        </div>

        {/* Main grid */}
        <div className="supervisor-main" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', gap: 16, marginBottom: 16 }}>
          {/* Progress ring */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Avance</div>
            <BigRing pct={pct} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Vendidos</span>
                <span style={{ fontWeight: 700, color }}>{data.totalVendidos}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Libres</span>
                <span style={{ fontWeight: 700 }}>{data.totalLibres}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total</span>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>41</span>
              </div>
            </div>
          </div>

          {/* Number grid */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 20px' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>
              Estado de números
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))', gap: 7 }}>
              {Array.from({ length: 41 }, (_, i) => i + 1).map(n => {
                const owner = numMap[n];
                return (
                  <div key={n} title={owner ? `${owner}` : 'Libre'} style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    background: owner ? 'white' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${owner ? 'white' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 2, transition: 'all 0.3s',
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: owner ? '#000' : 'rgba(255,255,255,0.18)', lineHeight: 1 }}>
                      {String(n).padStart(2,'0')}
                    </span>
                    {owner && (
                      <span style={{ fontSize: '0.4rem', color: 'rgba(0,0,0,0.5)', fontWeight: 600, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {owner}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats + feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* KPIs */}
            {[
              { label: 'Recaudado', value: formatCLP(data.dineroRecaudado), color: '#34d399' },
              { label: 'Por recaudar', value: formatCLP(data.dineroFaltante), color: '#fbbf24' },
              { label: 'Compradores', value: data.topCompradores.length, color: null },
              { label: 'Transacciones', value: data.totalCompras, color: null },
            ].map(({ label, value, color: c }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: c || 'white' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live feed */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
              Actividad en vivo
            </div>
            {compras.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{compras.length} compra{compras.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {compras.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
              Las compras aparecerán aquí en tiempo real
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {compras.slice(0, 12).map((c) => (
                <FeedItem key={c._id} compra={c} isNew={newIds.has(c._id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
