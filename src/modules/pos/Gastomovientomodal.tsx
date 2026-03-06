import { useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./GastoMovimientoModal.module.css";

type Tab = "GASTO" | "ENTRADA" | "SALIDA";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GastoMovimientoModal({ onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("GASTO");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setMonto("");
    setConcepto("");
    setDescripcion("");
    setPassword("");
    setError(null);
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    resetForm();
  }

  async function handleConfirm() {
    if (!monto || Number(monto) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    if (tab === "GASTO" && !concepto.trim()) {
      setError("El concepto es obligatorio");
      return;
    }

    if (!password) {
      setError("La contraseña es obligatoria");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (tab === "GASTO") {
        await apiRequest("/caja/gasto", {
          method: "POST",
          body: JSON.stringify({
            concepto,
            monto: Number(monto),
            password,
          }),
        });
      } else {
        await apiRequest("/caja/movimiento", {
          method: "POST",
          body: JSON.stringify({
            tipo: tab, // "ENTRADA" | "SALIDA"
            monto: Number(monto),
            descripcion: descripcion || undefined,
            password,
          }),
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error al registrar");
    } finally {
      setLoading(false);
    }
  }

  const TAB_CONFIG: Record<Tab, { label: string; color: string }> = {
    GASTO:   { label: "Gasto",   color: "#ef4444" },
    ENTRADA: { label: "Entrada", color: "#22c55e" },
    SALIDA:  { label: "Salida",  color: "#f59e0b" },
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Registrar movimiento</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(["GASTO", "ENTRADA", "SALIDA"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ""}`}
              style={tab === t ? { borderBottomColor: TAB_CONFIG[t].color, color: TAB_CONFIG[t].color } : {}}
              onClick={() => handleTabChange(t)}
            >
              {TAB_CONFIG[t].label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {error && <div className={styles.errorMsg}>{error}</div>}

          {/* Monto */}
          <div className={styles.field}>
            <label className={styles.label}>Monto</label>
            <input
              className={styles.input}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>

          {/* Concepto (solo GASTO) */}
          {tab === "GASTO" && (
            <div className={styles.field}>
              <label className={styles.label}>Concepto</label>
              <input
                className={styles.input}
                placeholder="Ej. Compra de insumos"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>
          )}

          {/* Descripción (ENTRADA / SALIDA) */}
          {(tab === "ENTRADA" || tab === "SALIDA") && (
            <div className={styles.field}>
              <label className={styles.label}>Descripción (opcional)</label>
              <input
                className={styles.input}
                placeholder="Ej. Fondo de cambio"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          )}

          {/* Contraseña */}
          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
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
            style={{ background: TAB_CONFIG[tab].color }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Registrando..." : `Registrar ${TAB_CONFIG[tab].label}`}
          </button>
        </div>

      </div>
    </div>
  );
}