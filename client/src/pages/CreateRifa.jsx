import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, getToken } from '../context/AuthContext';

export default function CreateRifa() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    nombre: '', fechaInicio: '', fechaSorteo: '',
    precioPorNumero: '', nombrePremio: ''
  });

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.fechaSorteo || !form.precioPorNumero || !form.nombrePremio) {
      return toast.error('Completa todos los campos requeridos');
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (fileRef.current?.files[0]) fd.append('imagenPremio', fileRef.current.files[0]);

      const r = await axios.post(`${API}/api/rifas`, fd, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Rifa creada exitosamente');
      navigate(`/rifa/${r.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la rifa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <p className="section-title">Admin</p>
        <h1>Nueva Rifa</h1>
        <p style={{ marginTop: 4 }}>Configura todos los detalles del sorteo</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>Información General</h3>
          <div className="form-grid" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Nombre de la Rifa *</label>
              <input id="input-nombre" className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Gran Rifa Benéfica 2024" />
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de Inicio</label>
                <input id="input-fecha-inicio" type="date" className="form-input" value={form.fechaInicio} onChange={set('fechaInicio')} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Sorteo *</label>
                <input id="input-fecha-sorteo" type="date" className="form-input" value={form.fechaSorteo} onChange={set('fechaSorteo')} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Precio por Número (CLP) *</label>
              <input id="input-precio" type="number" min="1" className="form-input" value={form.precioPorNumero} onChange={set('precioPorNumero')} placeholder="Ej: 5000" required />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>Premio</h3>
          <div className="form-grid" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Nombre del Premio *</label>
              <input id="input-nombre-premio" className="form-input" value={form.nombrePremio} onChange={set('nombrePremio')} placeholder="Ej: iPhone 15 Pro Max" required />
            </div>
            <div className="form-group">
              <label className="form-label">Imagen del Premio</label>
              <div
                className={`upload-area ${preview ? 'has-file' : ''}`}
                onClick={() => fileRef.current?.click()}
                id="upload-imagen"
              >
                {preview
                  ? <img src={preview} alt="preview" className="upload-preview" style={{ maxWidth: '100%' }} />
                  : (
                    <>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📸</div>
                      <p style={{ fontSize: '0.85rem', margin: 0 }}>Haz clic para subir imagen</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--white-30)', marginTop: 4 }}>JPG, PNG · máx. 5MB</p>
                    </>
                  )
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} id="input-file-imagen" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')} id="btn-cancel-create">Cancelar</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="btn-submit-create">
            {loading ? 'Creando…' : 'Crear Rifa'}
          </button>
        </div>
      </form>
    </div>
  );
}
