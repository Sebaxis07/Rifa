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

// Un usuario está "en línea" si su última conexión fue hace menos de 5 minutos
const isOnline = (ultimaConexion) => {
  if (!ultimaConexion) return false;
  return (Date.now() - new Date(ultimaConexion).getTime()) < 5 * 60 * 1000;
};

const formatTime = (ultimaConexion) => {
  if (!ultimaConexion) return 'Nunca';
  const diff = Date.now() - new Date(ultimaConexion).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
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
      email: u.email,
      password: '', // blank by default when editing
      rol: u.rol,
      permisos: u.permisos || []
    });
    setShowModal(true);
  };

  const handleRoleChange = (e) => {
    const rol = e.target.value;
    const permissions = rol === 'admin'
      ? PERMISOS_DISPONIBLES.map(p => p.key)
      : ['registrar_compra', 'ver_analytics'];
    setForm(prev => ({ ...prev, rol, permisos: permissions }));
  };

  const handlePermissionToggle = (key) => {
    if (form.rol === 'admin') return; // Admin has all perms
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
    if (!form.nombre) {
      return toast.error('El nombre es obligatorio');
    }
    // Si es admin, el email sí es requerido
    if (form.rol === 'admin' && !form.email) {
      return toast.error('El correo es obligatorio para administradores');
    }

    try {
      if (editingUser) {
        // Edit User
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
        // Create User
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
      .then(() => toast.success(`¡Enlace de acceso copiado para ${u.nombre}!`))
      .catch(() => toast.error('Fallo al copiar enlace al portapapeles'));
  };

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="section-title">Ajustes</p>
          <h1 style={{ margin: 0 }}>Gestión de Usuarios</h1>
          <p style={{ marginTop: 4, color: 'var(--white-60)' }}>Administra cuentas, accesos y permisos detallados para el personal</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          ＋ Crear Usuario
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            style={{ maxWidth: 360 }}
            placeholder="🔍 Buscar por nombre o email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--white-30)' }}>Cargando usuarios…</p>
        ) : filteredUsers.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--white-30)' }}>No se encontraron usuarios</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo Electrónico</th>
                  <th>Rol</th>
                  <th>Permisos</th>
                  <th style={{ width: 140 }}>Estado</th>
                  <th style={{ width: 260 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                    <td style={{ color: 'var(--white-60)' }}>{u.email}</td>
                    <td>
                      <span style={{
                        background: u.rol === 'admin' ? 'var(--white)' : 'var(--surface-3)',
                        color: u.rol === 'admin' ? 'var(--bg)' : 'var(--white-80)',
                        padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: '0.72rem', fontWeight: 700,
                          color: isOnline(u.ultimaConexion) ? '#4ade80' : 'var(--white-30)'
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: isOnline(u.ultimaConexion) ? '#4ade80' : 'var(--white-20)',
                            boxShadow: isOnline(u.ultimaConexion) ? '0 0 6px #4ade80' : 'none',
                            flexShrink: 0
                          }} />
                          {isOnline(u.ultimaConexion) ? 'En línea' : 'Desconectado'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--white-30)' }}>
                          {formatTime(u.ultimaConexion)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 400 }}>
                        {u.rol === 'admin' ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--white-40)' }}>Todos los accesos</span>
                        ) : (u.permisos || []).length === 0 ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--white-30)' }}>Ninguno</span>
                        ) : (
                          (u.permisos || []).map(p => {
                            const label = PERMISOS_DISPONIBLES.find(x => x.key === p)?.label || p;
                            return (
                              <span key={p} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--white-60)', padding: '1px 6px', borderRadius: 3, fontSize: '0.66rem' }}>
                                {label}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCopyLink(u)} title="Copiar enlace de acceso rápido">
                          Enlace
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(u)}>
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={currentUser?.email === u.email}
                          onClick={() => handleDelete(u)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    className="form-input"
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Correo Electrónico
                    <span style={{ fontSize: '0.72rem', color: 'var(--white-30)', marginLeft: 6 }}>
                      {form.rol === 'supervisor' ? '(opcional si usará solo el enlace)' : '*'}
                    </span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="juan@correo.com"
                    required={form.rol === 'admin'}
                  />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Contraseña
                    <span style={{ fontSize: '0.72rem', color: 'var(--white-30)', marginLeft: 6 }}>
                      {editingUser ? '(dejar en blanco para no cambiar)' : form.rol === 'supervisor' ? '(opcional si usará solo el enlace)' : '*'}
                    </span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    required={form.rol === 'admin' && !editingUser}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol del Usuario *</label>
                  <select className="form-input" value={form.rol} onChange={handleRoleChange}>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 10 }}>Permisos Específicos</label>
                <div style={{
                  maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
                  background: 'var(--surface-2)'
                }}>
                  {PERMISOS_DISPONIBLES.map(p => {
                    const isChecked = form.permisos.includes(p.key);
                    return (
                      <div
                        key={p.key}
                        onClick={() => handlePermissionToggle(p.key)}
                        style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start', padding: 8,
                          borderRadius: 8, cursor: form.rol === 'admin' ? 'not-allowed' : 'pointer',
                          background: isChecked ? 'rgba(255,255,255,0.02)' : 'transparent',
                          border: isChecked ? '1px solid var(--border)' : '1px solid transparent',
                          opacity: form.rol === 'admin' ? 0.6 : 1, transition: 'all 0.15s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={form.rol === 'admin'}
                          onChange={() => {}} // handled by click on container
                          style={{ marginTop: 3, cursor: form.rol === 'admin' ? 'not-allowed' : 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isChecked ? 'var(--white)' : 'var(--white-80)' }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--white-40)', marginTop: 2 }}>
                            {p.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
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
