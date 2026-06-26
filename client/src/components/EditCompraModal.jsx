import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, getToken } from '../context/AuthContext';

const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

export default function EditCompraModal({ compra, todasCompras, precioPorNumero, onClose, onSuccess }) {
  const [comprador, setComprador] = useState(compra.comprador);
  const [nota, setNota]           = useState(compra.nota || '');
  const [numeros, setNumeros]     = useState([...compra.numeros]);
  const [loading, setLoading]     = useState(false);
  const [transferido, setTransferido] = useState(compra.transferido || false);

  // Números ocupados por OTRAS compras
  const ocupadosPorOtros = todasCompras
    .filter(c => c._id !== compra._id)
    .flatMap(c => c.numeros);

  const toggleNum = (n) => {
    setNumeros(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };

  const total = numeros.length * precioPorNumero;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comprador.trim()) return toast.error('Ingresa el nombre del comprador');
    if (numeros.length === 0) return toast.error('Debe haber al menos un número');

    setLoading(true);
    try {
      await axios.put(`${API}/api/compras/${compra._id}`,
        { comprador: comprador.trim(), numeros, nota, transferido },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success('Compra actualizada');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Editar Compra</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--white-30)', marginTop: 2 }}>
              {numeros.length} número(s) · {formatCLP(total)}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" id="btn-close-edit-modal" onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre del Comprador</label>
            <input
              id="edit-input-comprador"
              className="form-input"
              value={comprador}
              onChange={e => setComprador(e.target.value)}
              placeholder="Nombre del comprador"
            />
          </div>

          {/* Selector de números */}
          <div className="form-group">
            <label className="form-label">
              Números asignados
              <span style={{ color: 'var(--white-20)', fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
                — clic para agregar o quitar
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 5 }}>
              {Array.from({ length: 41 }, (_, i) => i + 1).map(num => {
                const deOtro    = ocupadosPorOtros.includes(num);
                const seleccionado = numeros.includes(num);
                const esPropio  = compra.numeros.includes(num);

                let bg, border, color, cursor;
                if (deOtro) {
                  // Tomado por otro — bloqueado, gris muy oscuro
                  bg = 'var(--surface-2)'; border = '1px solid var(--border)';
                  color = 'var(--white-10)'; cursor = 'not-allowed';
                } else if (seleccionado) {
                  // Seleccionado (mío actual)
                  bg = 'var(--white)'; border = '1px solid var(--white)';
                  color = 'var(--bg)'; cursor = 'pointer';
                } else {
                  // Libre, puedo agregarlo
                  bg = 'var(--surface-3)'; border = '1px solid var(--border-light)';
                  color = 'var(--white-40)'; cursor = 'pointer';
                }

                return (
                  <button
                    key={num}
                    type="button"
                    id={`edit-num-${num}`}
                    disabled={deOtro}
                    onClick={() => !deOtro && toggleNum(num)}
                    title={deOtro ? 'Pertenece a otro comprador' : seleccionado ? 'Clic para quitar' : 'Clic para agregar'}
                    style={{
                      padding: '7px 2px', borderRadius: 6,
                      background: bg, border, color,
                      fontSize: '0.72rem', fontWeight: 700, cursor,
                      fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.12s',
                      position: 'relative',
                    }}
                  >
                    {String(num).padStart(2, '0')}
                    {/* Indicador: era de este comprador originalmente */}
                    {esPropio && !seleccionado && (
                      <span style={{
                        position: 'absolute', top: 2, right: 2,
                        width: 4, height: 4, borderRadius: '50%',
                        background: 'var(--warning)', opacity: 0.7
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { color: 'var(--white)', label: 'Asignado' },
                { color: 'var(--surface-3)', label: 'Disponible', border: '1px solid var(--border-light)' },
                { color: 'var(--white-10)', label: 'De otro' },
              ].map(({ color, label, border }) => (
                <div key={label} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: border || 'none', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--white-30)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div className="form-group">
            <label className="form-label">Nota</label>
            <input
              id="edit-input-nota"
              className="form-input"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Ej: Pagó en efectivo"
            />
          </div>

          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            marginBottom: 12,
            transition: 'border-color 0.2s',
            borderColor: transferido ? 'rgba(52, 211, 153, 0.3)' : 'var(--border)'
          }}>
            <div>
              <label style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--white-90)', display: 'block', textAlign: 'left' }}>
                ¿Pago verificado?
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--white-40)', display: 'block', textAlign: 'left', marginTop: 2 }}>
                Marcar si el comprador ya realizó la transferencia
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setTransferido(t => !t)}
              style={{
                position: 'relative',
                width: 44,
                height: 22,
                borderRadius: 999,
                background: transferido ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: transferido ? '1.5px solid #34d399' : '1.5px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 3px',
                outline: 'none',
              }}
            >
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: transferido ? '#34d399' : 'rgba(255, 255, 255, 0.3)',
                transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                transform: transferido ? 'translateX(22px)' : 'translateX(0px)',
                boxShadow: transferido ? '0 0 10px rgba(52, 211, 153, 0.4)' : 'none'
              }} />
            </button>
          </div>

          {/* Resumen */}
          {numeros.length > 0 && (
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 2 }}>
                  Total actualizado
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{formatCLP(total)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--white-30)', marginBottom: 2 }}>Números</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--white-60)' }}>
                  {numeros.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" id="btn-cancel-edit" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" id="btn-submit-edit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
