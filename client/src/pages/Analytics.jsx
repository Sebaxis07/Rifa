import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import socket from '../socket';

const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const formatDate = (d) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/* ── Circular progress ring ── */
function Ring({ pct, size = 140, stroke = 10, label }) {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const off   = ((100 - Math.min(pct, 100)) / 100) * circ;
  const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--white)';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.5s' }}
      />
      <text
        x={size/2} y={size/2 + 7}
        textAnchor="middle" fill="white"
        fontSize={size < 100 ? 13 : 19} fontWeight="800"
        fontFamily="Inter, sans-serif"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {pct}%
      </text>
      {label && (
        <text
          x={size/2} y={size/2 + 22}
          textAnchor="middle" fill="rgba(255,255,255,0.3)"
          fontSize={9} fontFamily="Inter, sans-serif"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/* ── Number heatmap ── */
function NumberHeatmap({ numeroMap, total = 41 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => i + 1).map(n => {
        const owner = numeroMap[n];
        return (
          <div
            key={n}
            title={owner ? `#${String(n).padStart(2,'0')} — ${owner}` : `#${String(n).padStart(2,'0')} — libre`}
            style={{
              aspectRatio: '1',
              borderRadius: 8,
              background: owner ? 'var(--white)' : 'var(--surface-3)',
              border: `1px solid ${owner ? 'var(--white)' : 'var(--border)'}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, transition: 'all 0.2s',
              cursor: owner ? 'default' : 'default',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: owner ? 'var(--bg)' : 'var(--white-20)', lineHeight: 1 }}>
              {String(n).padStart(2,'0')}
            </span>
            {owner && (
              <span style={{ fontSize: '0.42rem', color: 'rgba(0,0,0,0.5)', fontWeight: 600, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {owner}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Bar chart row ── */
function BarRow({ label, value, max, suffix = '', rank }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {rank !== undefined && (
        <span style={{ fontSize: '0.65rem', color: 'var(--white-20)', width: 20, textAlign: 'right', flexShrink: 0 }}>
          {rank + 1}
        </span>
      )}
      <div style={{ minWidth: 110, maxWidth: 110, fontSize: '0.78rem', color: 'var(--white-60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 24, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'var(--white)', borderRadius: 5,
          width: `${pct}%`, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: pct > 0 ? 32 : 0
        }}>
          {pct > 10 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--bg)', whiteSpace: 'nowrap' }}>{value} {suffix}</span>}
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--white-60)', minWidth: 60, textAlign: 'right' }}>
        {typeof value === 'number' && suffix === '' ? formatCLP(value) : `${value} ${suffix}`}
      </span>
    </div>
  );
}

/* ── KPI Card ── */
function KPI({ label, value, sub, accent, large }) {
  return (
    <div className="stat-card" style={{ borderColor: accent ? `${accent}30` : undefined }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: large ? '1.6rem' : '1.75rem', color: accent || 'var(--white)' }}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const { id } = useParams();
  const [data, setData]   = useState(null);
  const [rifa, setRifa]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = () =>
    Promise.all([
      axios.get(`${API}/api/analytics/${id}`),
      axios.get(`${API}/api/rifas/${id}`)
    ]).then(([a, r]) => { setData(a.data); setRifa(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchData();
    socket.connect();
    socket.emit('join_rifa', id);
    socket.on('compra_nueva',       () => fetchData());
    socket.on('compra_eliminada',   () => fetchData());
    socket.on('compra_actualizada', () => fetchData());
    return () => {
      socket.emit('leave_rifa', id);
      socket.off('compra_nueva'); socket.off('compra_eliminada'); socket.off('compra_actualizada');
      socket.disconnect();
    };
  }, [id]);

  if (loading) return (
    <div className="page" style={{ paddingTop: 80, textAlign: 'center' }}>
      <span className="animate-pulse" style={{ color: 'var(--white-30)', fontSize: '0.85rem' }}>Cargando analytics…</span>
    </div>
  );
  if (!data || !rifa) return null;

  const maxNums  = data.topCompradores[0]?.numeros.length || 1;
  const maxMonto = data.topCompradores[0]?.monto || 1;
  const maxDia   = Math.max(...Object.values(data.ventasPorDia || {}), 1);
  const pct      = data.porcentaje;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/">Rifas</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to={`/rifa/${id}`}>{rifa.nombre}</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Analytics</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label">Módulo de análisis</div>
            <h1>{rifa.nombre}</h1>
            <p style={{ marginTop: 4 }}>Premio: {rifa.nombrePremio}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/rifa/${id}/vista`} className="btn btn-ghost btn-sm" id="btn-vista-supervisor" target="_blank">
              Vista Supervisor
            </Link>
            <Link to={`/rifa/${id}`} className="btn btn-ghost btn-sm" id="btn-back">
              Ver Rifa
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'compradores', 'numeros', 'historial'].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {{ overview: 'Resumen', compradores: 'Compradores', numeros: 'Mapa de Números', historial: 'Historial' }[t]}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPIs fila 1 */}
          <div className="stats-grid">
            <KPI label="Avance" value={`${pct}%`} sub={`${data.totalVendidos} de ${data.totalNumeros} números`} accent={pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : null} />
            <KPI label="Recaudado" value={formatCLP(data.dineroRecaudado)} sub={`Meta: ${formatCLP(data.meta)}`} accent="var(--success)" large />
            <KPI label="Por Recaudar" value={formatCLP(data.dineroFaltante)} accent="var(--warning)" large />
            <KPI label="Días al Sorteo" value={data.diasHastaSorteo} sub={new Date(rifa.fechaSorteo).toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })} />
          </div>

          {/* KPIs fila 2 */}
          <div className="stats-grid">
            <KPI label="Vendidos" value={data.totalVendidos} sub={`${data.totalLibres} disponibles`} />
            <KPI label="Transacciones" value={data.totalCompras} />
            <KPI label="Velocidad" value={`${data.velocidadDiaria} / día`} sub="Números vendidos por día" />
            <KPI label="Proyección Cierre" value={data.diasHastaCompletar !== null ? `${data.diasHastaCompletar} días` : 'N/A'} sub="Al ritmo actual" />
            <KPI label="Compradores" value={data.topCompradores.length} />
            <KPI label="Ticket Promedio" value={formatCLP(data.ticketPromedio)} sub="Por comprador" large />
          </div>

          {/* Progress central + última actividad */}
          <div className="analytics-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Meta visual */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="section-label">Progreso hacia la meta</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <Ring pct={pct} size={130} stroke={10} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginBottom: 4 }}>RECAUDADO</div>
                    <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${(data.dineroRecaudado / data.meta) * 100}%`, background: 'var(--success)', borderRadius: 99, transition: 'width 1s' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--white-40)', marginTop: 4 }}>{formatCLP(data.dineroRecaudado)} / {formatCLP(data.meta)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginBottom: 4 }}>NÚMEROS VENDIDOS</div>
                    <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--white)', borderRadius: 99, transition: 'width 1s' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--white-40)', marginTop: 4 }}>{data.totalVendidos} / {data.totalNumeros}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actividad reciente */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 14 }}>Actividad Reciente</div>
              {data.compras.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px 0' }}>Sin actividad</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.compras.slice(0, 5).map((c, i) => (
                    <div key={c._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8, background: i === 0 ? 'var(--white-5)' : 'transparent',
                      border: i === 0 ? '1px solid var(--border-light)' : '1px solid transparent',
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--white-40)' }}>
                          {c.comprador.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.comprador}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--white-30)' }}>
                          {c.numeros.length} número(s) · {formatCLP(c.montoTotal)}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--white-20)', flexShrink: 0 }}>
                        {formatDate(c.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actividad por día */}
          {Object.keys(data.ventasPorDia).length > 0 && (
            <div className="card">
              <div className="section-label" style={{ marginBottom: 14 }}>Ventas por Día</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(data.ventasPorDia).map(([dia, qty]) => (
                  <BarRow key={dia} label={dia} value={qty} max={maxDia} suffix="nros." rank={undefined} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COMPRADORES ── */}
      {activeTab === 'compradores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.topCompradores.length === 0 ? (
            <div className="empty-state"><p>Sin compradores aún</p></div>
          ) : (
            <>
              <div className="analytics-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card">
                  <div className="section-label" style={{ marginBottom: 14 }}>Ranking por Números</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.topCompradores.map((c, i) => (
                      <BarRow key={c.nombre} label={c.nombre} value={c.numeros.length} max={maxNums} suffix="nros." rank={i} />
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="section-label" style={{ marginBottom: 14 }}>Ranking por Monto</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...data.topCompradores].sort((a,b) => b.monto - a.monto).map((c, i) => (
                      <div key={c.nombre} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--white-20)', width: 20, textAlign: 'right' }}>{i + 1}</span>
                        <div style={{ minWidth: 110, maxWidth: 110, fontSize: '0.78rem', color: 'var(--white-60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
                        <div style={{ flex: 1, height: 24, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--success)', borderRadius: 5, width: `${(c.monto / maxMonto) * 100}%`, display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: 8, transition: 'width 0.8s' }}>
                            {(c.monto / maxMonto) > 0.15 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--bg)', whiteSpace: 'nowrap' }}>{formatCLP(c.monto)}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', minWidth: 80, textAlign: 'right' }}>{formatCLP(c.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabla detalle */}
              <div className="card">
                <div className="section-label" style={{ marginBottom: 14 }}>Detalle por Comprador</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Comprador</th>
                        <th>Números</th>
                        <th>Cantidad</th>
                        <th>Monto Total</th>
                        <th>% del Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCompradores.map((c, i) => (
                        <tr key={c.nombre}>
                          <td style={{ color: 'var(--white-20)', fontSize: '0.75rem' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {c.numeros.sort((a,b)=>a-b).map(n => (
                                <span key={n} style={{ background: 'var(--white)', color: 'var(--bg)', padding: '1px 5px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 700 }}>
                                  {String(n).padStart(2,'0')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{c.numeros.length}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCLP(c.monto)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 60, height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
                                <div style={{ width: `${(c.numeros.length / data.totalNumeros) * 100}%`, height: '100%', background: 'var(--white)', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--white-40)' }}>
                                {((c.numeros.length / data.totalNumeros) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: MAPA DE NÚMEROS ── */}
      {activeTab === 'numeros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div className="section-label">Mapa completo — 41 números</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--white)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Vendido ({data.totalVendidos})</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--surface-3)', border: '1px solid var(--border)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Libre ({data.totalLibres})</span>
                </div>
              </div>
            </div>
            <NumberHeatmap numeroMap={data.numeroMap} total={41} />
          </div>

          {/* Números libres agrupados */}
          {data.totalLibres > 0 && (
            <div className="card">
              <div className="section-label" style={{ marginBottom: 12 }}>Números disponibles</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 41 }, (_, i) => i + 1)
                  .filter(n => !data.numeroMap[n])
                  .map(n => (
                    <span key={n} style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)', color: 'var(--white-60)', padding: '5px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                      {String(n).padStart(2,'0')}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: HISTORIAL ── */}
      {activeTab === 'historial' && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>Historial Completo de Compras</div>
          {data.compras.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}><p>Sin compras</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Comprador</th>
                    <th>Números</th>
                    <th>Cant.</th>
                    <th>Monto</th>
                    <th>Fecha</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {data.compras.map((c, i) => (
                    <tr key={c._id}>
                      <td style={{ color: 'var(--white-20)', fontSize: '0.72rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{c.comprador}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {c.numeros.sort((a,b)=>a-b).map(n => (
                            <span key={n} style={{ background: 'var(--white)', color: 'var(--bg)', padding: '1px 5px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 700 }}>
                              {String(n).padStart(2,'0')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: 'var(--white-60)' }}>{c.numeros.length}</td>
                      <td style={{ fontWeight: 700 }}>{formatCLP(c.montoTotal)}</td>
                      <td style={{ color: 'var(--white-30)', fontSize: '0.78rem' }}>{formatDate(c.createdAt)}</td>
                      <td style={{ color: 'var(--white-30)', fontSize: '0.78rem' }}>{c.nota || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .analytics-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
