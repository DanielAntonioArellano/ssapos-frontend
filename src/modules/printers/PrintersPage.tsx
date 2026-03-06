// src/modules/printers/PrintersPage.tsx
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import styles from "./PrintersPage.module.css";
import { Printer, Plus, Pencil, Trash2, Wifi, WifiOff, TestTube } from "lucide-react";

interface PrinterItem {
  id: number;
  name: string;
  ip: string;
  port: number;
  role: "CAJA" | "COCINA" | "BARRA";
  active: boolean;
}

const ROLES = ["CAJA", "COCINA", "BARRA"] as const;

const ROLE_LABELS: Record<string, string> = {
  CAJA:   "Caja",
  COCINA: "Cocina",
  BARRA:  "Barra",
};

const ROLE_COLORS: Record<string, string> = {
  CAJA:   "#0f766e",
  COCINA: "#d97706",
  BARRA:  "#7c3aed",
};

const EMPTY_FORM: {
  name: string;
  ip: string;
  port: number;
  role: "CAJA" | "COCINA" | "BARRA";
  active: boolean;
} = {
  name: "",
  ip: "",
  port: 9100,
  role: "CAJA",
  active: true,
};

export default function PrintersPage() {
  const { toast } = useToast();
  const [printers, setPrinters] = useState<PrinterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  useEffect(() => {
    loadPrinters();
  }, []);

  async function loadPrinters() {
    try {
      setLoading(true);
      const data = await apiRequest("/printers");
      setPrinters(data);
    } catch (err: any) {
      toast(err.message ?? "Error al cargar impresoras", "error");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(printer: PrinterItem) {
    setForm({
      name:   printer.name,
      ip:     printer.ip,
      port:   printer.port,
      role:   printer.role,
      active: printer.active,
    });
    setEditingId(printer.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast("El nombre es requerido", "warning");
      return;
    }
    if (!form.ip.trim()) {
      toast("La IP es requerida", "warning");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await apiRequest(`/printers/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast("Impresora actualizada", "success");
      } else {
        await apiRequest("/printers", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast("Impresora creada", "success");
      }
      setShowForm(false);
      loadPrinters();
    } catch (err: any) {
      toast(err.message ?? "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar la impresora "${name}"?`)) return;
    try {
      await apiRequest(`/printers/${id}`, { method: "DELETE" });
      toast("Impresora eliminada", "success");
      loadPrinters();
    } catch (err: any) {
      toast(err.message ?? "Error al eliminar", "error");
    }
  }

  async function handleTest(id: number) {
    try {
      setTestingId(id);
      await apiRequest(`/printers/${id}/test`, { method: "POST" });
      toast("Prueba enviada correctamente", "success");
    } catch (err: any) {
      toast(err.message ?? "No se pudo conectar a la impresora", "error");
    } finally {
      setTestingId(null);
    }
  }

  async function handleToggleActive(printer: PrinterItem) {
    try {
      await apiRequest(`/printers/${printer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !printer.active }),
      });
      toast(
        printer.active ? "Impresora desactivada" : "Impresora activada",
        "success"
      );
      loadPrinters();
    } catch (err: any) {
      toast(err.message ?? "Error al cambiar estado", "error");
    }
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Impresoras</h2>
          <p className={styles.subtitle}>
            Configura las impresoras térmicas de tu restaurante
          </p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}>
          <Plus size={16} />
          Nueva impresora
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : printers.length === 0 ? (
        <div className={styles.emptyState}>
          <Printer size={40} color="#9CA3AF" />
          <p>No hay impresoras configuradas</p>
          <button className={styles.addBtn} onClick={openCreate}>
            <Plus size={16} /> Agregar primera impresora
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {printers.map((p) => (
            <div key={p.id} className={`${styles.card} ${!p.active ? styles.cardInactive : ""}`}>

              {/* Role badge */}
              <div className={styles.cardTop}>
                <span
                  className={styles.roleBadge}
                  style={{ background: ROLE_COLORS[p.role] + "18", color: ROLE_COLORS[p.role] }}
                >
                  {ROLE_LABELS[p.role]}
                </span>
                <button
                  className={styles.toggleBtn}
                  onClick={() => handleToggleActive(p)}
                  title={p.active ? "Desactivar" : "Activar"}
                >
                  {p.active
                    ? <Wifi size={16} color="#059669" />
                    : <WifiOff size={16} color="#9CA3AF" />
                  }
                </button>
              </div>

              {/* Info */}
              <div className={styles.cardBody}>
                <h3 className={styles.printerName}>{p.name}</h3>
                <p className={styles.printerIp}>
                  <span className={styles.ipLabel}>IP</span>
                  {p.ip}:{p.port}
                </p>
                <span className={p.active ? styles.statusActive : styles.statusInactive}>
                  {p.active ? "● Activa" : "● Inactiva"}
                </span>
              </div>

              {/* Actions */}
              <div className={styles.cardActions}>
                <button
                  className={styles.testBtn}
                  onClick={() => handleTest(p.id)}
                  disabled={testingId === p.id || !p.active}
                  title="Probar conexión"
                >
                  <TestTube size={14} />
                  {testingId === p.id ? "Probando..." : "Probar"}
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => openEdit(p)}
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(p.id, p.name)}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              {editingId ? "Editar impresora" : "Nueva impresora"}
            </h3>

            <div className={styles.field}>
              <label>Nombre</label>
              <input
                placeholder="Ej: Impresora Cocina"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Dirección IP</label>
                <input
                  placeholder="192.168.1.100"
                  value={form.ip}
                  onChange={(e) => setForm({ ...form, ip: e.target.value })}
                />
              </div>
              <div className={styles.fieldSmall}>
                <label>Puerto</label>
                <input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Rol</label>
              <div className={styles.roleSelector}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm({ ...form, role: r })}
                    className={`${styles.roleBtn} ${form.role === r ? styles.roleBtnActive : ""}`}
                    style={form.role === r ? {
                      background: ROLE_COLORS[r] + "18",
                      borderColor: ROLE_COLORS[r],
                      color: ROLE_COLORS[r],
                    } : {}}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Impresora activa
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}