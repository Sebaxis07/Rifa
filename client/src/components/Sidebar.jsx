import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IconGrid = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="sidebar-link-icon">
    <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="sidebar-link-icon">
    <line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
  </svg>
);
const IconLogin = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="sidebar-link-icon">
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <polyline points="11 11 14 8 11 5" /><line x1="14" y1="8" x2="6" y2="8" />
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <polyline points="11 11 14 8 11 5" /><line x1="14" y1="8" x2="6" y2="8" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="sidebar-link-icon">
    <path d="M12 14v-1a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v1" />
    <circle cx="7" cy="4" r="3" />
    <path d="M14 14v-1a3 3 0 0 0-2.5-2.9" />
    <circle cx="12" cy="3" r="2" />
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="sidebar-link-icon">
    <rect x="1" y="9" width="3" height="6" rx="0.5" />
    <rect x="6" y="5" width="3" height="10" rx="0.5" />
    <rect x="11" y="1" width="3" height="14" rx="0.5" />
  </svg>
);

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate('/login');
  };

  const handleNav = () => onClose?.();

  const initials = user?.nombre
    ? user.nombre.substring(0, 2).toUpperCase()
    : user?.email
      ? user.email.substring(0, 2).toUpperCase()
      : 'GU';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <svg viewBox="0 0 16 16" fill="var(--bg)" style={{ width: 16, height: 16 }}>
            <rect x="1" y="4" width="14" height="8" rx="1.5" />
            <line x1="5.5" y1="4" x2="5.5" y2="12" stroke="white" strokeWidth="1.2" strokeDasharray="2 1.5" />
          </svg>
        </div>
        <div className="sidebar-brand">RifaSystem</div>
        <div className="sidebar-brand-sub">Gestión de sorteos</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">General</div>

        <Link
          to="/"
          id="nav-dashboard"
          className={`sidebar-link ${isActive('/') ? 'active' : ''}`}
          onClick={handleNav}
        >
          <IconGrid />
          Rifas
        </Link>

        {user?.rol === 'admin' && (
          <Link
            to="/resumen"
            id="nav-resumen"
            className={`sidebar-link ${isActive('/resumen') ? 'active' : ''}`}
            onClick={handleNav}
          >
            <IconChart />
            Resumen Global
          </Link>
        )}

        {(user?.rol === 'admin' || user?.permisos?.includes('crear_rifa')) && (
          <Link
            to="/nueva-rifa"
            id="nav-nueva-rifa"
            className={`sidebar-link ${isActive('/nueva-rifa') ? 'active' : ''}`}
            onClick={handleNav}
          >
            <IconPlus />
            Nueva Rifa
          </Link>
        )}

        {(user?.rol === 'admin' || user?.permisos?.includes('gestionar_usuarios')) && (
          <Link
            to="/usuarios"
            id="nav-usuarios"
            className={`sidebar-link ${isActive('/usuarios') ? 'active' : ''}`}
            onClick={handleNav}
          >
            <IconUsers />
            Usuarios
          </Link>
        )}

        {!user && (
          <Link
            to="/login"
            id="nav-login"
            className={`sidebar-link ${isActive('/login') ? 'active' : ''}`}
            onClick={handleNav}
          >
            <IconLogin />
            Ingresar
          </Link>
        )}
      </nav>

      {/* Footer / User */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.nombre || user.email.split('@')[0]}</div>
              <div className="sidebar-user-role">{user.rol === 'admin' ? 'Administrador' : 'Supervisor'}</div>
            </div>
            <button
              className="sidebar-logout-btn"
              id="btn-logout"
              title="Cerrar sesión"
              onClick={handleLogout}
            >
              <IconLogout />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
