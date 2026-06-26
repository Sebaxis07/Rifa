import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const formatCLP  = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const formatDate = (d) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatDateShort = (d) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

export default function Comprobante() {
  const { id } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const ticketRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/api/compras/comprobante/${id}`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.message || 'Comprobante no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.08)',
          borderTopColor: 'rgba(255,255,255,0.6)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>Cargando comprobante…</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: '3rem' }}>🎟️</div>
      <h2 style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Comprobante no encontrado</h2>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', margin: 0 }}>{error}</p>
      <Link to="/" style={{ marginTop: 8, padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.82rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        Ir al inicio
      </Link>
    </div>
  );

  const { compra, rifa } = data;
  const esGanador    = rifa.estado === 'sorteada';
  const numerosStr   = compra.numeros.sort((a, b) => a - b).map(n => String(n).padStart(2, '0')).join('  ·  ');
  const fechaCompra  = formatDate(compra.createdAt);
  const fechaSorteo  = formatDateShort(rifa.fechaSorteo);
  const idCorto      = compra._id.toString().slice(-8).toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', sans-serif;
          background: #080808;
          color: #fff;
          min-height: 100vh;
        }

        .comp-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          background: radial-gradient(ellipse at 50% -10%, rgba(255,255,255,0.04) 0%, transparent 60%),
                      #080808;
        }

        .comp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 5px 14px;
          border-radius: 99px;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 28px;
        }

        .ticket {
          width: 100%;
          max-width: 520px;
          background: #111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03) inset;
          position: relative;
        }

        .ticket::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        }

        .ticket-header {
          padding: 32px 36px 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }

        .ticket-header::after {
          content: '🎟️';
          position: absolute;
          right: -10px; top: -10px;
          font-size: 100px;
          opacity: 0.04;
          transform: rotate(-15deg);
        }

        .ticket-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .ticket-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 12px rgba(255,255,255,0.5);
        }

        .ticket-brand-name {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
        }

        .ticket-rifa-name {
          font-size: clamp(1.3rem, 4vw, 1.8rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 6px;
        }

        .ticket-premio {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }

        .ticket-body {
          padding: 28px 36px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ticket-section-label {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: 8px;
        }

        .ticket-comprador {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
        }

        .ticket-numeros {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px;
        }

        .ticket-numeros-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .ticket-numero {
          background: #fff;
          color: #000;
          padding: 6px 12px;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(255,255,255,0.15);
          transition: transform 0.15s;
        }

        .ticket-numero:hover { transform: translateY(-2px); }

        .ticket-divider {
          border: none;
          border-top: 1px dashed rgba(255,255,255,0.07);
        }

        .ticket-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ticket-row-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }

        .ticket-row-value {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.8);
          font-weight: 600;
          text-align: right;
        }

        .ticket-monto {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.05em;
          color: #fff;
        }

        .ticket-estado-pagado {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.25);
          color: #34d399;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .ticket-estado-pendiente {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.25);
          color: #fbbf24;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .ticket-footer {
          padding: 20px 36px;
          background: rgba(255,255,255,0.015);
          border-top: 1px dashed rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ticket-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.1em;
        }

        .ticket-sorteo-info {
          text-align: right;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
        }

        .ganador-banner {
          background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.06));
          border: 1px solid rgba(255,215,0,0.25);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.08); }
          50% { box-shadow: 0 0 40px rgba(255,215,0,0.18); }
        }

        .comp-actions {
          display: flex;
          gap: 10px;
          margin-top: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .comp-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
          border: none;
          text-decoration: none;
        }

        .comp-btn-primary {
          background: #fff;
          color: #000;
        }
        .comp-btn-primary:hover { background: rgba(255,255,255,0.9); transform: translateY(-1px); }

        .comp-btn-ghost {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .comp-btn-ghost:hover { background: rgba(255,255,255,0.08); transform: translateY(-1px); }

        .comp-legal {
          margin-top: 20px;
          font-size: 0.68rem;
          color: rgba(255,255,255,0.15);
          text-align: center;
          max-width: 400px;
          line-height: 1.6;
        }

        @media print {
          body { background: #fff; color: #000; }
          .comp-page { background: #fff; padding: 0; justify-content: flex-start; }
          .comp-badge, .comp-actions, .comp-legal { display: none; }
          .ticket {
            border: 2px solid #ddd; border-radius: 16px;
            box-shadow: none; max-width: 100%;
            background: #fff; color: #000;
          }
          .ticket-brand-name, .ticket-premio, .ticket-row-label,
          .ticket-section-label, .ticket-sorteo-info, .ticket-id { color: #666; }
          .ticket-rifa-name, .ticket-comprador, .ticket-monto,
          .ticket-row-value { color: #000; }
          .ticket-numero { background: #000; color: #fff; }
          .ticket-numeros { background: #f5f5f5; border-color: #ddd; }
          .ticket-footer { background: #f9f9f9; }
        }

        @media (max-width: 560px) {
          .ticket-header, .ticket-body, .ticket-footer { padding-left: 20px; padding-right: 20px; }
          .ticket { border-radius: 16px; }
        }
      `}</style>

      <div className="comp-page">
        <div className="comp-badge">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
          Comprobante oficial · RifaSystem
        </div>

        <div className="ticket" ref={ticketRef}>
          {/* Header */}
          <div className="ticket-header">
            <div className="ticket-brand">
              <div className="ticket-brand-dot" />
              <span className="ticket-brand-name">RifaSystem</span>
            </div>
            <div className="ticket-rifa-name">{rifa.nombre}</div>
            <div className="ticket-premio">Premio: {rifa.nombrePremio}</div>
          </div>

          {/* Body */}
          <div className="ticket-body">
            {/* Banner ganador */}
            {esGanador && (
              <div className="ganador-banner">
                <span style={{ fontSize: '2rem' }}>🏆</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fcd34d', marginBottom: 2 }}>
                    ¡Esta rifa ya fue sorteada!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    Revisa los resultados oficiales con el organizador.
                  </div>
                </div>
              </div>
            )}

            {/* Comprador */}
            <div>
              <div className="ticket-section-label">Participante</div>
              <div className="ticket-comprador">{compra.comprador}</div>
            </div>

            <hr className="ticket-divider" />

            {/* Números */}
            <div className="ticket-numeros">
              <div className="ticket-section-label">
                {compra.numeros.length === 1 ? 'Número adquirido' : `Números adquiridos (${compra.numeros.length})`}
              </div>
              <div className="ticket-numeros-grid">
                {compra.numeros.sort((a, b) => a - b).map(n => (
                  <div key={n} className="ticket-numero">{String(n).padStart(2, '0')}</div>
                ))}
              </div>
            </div>

            <hr className="ticket-divider" />

            {/* Monto y estado */}
            <div>
              <div className="ticket-section-label">Monto pagado</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                <div className="ticket-monto">{formatCLP(compra.montoTotal)}</div>
                {compra.transferido
                  ? <div className="ticket-estado-pagado">✅ Pago verificado</div>
                  : <div className="ticket-estado-pendiente">⏳ Pago pendiente</div>
                }
              </div>
            </div>

            <hr className="ticket-divider" />

            {/* Detalles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="ticket-row">
                <span className="ticket-row-label">Fecha de compra</span>
                <span className="ticket-row-value">{fechaCompra}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-row-label">Precio por número</span>
                <span className="ticket-row-value">{formatCLP(rifa.precioPorNumero)}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-row-label">Estado del sorteo</span>
                <span className="ticket-row-value" style={{
                  color: rifa.estado === 'activa' ? '#34d399' : rifa.estado === 'sorteada' ? '#fbbf24' : 'rgba(255,255,255,0.5)'
                }}>
                  {rifa.estado.charAt(0).toUpperCase() + rifa.estado.slice(1)}
                </span>
              </div>
              {compra.nota && (
                <div className="ticket-row">
                  <span className="ticket-row-label">Nota</span>
                  <span className="ticket-row-value" style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>{compra.nota}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ticket-footer">
            <div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ID Comprobante</div>
              <div className="ticket-id">#{idCorto}</div>
            </div>
            <div className="ticket-sorteo-info">
              <div>Fecha de sorteo</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginTop: 2 }}>{fechaSorteo}</div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="comp-actions no-print">
          <button className="comp-btn comp-btn-primary" onClick={handlePrint}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
              <path d="M4 4V2h8v2" /><rect x="1" y="4" width="14" height="8" rx="1" />
              <path d="M4 12v2h8v-2" /><circle cx="12" cy="8" r="0.8" fill="currentColor" />
            </svg>
            Imprimir comprobante
          </button>
          <Link to={`/rifa/${rifa._id}`} className="comp-btn comp-btn-ghost">
            Ver rifa completa →
          </Link>
        </div>

        <p className="comp-legal no-print">
          Este comprobante es válido como constancia de participación. Guárdalo para acreditar tu compra ante el organizador.
        </p>
      </div>
    </>
  );
}
