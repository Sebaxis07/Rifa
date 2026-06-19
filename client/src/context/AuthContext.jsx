import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { setUser(r.data); })
        .catch(() => { localStorage.removeItem('token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Heartbeat: actualizar última conexión cada 2 minutos mientras el usuario esté activo
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const beat = () => {
      axios.post(`${API}/api/auth/heartbeat`, {}, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => {}); // silencioso
    };
    beat(); // inmediato al iniciar sesión
    const interval = setInterval(beat, 2 * 60 * 1000); // cada 2 minutos
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email, password) => {
    const r = await axios.post(`${API}/api/auth/login`, { email, password });
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const loginWithToken = (token, userObj) => {
    localStorage.setItem('token', token);
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, loginWithToken, logout, loading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
export const getToken = () => localStorage.getItem('token');
export { API };
