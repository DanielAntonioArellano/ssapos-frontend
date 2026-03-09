import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import styles from "./users.module.css";
import { KeyRound, Eye, EyeOff } from "lucide-react";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type Role = "ADMIN" | "CAJERO" | "MESERO";

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isSuperAdmin: boolean;
  createdAt: string;
};

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ROLE_STYLES: Record<Role, { label: string; className: string }> = {
  ADMIN:  { label: "Admin",  className: "roleAdmin" },
  CAJERO: { label: "Cajero", className: "roleCajero" },
  MESERO: { label: "Mesero", className: "roleMesero" },
};

// ---------------------------------------------------
// Change Password Modal
// ---------------------------------------------------
interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
}

function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!currentPassword) {
      setError("Ingresa la contraseña actual del usuario");
      return;
    }
    if (!newPassword) {
      setError("Ingresa la nueva contraseña");
      return;
    }
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      await apiRequest(`/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast(`Contraseña de ${user.name} actualizada`, "success");
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al cambiar contraseña");
    } finally {
      setLoading(false);
    }
  }

  function PasswordInput({
    value,
    onChange,
    show,
    onToggle,
    placeholder,
    autoFocus,
    onEnter,
  }: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
    autoFocus?: boolean;
    onEnter?: () => void;
  }) {
    return (
      <div style={{ position: "relative" }}>
        <input
          className={styles.input}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          style={{ paddingRight: "2.75rem", width: "100%", boxSizing: "border-box" }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            padding: 0,
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <KeyRound size={18} color="#0f172a" />
            <h2 className={styles.modalTitle}>Cambiar contraseña</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Info del usuario */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "#f8fafc",
            borderRadius: "10px",
            marginBottom: "1.25rem",
          }}>
            <div className={styles.avatar} style={{ flexShrink: 0 }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>
                {user.name}
              </p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                {user.email}
              </p>
            </div>
            <span
              className={`${styles.roleBadge} ${styles[ROLE_STYLES[user.role].className]}`}
              style={{ marginLeft: "auto" }}
            >
              {ROLE_STYLES[user.role].label}
            </span>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Contraseña actual</label>
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
              placeholder="Contraseña actual del usuario"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Nueva contraseña</label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirmar nueva contraseña</label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              placeholder="Repite la nueva contraseña"
              onEnter={handleSubmit}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Create User Modal
// ---------------------------------------------------
interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CAJERO" as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nuevo Usuario</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Nombre</label>
            <input
              className={styles.input}
              name="name"
              placeholder="Ej. Juan Pérez"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                className={styles.input}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                style={{ paddingRight: "2.75rem", width: "100%", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Rol</label>
            <select
              className={styles.select}
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="ADMIN">Admin</option>
              <option value="CAJERO">Cajero</option>
              <option value="MESERO">Mesero</option>
            </select>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [changePwdUser, setChangePwdUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/users/by-restaurant");
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className={styles.container}><p className={styles.loading}>Cargando usuarios...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.errorMsg}>{error}</p></div>;
  }

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
          + Nuevo usuario
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {search ? "Sin resultados para tu búsqueda." : "No hay usuarios registrados."}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const roleStyle = ROLE_STYLES[user.role];
                return (
                  <tr key={user.id}>
                    <td className={styles.userId}>#{user.id}</td>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={styles.userName}>{user.name}</span>
                      </div>
                    </td>
                    <td className={styles.userEmail}>{user.email}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[roleStyle.className]}`}>
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className={styles.userDate}>{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => setChangePwdUser(user)}
                        title="Cambiar contraseña"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                          background: "#f1f5f9",
                          border: "none",
                          borderRadius: "7px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "#475569",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                      >
                        <KeyRound size={13} />
                        Contraseña
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear usuario */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      {/* Modal cambiar contraseña */}
      {changePwdUser && (
        <ChangePasswordModal
          user={changePwdUser}
          onClose={() => setChangePwdUser(null)}
        />
      )}
    </div>
  );
}