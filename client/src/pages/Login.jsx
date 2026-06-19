import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth, API } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setLoading(true);
      axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${urlToken}` } })
        .then(r => {
          loginWithToken(urlToken, r.data);
          toast.success(`Acceso Rápido: ¡Bienvenido ${r.data.nombre || 'Supervisor'}!`);
          navigate('/');
        })
        .catch(() => {
          toast.error('El enlace de acceso rápido ha expirado o es inválido');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [navigate, loginWithToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bienvenido');
      navigate('/');
    } catch {
      toast.error('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">
            <svg viewBox="0 0 16 16" fill="var(--bg)" style={{ width: 18, height: 18 }}>
              <rect x="1" y="4" width="14" height="8" rx="1.5" />
              <line x1="5.5" y1="4" x2="5.5" y2="12" stroke="white" strokeWidth="1.2" strokeDasharray="2 1.5" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.1rem', letterSpacing: '-0.01em' }}>RifaSystem</h2>
          <p style={{ marginTop: 4, fontSize: '0.8rem' }}>Gestión profesional de sorteos</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              id="input-email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              id="input-password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            id="btn-submit-login"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ marginTop: 6, width: '100%' }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--white-30)' }}>
          Solo quieres ver el estado?{' '}
          <button
            id="btn-guest-access"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--white-60)', cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.78rem', fontWeight: 600 }}
          >
            Ver como invitado
          </button>
        </p>
      </div>
    </div>
  );
}
