import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          RIFA<span>SYSTEM</span>
        </Link>
        <div className="navbar-actions">
          {user ? (
            <>
              <span className={`badge-role ${user.rol}`}>
                {user.rol === 'admin' ? '⚙ Admin' : '👁 Invitado'}
              </span>
              {user.rol === 'admin' && (
                <Link to="/nueva-rifa" className="btn btn-primary btn-sm" id="btn-nueva-rifa">
                  + Nueva Rifa
                </Link>
              )}
              <button onClick={handleLogout} className="btn btn-ghost btn-sm" id="btn-logout">
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm" id="btn-login-nav">Ingresar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
