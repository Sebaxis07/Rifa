import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ConnectionPanel from './components/ConnectionPanel';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CreateRifa from './pages/CreateRifa';
import RifaDetail from './pages/RifaDetail';
import Analytics from './pages/Analytics';
import SupervisorView from './pages/SupervisorView';
import UserManagement from './pages/UserManagement';
import GlobalDashboard from './pages/GlobalDashboard';
import Comprobante from './pages/Comprobante';
import ClienteRifa from './pages/ClienteRifa';

function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && user.rol !== 'admin' && (!user.permisos || !user.permisos.includes(permission))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppLayout() {
  const { loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (loading) return null;

  return (
    <div className="app-layout">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar-brand">RifaSystem</span>
        <button
          className={`hamburger ${sidebarOpen ? 'open' : ''}`}
          id="btn-hamburger"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Menú"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="main-content">
        <Routes>
          <Route path="/"                    element={<Dashboard />} />
          <Route path="/login"               element={<Login />} />
          <Route path="/rifa/:id"            element={<RifaDetail />} />
          <Route path="/rifa/:id/analytics"  element={<ProtectedRoute permission="ver_analytics"><Analytics /></ProtectedRoute>} />
          <Route path="/rifa/:id/vista"      element={<ProtectedRoute><SupervisorView /></ProtectedRoute>} />
          <Route path="/nueva-rifa"          element={<ProtectedRoute permission="crear_rifa"><CreateRifa /></ProtectedRoute>} />
          <Route path="/usuarios"            element={<ProtectedRoute permission="gestionar_usuarios"><UserManagement /></ProtectedRoute>} />
          <Route path="/resumen"             element={<ProtectedRoute><GlobalDashboard /></ProtectedRoute>} />
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Panel de supervisores conectados (solo visible para admin) */}
      <ConnectionPanel />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a1a', color: '#fff',
              border: '1px solid #2a2a2a', borderRadius: '8px',
              fontFamily: 'Inter, sans-serif', fontSize: '0.825rem', padding: '10px 14px',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#000' } },
            error:   { iconTheme: { primary: '#ff4444', secondary: '#fff' } },
          }}
        />
        {/* Ruta pública fuera del layout con sidebar */}
        <Routes>
          <Route path="/comprobante/:id" element={<Comprobante />} />
          <Route path="/rifa-activa" element={<ClienteRifa />} />
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
