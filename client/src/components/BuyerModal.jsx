import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, getToken } from '../context/AuthContext';

export default function BuyerModal({ rifaId, precioPorNumero, compras, onClose, onSuccess, initialSelectedNums = [] }) {
  const [comprador, setComprador] = useState('');
  const [nota, setNota] = useState('');
  const [selectedNums, setSelectedNums] = useState(initialSelectedNums);
  const [loading, setLoading] = useState(false);
  const [transferido, setTransferido] = useState(false);

  const ocupados = compras.flatMap(c => c.numeros);

  const toggleNum = (n) => {
    setSelectedNums(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };

  const total = selectedNums.length * precioPorNumero;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comprador.trim()) return toast.error('Ingresa el nombre del comprador');
    if (selectedNums.length === 0) return toast.error('Selecciona al menos un número');

    setLoading(true);
    try {
      await axios.post(`${API}/api/compras`, {
        rifaId, comprador: comprador.trim(), numeros: selectedNums, nota, transferido
      }, { headers: { Authorization: `Bearer ${getToken()}` } });

      toast.success(`✅ Compra registrada — ${selectedNums.length} número(s)`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar compra');
    } finally {
      setLoading(false);
    }
  };

  const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3>Registrar Compra</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--white-30)', marginTop: 2 }}>
              {selectedNums.length} número(s) · {formatCLP(total)}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" id="btn-close-modal" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre del Comprador *</label>
            <input
              id="input-comprador"
              className="form-input"
              value={comprador}
              onChange={e => setComprador(e.target.value)}
              placeholder="Ej: Juan Pérez"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Selecciona los Números</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
              {Array.from({ length: 41 }, (_, i) => i + 1).map(num => {
                const ocupado = ocupados.includes(num);
                const sel = selectedNums.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    id={`modal-num-${num}`}
                    disabled={ocupado}
                    onClick={() => toggleNum(num)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: sel ? '2px solid var(--white)' : '1.5px solid var(--border)',
                      background: ocupado ? 'var(--surface-2)' : sel ? 'var(--white)' : 'var(--surface-3)',
                      color: ocupado ? 'var(--white-30)' : sel ? 'var(--bg)' : 'var(--white-60)',
                      fontSize: '0.78rem', fontWeight: 700, cursor: ocupado ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                    }}
                  >
                    {String(num).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input
              id="input-nota"
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

          {selectedNums.length > 0 && (
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--white-30)' }}>TOTAL A COBRAR</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{formatCLP(total)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Números</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedNums.join(', ')}</div>
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" id="btn-cancel-modal" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" id="btn-submit-compra" disabled={loading}>
              {loading ? 'Guardando…' : 'Registrar Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
