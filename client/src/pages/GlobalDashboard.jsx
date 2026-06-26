import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const formatDate = (d) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function KPI({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent ? accent + '22' : 'var(--border)'}`,
      borderRadius: 16,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'border-color 0.18s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white-30)' }}>{label}</span>
        {icon && <span style={{ fontSize: '1rem', opacity: 0.6 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, color: accent || 'var(--white)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--white-30)', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function AlertRow({ label, rifaNombre, rifaId, monto, createdAt, tipo }) {
  const color = tipo === 'vencido' ? '#f87171' : '#fbbf24';
  const bg    = tipo === 'vencido' ? 'rgba(239,68,68,0.06)' : 'rgba(251,191,36,0.06)';
  const daysAgo = Math.floor((Date.now() - new Date(createdAt).getTime()) / (24*60*60*1000));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: bg, border: `1px solid ${color}22` }}>
      <span style={{ fontSize: '1rem' }}>{tipo === 'vencido' ? '⚠️' : '⏰'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white-80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginTop: 1 }}>
          {rifaNombre} · {formatCLP(monto)} · hace {daysAgo}d
        </div>
      </div>
      <Link to={`/rifa/${rifaId}`} style={{ fontSize: '0.68rem', color, fontWeight: 600, textDecoration: 'none', flexShrink: 0, padding: '3px 8px', borderRadius: 6, border: `1px solid ${color}33`, background: `${color}11` }}>
        Ver →
      </Link>
    </div>
  );
}

function RifaProgressRow({ rifa }) {
  const pct = rifa.porcentaje;
  const color = pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--white)';
  const diasLabel = rifa.diasAlSorteo > 0
    ? `en ${rifa.diasAlSorteo}d`
    : rifa.diasAlSorteo === 0 ? 'hoy' : `hace ${Math.abs(rifa.diasAlSorteo)}d`;

  return (
    <Link to={`/rifa/${rifa._id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white-80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rifa.nombre}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginTop: 2 }}>{rifa.nombrePremio}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>
              {rifa.numerosVendidos}/{rifa.totalNumeros}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--white-25)' }}>Sorteo {diasLabel}</span>
          </div>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--white-30)' }}>{formatCLP(rifa.recaudado)} recaudado</span>
          {rifa.pendientesVenc > 0 && (
            <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 600 }}>⚠ {rifa.pendientesVenc} vencido{rifa.pendientesVenc > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function GlobalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    axios.get(`${API}/api/dashboard/global`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page" style={{ paddingTop: 80, textAlign: 'center' }}>
      <span className="animate-pulse" style={{ color: 'var(--white-30)', fontSize: '0.85rem' }}>Cargando resumen global…</span>
    </div>
  );

  if (!data) return null;

  const tasaVerificacion = data.totalRecaudado > 0
    ? ((data.totalVerificado / data.totalRecaudado) * 100).toFixed(1)
    : '0.0';

  const rifasActivas = data.resumenRifas.filter(r => r.estado === 'activa');
  const rifasCerradas = data.resumenRifas.filter(r => r.estado !== 'activa');
  const totalAlertas = data.alertasVencidas.length + data.alertasPorVencer.length;

  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label">Panel de control</div>
            <h1>Resumen Global</h1>
            <p style={{ marginTop: 4, color: 'var(--white-40)', fontSize: '0.85rem' }}>
              {data.totalRifas} rifa{data.totalRifas !== 1 ? 's' : ''} · {data.rifasActivas} activa{data.rifasActivas !== 1 ? 's' : ''}
            </p>
          </div>
          {totalAlertas > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, fontSize: '0.78rem', fontWeight: 600, color: '#f87171'
            }}>
              ⚠️ {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''} de pago
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="Total Recaudado"   value={formatCLP(data.totalRecaudado)}   accent="var(--success)" icon="💰" />
        <KPI label="Verificado"        value={formatCLP(data.totalVerificado)}   accent="var(--success)" icon="✅"
             sub={`${tasaVerificacion}% verificado`} />
        <KPI label="Pendiente"         value={formatCLP(data.totalPendiente)}    accent="var(--warning)"  icon="⏳" />
        <KPI label="Rifas Activas"     value={data.rifasActivas}                 icon="🎟️"
             sub={`${data.rifasSorteadas} sorteadas`} />
        <KPI label="Total Compras"     value={data.totalCompras}                 icon="🛒" />
        <KPI label="Compradores Únicos" value={data.topCompradores.length}       icon="👥" />
      </div>

      {/* Barra de verificación global */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--white-30)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tasa de verificación global
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--success)' }}>{tasaVerificacion}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${tasaVerificacion}%`, background: 'linear-gradient(90deg, var(--success), #6ee7b7)', borderRadius: 99, transition: 'width 1s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--white-30)' }}>Verificado: {formatCLP(data.totalVerificado)}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--white-30)' }}>Pendiente: {formatCLP(data.totalPendiente)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'overview',    label: 'Rifas Activas', count: rifasActivas.length },
          { key: 'alertas',     label: 'Alertas', count: totalAlertas },
          { key: 'compradores', label: 'Top Compradores' },
          { key: 'actividad',   label: 'Actividad Reciente' },
          { key: 'historial',   label: 'Historial', count: rifasCerradas.length },
        ].map(({ key, label, count }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
            {count != null && count > 0 && (
              <span style={{ marginLeft: 6, background: key === 'alertas' ? 'rgba(239,68,68,0.2)' : 'var(--surface-3)', color: key === 'alertas' ? '#f87171' : 'var(--white-40)', fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: RIFAS ACTIVAS ── */}
      {tab === 'overview' && (
        rifasActivas.length === 0 ? (
          <div className="empty-state">
            <h3>Sin rifas activas</h3>
            <p>Todas las rifas están cerradas o sorteadas</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {rifasActivas.map(r => <RifaProgressRow key={r._id} rifa={r} />)}
          </div>
        )
      )}

      {/* ── TAB: ALERTAS ── */}
      {tab === 'alertas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {data.alertasVencidas.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ⚠️ Pagos Vencidos ({data.alertasVencidas.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.alertasVencidas.map(a => (
                  <AlertRow key={a._id} label={a.comprador} rifaNombre={a.rifaNombre} rifaId={a.rifaId} monto={a.montoTotal} createdAt={a.createdAt} tipo="vencido" />
                ))}
              </div>
            </div>
          )}
          {data.alertasPorVencer.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ⏰ Por Vencer en 24h ({data.alertasPorVencer.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.alertasPorVencer.map(a => (
                  <AlertRow key={a._id} label={a.comprador} rifaNombre={a.rifaNombre} rifaId={a.rifaId} monto={a.montoTotal} createdAt={a.createdAt} tipo="porvencer" />
                ))}
              </div>
            </div>
          )}
          {totalAlertas === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎉</div>
              <h3>¡Todo al día!</h3>
              <p>No hay alertas de transferencias pendientes</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: TOP COMPRADORES ── */}
      {tab === 'compradores' && (
        data.topCompradores.length === 0 ? (
          <div className="empty-state"><h3>Sin compradores aún</h3></div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Comprador', 'Compras', 'Números', 'Total invertido'].map(h => (
                    <th key={h} style={{ padding: '12px 18px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--white-25)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topCompradores.map((c, i) => (
                  <tr key={c.nombre} style={{ borderBottom: i < data.topCompradores.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 18px', color: 'var(--white-20)', fontSize: '0.72rem' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--white-80)' }}>{c.nombre}</td>
                    <td style={{ padding: '12px 18px', color: 'var(--white-40)' }}>{c.compras}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 700 }}>{c.totalNumeros}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--success)' }}>{formatCLP(c.totalMonto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── TAB: ACTIVIDAD RECIENTE ── */}
      {tab === 'actividad' && (
        data.actividadReciente.length === 0 ? (
          <div className="empty-state"><h3>Sin actividad aún</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.actividadReciente.map((c) => (
              <div key={c._id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                  {c.comprador.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.comprador}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginTop: 1 }}>
                    {c.numeros.length} número{c.numeros.length > 1 ? 's' : ''} · {c.rifaNombre}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{formatCLP(c.montoTotal)}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--white-25)', marginTop: 2 }}>{formatDate(c.createdAt)}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {c.transferido
                    ? <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>✅ Pagado</span>
                    : <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700 }}>⏳ Pendiente</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TAB: HISTORIAL ── */}
      {tab === 'historial' && (
        rifasCerradas.length === 0 ? (
          <div className="empty-state"><h3>Sin rifas finalizadas</h3></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {rifasCerradas.map(r => <RifaProgressRow key={r._id} rifa={r} />)}
          </div>
        )
      )}
    </div>
  );
}
