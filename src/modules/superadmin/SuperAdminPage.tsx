// src/modules/superadmin/SuperAdminPage.tsx
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import styles from "./SuperAdminPage.module.css";
import { Plus, ToggleLeft, ToggleRight, Building2, Pencil, X, UserPlus } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

const EMPTY_FORM = { name: "", slug: "", address: "", phone: "" };
const EMPTY_USER = { name: "", email: "", password: "", role: "ADMIN" as Role };

type Role = "ADMIN" | "CAJERO" | "MESERO";

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Estado modal restaurante ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // ── Estado modal usuario ──
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetRestaurant, setTargetRestaurant] = useState<Restaurant | null>(null);
  const [userForm, setUserForm] = useState({ ...EMPTY_USER });
  const [savingUser, setSavingUser] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => { loadRestaurants(); }, []);

  async function loadRestaurants() {
    try {
      setLoading(true);
      const data = await apiRequest("/restaurants");
      setRestaurants(data);
    } catch (err: any) {
      toast(err.message ?? "Error al cargar restaurantes", "error");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(r: Restaurant) {
    setForm({ name: r.name, slug: r.slug, address: r.address ?? "", phone: r.phone ?? "" });
    setEditingId(r.id);
    setShowForm(true);
  }

  function openCreateUser(r: Restaurant) {
    setTargetRestaurant(r);
    setUserForm({ ...EMPTY_USER });
    setShowUserModal(true);
  }

  function handleNameChange(value: string) {
    const slug = value.toLowerCase().trim()
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setForm(prev => ({ ...prev, name: value, slug: editingId ? prev.slug : slug }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast("El nombre es requerido", "warning"); return; }
    if (!form.slug.trim()) { toast("El slug es requerido", "warning"); return; }

    try {
      setSaving(true);
      if (editingId) {
        await apiRequest(`/restaurants/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast("Restaurante actualizado", "success");
      } else {
        await apiRequest("/restaurants", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast("Restaurante creado", "success");
      }
      setShowForm(false);
      loadRestaurants();
    } catch (err: any) {
      toast(err.message ?? "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveUser() {
    if (!userForm.name.trim())     { toast("El nombre es requerido", "warning"); return; }
    if (!userForm.email.trim())    { toast("El email es requerido", "warning"); return; }
    if (!userForm.password.trim()) { toast("La contraseña es requerida", "warning"); return; }
    if (!targetRestaurant)         return;

    try {
      setSavingUser(true);
      await apiRequest("/users/for-restaurant", {
        method: "POST",
        body: JSON.stringify({
          ...userForm,
          restaurantId: targetRestaurant.id,
        }),
      });
      toast(`Usuario creado para ${targetRestaurant.name}`, "success");
      setShowUserModal(false);
    } catch (err: any) {
      toast(err.message ?? "Error al crear usuario", "error");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleToggleActive(r: Restaurant) {
    try {
      setTogglingId(r.id);
      const endpoint = r.active
        ? `/restaurants/${r.id}/deactivate`
        : `/restaurants/${r.id}/activate`;
      await apiRequest(endpoint, { method: "PATCH" });
      toast(r.active ? "Restaurante desactivado" : "Restaurante activado", "success");
      loadRestaurants();
    } catch (err: any) {
      toast(err.message ?? "Error al cambiar estado", "error");
    } finally {
      setTogglingId(null);
    }
  }

  const active   = restaurants.filter(r => r.active);
  const inactive = restaurants.filter(r => !r.active);

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Panel SuperAdmin</h1>
          <p className={styles.subtitle}>Gestión global de restaurantes</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}>
          <Plus size={16} /> Nuevo restaurante
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{restaurants.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <span className={styles.statNumber}>{active.length}</span>
          <span className={styles.statLabel}>Activos</span>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <span className={styles.statNumber}>{inactive.length}</span>
          <span className={styles.statLabel}>Inactivos</span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className={styles.empty}>Cargando restaurantes...</div>
      ) : restaurants.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={40} color="#9CA3AF" />
          <p>No hay restaurantes registrados</p>
          <button className={styles.addBtn} onClick={openCreate}>
            <Plus size={16} /> Crear primer restaurante
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {restaurants.map(r => (
            <div key={r.id} className={`${styles.card} ${!r.active ? styles.cardInactive : ""}`}>

              <div className={styles.cardTop}>
                <div className={styles.cardIcon}>{r.name.slice(0, 2).toUpperCase()}</div>
                <div className={`${styles.statusBadge} ${r.active ? styles.badgeActive : styles.badgeInactive}`}>
                  {r.active ? "● Activo" : "● Inactivo"}
                </div>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{r.name}</h3>
                <p className={styles.cardSlug}>/{r.slug}</p>
                {r.address && <p className={styles.cardMeta}>📍 {r.address}</p>}
                {r.phone   && <p className={styles.cardMeta}>📞 {r.phone}</p>}
                <p className={styles.cardMeta}>
                  Creado: {new Date(r.createdAt).toLocaleDateString("es-MX")}
                </p>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={`${styles.toggleBtn} ${r.active ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
                  onClick={() => handleToggleActive(r)}
                  disabled={togglingId === r.id}
                >
                  {r.active
                    ? <><ToggleRight size={16} /> Desactivar</>
                    : <><ToggleLeft size={16} /> Activar</>
                  }
                </button>
                <button className={styles.editBtn} onClick={() => openEdit(r)} title="Editar">
                  <Pencil size={14} />
                </button>
                <button className={styles.userBtn} onClick={() => openCreateUser(r)} title="Crear usuario">
                  <UserPlus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal restaurante ── */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingId ? "Editar restaurante" : "Nuevo restaurante"}
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.field}>
              <label>Nombre del restaurante</label>
              <input
                placeholder="Ej: La Güera Tacos"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Slug <span className={styles.hint}>(identificador único en URL)</span></label>
              <input
                placeholder="la-guera-tacos"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Dirección</label>
                <input
                  placeholder="Calle, Col, Ciudad"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Teléfono</label>
                <input
                  placeholder="449 000 0000"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal crear usuario ── */}
      {showUserModal && targetRestaurant && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Nuevo usuario — {targetRestaurant.name}
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowUserModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.field}>
              <label>Nombre</label>
              <input
                placeholder="Ej: Juan Pérez"
                value={userForm.name}
                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={userForm.email}
                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Rol</label>
              <select
                className={styles.select}
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value as Role })}
              >
                <option value="ADMIN">Admin</option>
                <option value="CAJERO">Cajero</option>
                <option value="MESERO">Mesero</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowUserModal(false)} disabled={savingUser}>
                Cancelar
              </button>
              <button className={styles.saveBtn} onClick={handleSaveUser} disabled={savingUser}>
                {savingUser ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}