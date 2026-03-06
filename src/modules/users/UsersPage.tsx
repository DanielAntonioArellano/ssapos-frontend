import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./users.module.css";

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
  ADMIN:      { label: "Admin",      className: "roleAdmin" },
  CAJERO:     { label: "Cajero",     className: "roleCajero" },
  MESERO:     { label: "Mesero",     className: "roleMesero" },
};

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
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
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
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
            <input
              className={styles.input}
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
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
          <button
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className={styles.primaryBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
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
  const [showModal, setShowModal] = useState(false);
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

        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
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
                    <td className={styles.userDate}>
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}