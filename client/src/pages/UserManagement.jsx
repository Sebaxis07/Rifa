import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, getToken, useAuth } from '../context/AuthContext';

const PERMISOS_DISPONIBLES = [
  { key: 'gestionar_usuarios', label: 'Gestionar Usuarios', desc: 'Crear, editar y eliminar otros usuarios' },
  { key: 'crear_rifa', label: 'Crear Rifas', desc: 'Crear nuevos sorteos de rifas' },
  { key: 'editar_rifa', label: 'Editar Rifas', desc: 'Actualizar configuración e imagen de sorteos' },
  { key: 'eliminar_rifa', label: 'Eliminar Rifas', desc: 'Borrar permanentemente un sorteo' },
  { key: 'registrar_compra', label: 'Registrar Ventas', desc: 'Vender y registrar compras de números' },
  { key: 'editar_compra', label: 'Editar Ventas', desc: 'Modificar transacciones o números de compradores' },
  { key: 'eliminar_compra', label: 'Anular Ventas', desc: 'Eliminar y liberar números de una venta' },
  { key: 'ver_analytics', label: 'Ver Analytics', desc: 'Ver reportes financieros, de velocidad y gráficos' },
];

const isOnline = (ultimaConexion) => {
  if (!ultimaConexion) return false;
  return (Date.now() - new Date(ultimaConexion).getTime()) < 5 * 60 * 1000;
};

const formatTime = (ultimaConexion) => {
  if (!ultimaConexion) return 'Nunca conectado';
  const diff = Date.now() - new Date(ultimaConexion).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Conectado hace un momento';
  if (mins < 60) return `Conectado hace ${mins}m`;
  if (hours < 24) return `Conectado hace ${hours}h`;
  return `Conectado hace ${days}d`;
};

const getAvatarGradient = (name) => {
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    ['#3b82f6', '#8b5cf6'], // blue to purple
    ['#ec4899', '#f43f5e'], // pink to red
    ['#10b981', '#059669'], // emeralds
    ['#f59e0b', '#d97706'], // ambers
    ['#06b6d4', '#3b82f6'], // cyan to blue
  ];
  const [c1, c2] = colors[charCodeSum % colors.length];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null means "creating"
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'supervisor',
    permisos: ['registrar_compra', 'ver_analytics']
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/users`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setUsers(res.data);
    } catch (err) {
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({
      nombre: '',
      email: '',
      password: '',
      rol: 'supervisor',
      permisos: ['registrar_compra', 'ver_analytics']
    });
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setForm({
      nombre: u.nombre,
      email: u.email || '',
      password: '',
      rol: u.rol,
      permisos: u.permisos || []
    });
    setShowModal(true);
  };

  const handleRoleChange = (rol) => {
    const permissions = rol === 'admin'
      ? PERMISOS_DISPONIBLES.map(p => p.key)
      : ['registrar_compra', 'ver_analytics'];
    setForm(prev => ({ ...prev, rol, permisos: permissions }));
  };

  const handlePermissionToggle = (key) => {
    if (form.rol === 'admin') return;
    setForm(prev => {
      const alreadyHas = prev.permisos.includes(key);
      const newPerms = alreadyHas
        ? prev.permisos.filter(k => k !== key)
        : [...prev.permisos, key];
      return { ...prev, permisos: newPerms };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre) return toast.error('El nombre es obligatorio');
    if (form.rol === 'admin' && !form.email) return toast.error('El correo es obligatorio para administradores');

    try {
      if (editingUser) {
        const res = await axios.put(`${API}/api/auth/users/${editingUser._id}`, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          permisos: form.permisos,
          ...(form.password ? { password: form.password } : {})
        }, { headers: { Authorization: `Bearer ${getToken()}` } });
        
        setUsers(prev => prev.map(u => u._id === editingUser._id ? res.data : u));
        toast.success('Usuario actualizado correctamente');
      } else {
        const res = await axios.post(`${API}/api/auth/users`, form, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setUsers(prev => [res.data, ...prev]);
        toast.success('Usuario creado correctamente');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (u) => {
    if (currentUser?.email === u.email) {
      return toast.error('No puedes eliminarte a ti mismo');
    }
    if (!window.confirm(`¿Estás seguro de eliminar a ${u.nombre}?`)) return;

    try {
      await axios.delete(`${API}/api/auth/users/${u._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setUsers(prev => prev.filter(item => item._id !== u._id));
      toast.success('Usuario eliminado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const handleCopyLink = (u) => {
    const link = `${window.location.origin}/login?token=${u.loginToken}`;
    navigator.clipboard.writeText(link)
      .then(() => toast.success(`¡Enlace copiado para ${u.nombre}!`))
      .catch(() => toast.error('Fallo al copiar enlace al portapapeles'));
  };

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalUsers = users.length;
  const onlineUsers = users.filter(u => isOnline(u.ultimaConexion)).length;
  const adminUsers = users.filter(u => u.rol === 'admin').length;
  const supervisorUsers = users.filter(u => u.rol === 'supervisor').length;

  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="section-label">Configuración del Sistema</p>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Gestión de Personal</h1>
          <p style={{ marginTop: 6, color: 'var(--white-40)', fontSize: '0.92rem' }}>Administra el acceso de supervisores y configuraciones administrativas de seguridad</p>
        </div>

        {/* Search Bar next to header */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, fontSize: '0.85rem' }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft: 36, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Stats Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Cuentas', value: totalUsers, sub: 'Usuarios registrados', accent: 'var(--white-40)' },
          { label: 'En línea ahora', value: onlineUsers, sub: 'Actividad en tiempo real', accent: '#34d399' },
          { label: 'Administradores', value: adminUsers, sub: 'Acceso total', accent: '#8b5cf6' },
          { label: 'Supervisores', value: supervisorUsers, sub: 'Acceso rápido', accent: '#3b82f6' }
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 20px',
            borderLeft: `4px solid ${stat.accent}`
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'white', lineHeight: 1.2 }}>{stat.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--white-40)', marginTop: 4 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Profile Card Grid Container */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--white-30)' }}>
          <div className="animate-pulse" style={{ fontSize: '0.9rem' }}>Cargando personal de la rifa…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          
          {/* Dash Card: Create New User */}
          <div
            onClick={openCreateModal}
            style={{
              background: 'transparent',
              border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: 16,
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.25s',
              gap: 12
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              color: 'var(--white-60)'
            }}>＋</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--white-60)' }}>Crear Nuevo Usuario</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--white-35)' }}>Registrar supervisor o administrador</span>
          </div>

          {/* User Cards */}
          {filteredUsers.map(u => {
            const online = isOnline(u.ultimaConexion);
            const isSelf = currentUser?.email === u.email;

            return (
              <div
                key={u._id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Colored Top Banner */}
                <div style={{
                  height: 64,
                  background: u.rol === 'admin' 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(124, 58, 237, 0.2))'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.2))',
                  position: 'relative'
                }}>
                  {/* Floating Role Pill */}
                  <span style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    background: u.rol === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    border: u.rol === 'admin' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
                    color: u.rol === 'admin' ? '#c084fc' : '#60a5fa',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {u.rol}
                  </span>
                </div>

                {/* Avatar with absolute overlapping presence indicator */}
                <div style={{ display: 'flex', padding: '0 20px', marginTop: -28, position: 'relative', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: getAvatarGradient(u.nombre),
                      border: '3px solid var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'white',
                    }}>
                      {u.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    {/* Glowing status circle overlaid on avatar */}
                    <div
                      title={online ? 'En línea' : 'Desconectado'}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: online ? '#34d399' : '#4b5563',
                        border: '2.5px solid var(--surface)',
                        boxShadow: online ? '0 0 10px #34d399' : 'none'
                      }}
                    />
                  </div>

                  {/* Connection Text Time */}
                  <span style={{ fontSize: '0.68rem', color: 'var(--white-30)', fontWeight: 500, paddingBottom: 6 }}>
                    {formatTime(u.ultimaConexion)}
                  </span>
                </div>

                {/* Body Content */}
                <div style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Name and Email */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--white-90)', display: 'block' }}>
                      {u.nombre} {isSelf && <span style={{ fontSize: '0.72rem', color: 'var(--white-30)', fontWeight: 400 }}>(Tú)</span>}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--white-45)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email || 'Acceso por enlace rápido'}
                    </span>
                  </div>

                  {/* Quick-Access Row for supervisors */}
                  {u.rol === 'supervisor' && (
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--white-20)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Ingreso Rápido</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--white-45)' }}>Enlace sin clave</span>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCopyLink(u)}
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', gap: 4, height: 26, background: 'rgba(255,255,255,0.03)' }}
                      >
                        📋 Copiar
                      </button>
                    </div>
                  )}

                  {/* Spacer to push permissions to the bottom */}
                  <div style={{ flex: 1 }} />

                  {/* Permissions Pills Area */}
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--white-20)', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                      Permisos Activos
                    </span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {u.rol === 'admin' ? (
                        <span style={{
                          background: 'rgba(139, 92, 246, 0.08)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          color: '#a78bfa',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: '0.68rem',
                          fontWeight: 500
                        }}>
                          Acceso Total
                        </span>
                      ) : (u.permisos || []).length === 0 ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--white-30)' }}>Ninguno</span>
                      ) : (
                        (u.permisos || []).map(p => {
                          const label = PERMISOS_DISPONIBLES.find(x => x.key === p)?.label || p;
                          return (
                            <span key={p} style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border)',
                              color: 'var(--white-60)',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.68rem',
                              fontWeight: 500
                            }}>
                              {label}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Actions Divider */}
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 -20px 14px' }} />

                  {/* Footer Card Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEditModal(u)}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', flex: 1 }}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={isSelf}
                      onClick={() => handleDelete(u)}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', flex: isSelf ? 1 : 0.8 }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 620, padding: '24px 28px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 20 }}>
            
            {/* Modal Title */}
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {editingUser ? 'Configuración de Cuenta' : 'Nuevo Integrante'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} style={{ borderRadius: 8 }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Form Grid */}
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    className="form-input"
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                    style={{ borderRadius: 8 }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Correo Electrónico
                    <span style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginLeft: 6 }}>
                      {form.rol === 'supervisor' ? '(opcional)' : '*'}
                    </span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="juan@correo.com"
                    style={{ borderRadius: 8 }}
                    required={form.rol === 'admin'}
                  />
                </div>
              </div>

              {/* Password and Info tip */}
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Contraseña
                    <span style={{ fontSize: '0.68rem', color: 'var(--white-30)', marginLeft: 6 }}>
                      {editingUser ? '(vacío para no cambiar)' : form.rol === 'supervisor' ? '(opcional)' : '*'}
                    </span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    style={{ borderRadius: 8 }}
                    required={form.rol === 'admin' && !editingUser}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  marginTop: 18
                }}>
                  <span style={{ fontSize: '1rem', marginRight: 10 }}>💡</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--white-40)', lineHeight: 1.35, textAlign: 'left' }}>
                    Los supervisores entran sin contraseña copiando su enlace tokenizado desde el panel.
                  </span>
                </div>
              </div>

              {/* Role Picker (Interactive Cards) */}
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 4 }}>Rol *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Card: Supervisor */}
                  <div
                    onClick={() => handleRoleChange('supervisor')}
                    style={{
                      border: form.rol === 'supervisor' ? '1.5px solid #3b82f6' : '1.5px solid var(--border)',
                      background: form.rol === 'supervisor' ? 'rgba(59, 130, 246, 0.05)' : 'var(--surface-2)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: form.rol === 'supervisor' ? '0 0 14px rgba(59, 130, 246, 0.15)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: form.rol === 'supervisor' ? '#60a5fa' : 'var(--white-80)' }}>
                        Supervisor
                      </span>
                      <div style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: form.rol === 'supervisor' ? '4.5px solid #3b82f6' : '1.5px solid rgba(255, 255, 255, 0.2)',
                        background: form.rol === 'supervisor' ? '#fff' : 'transparent',
                        transition: 'all 0.15s'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--white-40)', lineHeight: 1.3, textAlign: 'left' }}>
                      Ingresa sin clave. Sus permisos son asignados a la medida.
                    </span>
                  </div>

                  {/* Card: Administrador */}
                  <div
                    onClick={() => handleRoleChange('admin')}
                    style={{
                      border: form.rol === 'admin' ? '1.5px solid #8b5cf6' : '1.5px solid var(--border)',
                      background: form.rol === 'admin' ? 'rgba(139, 92, 246, 0.05)' : 'var(--surface-2)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: form.rol === 'admin' ? '0 0 14px rgba(139, 92, 246, 0.15)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: form.rol === 'admin' ? '#a78bfa' : 'var(--white-80)' }}>
                        Administrador
                      </span>
                      <div style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: form.rol === 'admin' ? '4.5px solid #8b5cf6' : '1.5px solid rgba(255, 255, 255, 0.2)',
                        background: form.rol === 'admin' ? '#fff' : 'transparent',
                        transition: 'all 0.15s'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--white-40)', lineHeight: 1.3, textAlign: 'left' }}>
                      Acceso total. Requiere contraseña y cuenta con todos los accesos.
                    </span>
                  </div>
                </div>
              </div>

              {/* Permissions Specific Panel (Grid without height limit/scrollbars) */}
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 4 }}>
                  Permisos Específicos
                  {form.rol === 'admin' && (
                    <span style={{ fontSize: '0.68rem', color: '#a78bfa', marginLeft: 8, textTransform: 'none', fontWeight: 500 }}>
                      (Heredado por Rol Administrador)
                    </span>
                  )}
                </label>
                <div className="permissions-grid">
                  {PERMISOS_DISPONIBLES.map(p => {
                    const isChecked = form.permisos.includes(p.key);
                    return (
                      <div
                        key={p.key}
                        onClick={() => handlePermissionToggle(p.key)}
                        style={{
                          display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                          borderRadius: 10, cursor: form.rol === 'admin' ? 'not-allowed' : 'pointer',
                          background: isChecked ? 'rgba(255,255,255,0.02)' : 'transparent',
                          border: isChecked ? '1px solid var(--border-light)' : '1px solid transparent',
                          opacity: form.rol === 'admin' ? 0.5 : 1, transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isChecked ? 'var(--white)' : 'var(--white-80)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--white-40)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>
                            {p.desc}
                          </div>
                        </div>

                        {/* Custom iOS Toggle Switch */}
                        <button
                          type="button"
                          disabled={form.rol === 'admin'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermissionToggle(p.key);
                          }}
                          style={{
                            position: 'relative',
                            width: 32,
                            height: 18,
                            borderRadius: 999,
                            background: isChecked ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: isChecked ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.15)',
                            cursor: form.rol === 'admin' ? 'not-allowed' : 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 2px',
                            outline: 'none',
                            flexShrink: 0
                          }}
                        >
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: isChecked ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
                            transition: 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)',
                            transform: isChecked ? 'translateX(16px)' : 'translateX(0px)',
                            boxShadow: isChecked ? '0 0 6px #34d399' : 'none'
                          }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-footer" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ borderRadius: 8 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }}>
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
