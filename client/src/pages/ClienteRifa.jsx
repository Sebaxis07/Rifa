import { useState, useEffect, useRef } from 'react';
import './ClienteRifa.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TRANSFER_DATA = {
  nombre: 'SEBASTIAN IGNACIO VASQUEZ',
  rut: '21.661.083-0',
  banco: 'Banco Bci',
  tipoCuenta: 'Cuenta Corriente',
  numeroCuenta: '72579862',
  email: 'DPASTORA98@GMAIL.COM',
};

export default function ClienteRifa() {
  const [rifa, setRifa] = useState(null);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState('seleccion'); // 'seleccion' | 'datos' | 'transferencia' | 'confirmado'
  const [nombre, setNombre] = useState('');
  const [nombreError, setNombreError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [compraResult, setCompraResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    fetchRifaActiva();
  }, []);

  async function fetchRifaActiva() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/rifas`);
      const rifas = await res.json();
      const activa = rifas.find(r => r.estado === 'activa');
      if (!activa) {
        setError('No hay ninguna rifa activa en este momento.');
        setLoading(false);
        return;
      }
      setRifa(activa);
      const comprasRes = await fetch(`${API}/api/compras/${activa._id}`);
      const comprasData = await comprasRes.json();
      setCompras(comprasData);
    } catch {
      setError('Error al cargar la rifa. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const numerosOcupados = compras.flatMap(c => c.numeros);
  const totalNumeros = rifa?.totalNumeros || 41;
  const nums = Array.from({ length: totalNumeros }, (_, i) => i + 1);

  function toggleNum(n) {
    if (numerosOcupados.includes(n)) return;
    setSelected(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  }

  function handleContinuar() {
    if (selected.length === 0) return;
    setStep('datos');
    setNombre('');
    setNombreError('');
  }

  function handleConfirmarDatos() {
    if (!nombre.trim()) {
      setNombreError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (nombre.trim().length < 4) {
      setNombreError('El nombre debe tener al menos 4 caracteres.');
      return;
    }
    setStep('transferencia');
  }

  async function handleConfirmarTransferencia() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/compras/publico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rifaId: rifa._id,
          comprador: nombre.trim(),
          numeros: selected,
          nota: 'Compra pública — pendiente de verificación',
          transferido: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Error al registrar. Intenta de nuevo.');
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setCompraResult(data);
      setStep('confirmado');
      // Reload purchases to reflect taken numbers
      const comprasRes = await fetch(`${API}/api/compras/${rifa._id}`);
      setCompras(await comprasRes.json());
      setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNuevaCompra() {
    setSelected([]);
    setNombre('');
    setStep('seleccion');
    setCompraResult(null);
  }

  async function copyText(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // fallback silently
    }
  }

  const montoTotal = rifa ? selected.length * rifa.precioPorNumero : 0;
  const libres = nums.filter(n => !numerosOcupados.includes(n)).length;
  const pct = rifa ? Math.round((numerosOcupados.length / totalNumeros) * 100) : 0;

  // ── LOADING ──────────────────────────────────────
  if (loading) {
    return (
      <div className="cliente-root">
        <div className="cliente-loading">
          <div className="cliente-spinner" />
          <p>Cargando rifa…</p>
        </div>
      </div>
    );
  }

  // ── ERROR / NO RIFA ───────────────────────────────
  if (error || !rifa) {
    return (
      <div className="cliente-root">
        <div className="cliente-empty">
          <div className="cliente-empty-icon">🎟️</div>
          <h2>{error || 'Sin rifa activa'}</h2>
          <p>Vuelve a intentarlo más tarde o contáctanos.</p>
        </div>
      </div>
    );
  }

  // ── CONFIRMADO ────────────────────────────────────
  if (step === 'confirmado') {
    return (
      <div className="cliente-root" ref={confirmRef}>
        <header className="cliente-header">
          <div className="cliente-brand">🎟️ <span>RifaSystem</span></div>
        </header>

        <div className="cliente-confirm-wrap">
          <div className="cliente-confirm-card">
            <div className="cliente-confirm-icon">✅</div>
            <h1>¡Números reservados!</h1>
            <p className="cliente-confirm-sub">
              Tu solicitud fue registrada. Una vez que realices la transferencia y sea verificada, tus números quedarán confirmados.
            </p>

            <div className="cliente-confirm-nums">
              {compraResult?.numeros?.map(n => (
                <span key={n} className="cliente-confirm-num">{String(n).padStart(2, '0')}</span>
              ))}
            </div>

            <div className="cliente-confirm-detail">
              <div className="cliente-confirm-row">
                <span>Comprador</span><strong>{compraResult?.comprador}</strong>
              </div>
              <div className="cliente-confirm-row">
                <span>Números</span><strong>{compraResult?.numeros?.length}</strong>
              </div>
              <div className="cliente-confirm-row">
                <span>Total a pagar</span>
                <strong className="cliente-confirm-total">
                  ${compraResult?.montoTotal?.toLocaleString('es-CL')}
                </strong>
              </div>
            </div>

            <div className="cliente-confirm-reminder">
              <span>⚠️</span>
              <p>Recuerda transferir exactamente <strong>${compraResult?.montoTotal?.toLocaleString('es-CL')}</strong> a los datos bancarios enviados y guardar tu comprobante.</p>
            </div>

            <button className="cliente-btn-primary" onClick={handleNuevaCompra}>
              Comprar más números
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN ──────────────────────────────────────────
  return (
    <div className="cliente-root">
      {/* Header */}
      <header className="cliente-header">
        <div className="cliente-brand">🎟️ <span>RifaSystem</span></div>
        <div className="cliente-header-badge">Vista pública</div>
      </header>

      {/* Contenedor centrado */}
      <div className="cliente-page-wrap">

      {/* Hero de la rifa */}
      <section className="cliente-hero">
        {rifa.imagenPremio ? (
          <div className="cliente-hero-img-wrap">
            <img
              src={`${API}${rifa.imagenPremio}`}
              alt={rifa.nombrePremio}
              className="cliente-hero-img"
            />
            <div className="cliente-hero-img-overlay" />
          </div>
        ) : (
          <div className="cliente-hero-no-img">🏆</div>
        )}

        <div className="cliente-hero-content">
          <div className="cliente-hero-pill">🟢 Rifa activa</div>
          <h1 className="cliente-hero-title">{rifa.nombre}</h1>
          <p className="cliente-hero-prize">Premio: <strong>{rifa.nombrePremio}</strong></p>

          <div className="cliente-hero-stats">
            <div className="cliente-stat">
              <span className="cliente-stat-val">${rifa.precioPorNumero?.toLocaleString('es-CL')}</span>
              <span className="cliente-stat-label">por número</span>
            </div>
            <div className="cliente-stat-divider" />
            <div className="cliente-stat">
              <span className="cliente-stat-val">{libres}</span>
              <span className="cliente-stat-label">disponibles</span>
            </div>
            <div className="cliente-stat-divider" />
            <div className="cliente-stat">
              <span className="cliente-stat-val">{numerosOcupados.length}</span>
              <span className="cliente-stat-label">vendidos</span>
            </div>
          </div>

          <div className="cliente-progress-wrap">
            <div className="cliente-progress-bar">
              <div className="cliente-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="cliente-progress-pct">{pct}% vendido</span>
          </div>

          <p className="cliente-hero-date">
            📅 Sorteo: <strong>{new Date(rifa.fechaSorteo).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
          </p>
        </div>
      </section>

      {/* Leyenda */}
      <div className="cliente-legend">
        <span className="cliente-legend-item">
          <span className="cliente-legend-dot libre" />Disponible
        </span>
        <span className="cliente-legend-item">
          <span className="cliente-legend-dot vendido" />Vendido
        </span>
        <span className="cliente-legend-item">
          <span className="cliente-legend-dot seleccionado" />Seleccionado
        </span>
      </div>

      {/* Grilla de números */}
      <section className="cliente-grid-section">
        <div className="cliente-nums-grid">
          {nums.map(n => {
            const ocupado = numerosOcupados.includes(n);
            const sel = selected.includes(n);
            return (
              <button
                key={n}
                className={`cliente-num-cell${ocupado ? ' vendido' : sel ? ' seleccionado' : ' libre'}`}
                onClick={() => toggleNum(n)}
                disabled={ocupado}
                title={ocupado ? 'Número vendido' : sel ? 'Click para deseleccionar' : 'Click para seleccionar'}
              >
                <span className="cliente-num-label">{String(n).padStart(2, '0')}</span>
                {ocupado && <span className="cliente-num-sub">🔒</span>}
                {sel && <span className="cliente-num-sub">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      </div>{/* fin cliente-page-wrap */}

      {/* Barra flotante de selección */}
      {selected.length > 0 && step === 'seleccion' && (
        <div className="cliente-float-bar">
          <div className="cliente-float-info">
            <span className="cliente-float-nums">
              {selected.sort((a,b)=>a-b).map(n => String(n).padStart(2,'0')).join(', ')}
            </span>
            <span className="cliente-float-total">
              Total: <strong>${montoTotal.toLocaleString('es-CL')}</strong>
            </span>
          </div>
          <div className="cliente-float-actions">
            <button className="cliente-btn-ghost-sm" onClick={() => setSelected([])}>Limpiar</button>
            <button className="cliente-btn-cta" onClick={handleContinuar}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* PASO: Datos del comprador */}
      {step === 'datos' && (
        <div className="cliente-overlay">
          <div className="cliente-modal">
            <button className="cliente-modal-close" onClick={() => setStep('seleccion')}>✕</button>
            <div className="cliente-modal-icon">👤</div>
            <h2>¿Quién compra?</h2>
            <p>Ingresa tu nombre completo para registrar tu compra.</p>

            <div className="cliente-modal-nums-preview">
              {selected.sort((a,b)=>a-b).map(n => (
                <span key={n} className="cliente-preview-num">{String(n).padStart(2,'0')}</span>
              ))}
            </div>

            <div className="cliente-form-group">
              <label className="cliente-form-label">Nombre completo</label>
              <input
                id="input-nombre"
                type="text"
                className={`cliente-form-input${nombreError ? ' error' : ''}`}
                placeholder="Ej: María González"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setNombreError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleConfirmarDatos()}
                autoFocus
              />
              {nombreError && <span className="cliente-form-error">{nombreError}</span>}
            </div>

            <div className="cliente-modal-summary">
              <div className="cliente-modal-sum-row">
                <span>Números seleccionados</span>
                <strong>{selected.length}</strong>
              </div>
              <div className="cliente-modal-sum-row">
                <span>Precio por número</span>
                <strong>${rifa.precioPorNumero?.toLocaleString('es-CL')}</strong>
              </div>
              <div className="cliente-modal-sum-row total">
                <span>Total a pagar</span>
                <strong>${montoTotal.toLocaleString('es-CL')}</strong>
              </div>
            </div>

            <button className="cliente-btn-primary full" onClick={handleConfirmarDatos}>
              Ver datos de transferencia →
            </button>
          </div>
        </div>
      )}

      {/* PASO: Datos de transferencia */}
      {step === 'transferencia' && (
        <div className="cliente-overlay">
          <div className="cliente-modal cliente-modal-transfer">
            <button className="cliente-modal-close" onClick={() => setStep('datos')}>✕</button>
            <div className="cliente-modal-icon">🏦</div>
            <h2>Datos de transferencia</h2>
            <p>Transfiere exactamente <strong>${montoTotal.toLocaleString('es-CL')}</strong> a la siguiente cuenta:</p>

            <div className="cliente-transfer-card">
              {[
                { label: 'Titular', value: TRANSFER_DATA.nombre, field: 'nombre' },
                { label: 'RUT', value: TRANSFER_DATA.rut, field: 'rut' },
                { label: 'Banco', value: TRANSFER_DATA.banco, field: 'banco' },
                { label: 'Tipo de cuenta', value: TRANSFER_DATA.tipoCuenta, field: 'tipo' },
                { label: 'Número de cuenta', value: TRANSFER_DATA.numeroCuenta, field: 'cuenta' },
                { label: 'Email', value: TRANSFER_DATA.email, field: 'email' },
              ].map(({ label, value, field }) => (
                <div key={field} className="cliente-transfer-row">
                  <div className="cliente-transfer-info">
                    <span className="cliente-transfer-label">{label}</span>
                    <span className="cliente-transfer-value">{value}</span>
                  </div>
                  <button
                    className={`cliente-copy-btn${copiedField === field ? ' copied' : ''}`}
                    onClick={() => copyText(value, field)}
                    title="Copiar"
                  >
                    {copiedField === field ? '✓' : '⧉'}
                  </button>
                </div>
              ))}
            </div>

            <div className="cliente-transfer-amount">
              <span>Monto exacto a transferir</span>
              <div className="cliente-transfer-amount-val">
                ${montoTotal.toLocaleString('es-CL')}
                <button
                  className={`cliente-copy-btn${copiedField === 'monto' ? ' copied' : ''}`}
                  onClick={() => copyText(String(montoTotal), 'monto')}
                >
                  {copiedField === 'monto' ? '✓' : '⧉'}
                </button>
              </div>
            </div>

            <div className="cliente-transfer-warning">
              <span>⚠️</span>
              <p>Una vez realizada la transferencia, nuestro equipo verificará el pago y confirmará tus números. Guarda el comprobante.</p>
            </div>

            <div className="cliente-transfer-nums-preview">
              <span>Tus números:</span>
              <div>
                {selected.sort((a,b)=>a-b).map(n => (
                  <span key={n} className="cliente-preview-num">{String(n).padStart(2,'0')}</span>
                ))}
              </div>
            </div>

            <button
              className="cliente-btn-primary full"
              onClick={handleConfirmarTransferencia}
              disabled={submitting}
            >
              {submitting ? 'Registrando…' : '✓ Ya transferí — Confirmar reserva'}
            </button>

            <p className="cliente-transfer-footnote">
              Al confirmar, tus números quedan en estado <em>pendiente</em> hasta validar el pago.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
