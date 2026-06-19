import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, getToken } from '../context/AuthContext';

export default function EditRifaModal({ rifa, onClose, onSuccess }) {
  const [nombre, setNombre]                     = useState(rifa.nombre);
  const [nombrePremio, setNombrePremio]         = useState(rifa.nombrePremio);
  const [precioPorNumero, setPrecioPorNumero]   = useState(rifa.precioPorNumero);
  const [fechaInicio, setFechaInicio]           = useState(rifa.fechaInicio ? rifa.fechaInicio.substring(0, 10) : '');
  const [fechaSorteo, setFechaSorteo]           = useState(rifa.fechaSorteo ? rifa.fechaSorteo.substring(0, 10) : '');
  const [estado, setEstado]                     = useState(rifa.estado || 'activa');
  const [imageFile, setImageFile]               = useState(null);
  const [previewUrl, setPreviewUrl]             = useState(rifa.imagenPremio ? `${API}${rifa.imagenPremio}` : '');
  const [saving, setSaving]                     = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || !nombrePremio || !precioPorNumero || !fechaSorteo || !fechaInicio) {
      return toast.error('Completa los campos obligatorios');
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('nombrePremio', nombrePremio);
    formData.append('precioPorNumero', precioPorNumero);
    formData.append('fechaInicio', new Date(fechaInicio).toISOString());
    formData.append('fechaSorteo', new Date(fechaSorteo).toISOString());
    formData.append('estado', estado);
    if (imageFile) {
      formData.append('imagenPremio', imageFile);
    }

    try {
      const res = await axios.put(`${API}/api/rifas/${rifa._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${getToken()}`
        }
      });
      toast.success('Rifa actualizada con éxito');
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar la rifa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Editar Rifa</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--white-40)', marginTop: 2 }}>Modifica los datos del sorteo</p>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} style={{ borderRadius: '50%' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nombre del sorteo</label>
            <input
              type="text"
              className="form-input"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Gran Rifa Pro-Fondos"
            />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Nombre del premio</label>
              <input
                type="text"
                className="form-input"
                value={nombrePremio}
                onChange={e => setNombrePremio(e.target.value)}
                placeholder="Ej. PlayStation 5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Precio del número (CLP)</label>
              <input
                type="number"
                className="form-input"
                value={precioPorNumero}
                onChange={e => setPrecioPorNumero(Number(e.target.value))}
                placeholder="Ej. 2000"
              />
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Fecha de inicio</label>
              <input
                type="date"
                className="form-input"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha del sorteo</label>
              <input
                type="date"
                className="form-input"
                value={fechaSorteo}
                onChange={e => setFechaSorteo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Estado de la rifa</label>
            <select
              className="form-select"
              value={estado}
              onChange={e => setEstado(e.target.value)}
            >
              <option value="activa">Activa</option>
              <option value="cerrada">Cerrada</option>
              <option value="sorteada">Sorteada</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Imagen del Premio</label>
            <div
              className={`upload-area ${previewUrl ? 'has-file' : ''}`}
              onClick={() => document.getElementById('edit-image-input').click()}
            >
              {previewUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <img src={previewUrl} alt="Premio" className="upload-preview" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--white-40)' }}>Hacer clic para cambiar la imagen</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, opacity: 0.3 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Subir imagen del premio</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--white-30)' }}>Formatos soportados: JPG, PNG, WEBP</span>
                </div>
              )}
            </div>
            <input
              type="file"
              id="edit-image-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
