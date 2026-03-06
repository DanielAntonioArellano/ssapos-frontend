import { useState } from "react";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import styles from "./inventoryModal.module.css";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Props {
  item: { id: number; name: string; stock: number; unit: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryMovimientoModal({ item, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!cantidad || Number(cantidad) <= 0) {
      toast("Ingresa una cantidad válida", "warning");
      return;
    }
    if (!motivo.trim()) {
      toast("El motivo es requerido", "warning");
      return;
    }

    try {
      setLoading(true);
      await apiRequest(`/inventory/${item.id}/movimiento`, {
        method: "POST",
        body: JSON.stringify({
          tipo,
          cantidad: Number(cantidad),
          motivo,
        }),
      });
      toast(
        `${tipo === "ENTRADA" ? "Entrada" : "Salida"} registrada exitosamente`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message ?? "Error al registrar movimiento", "error");
    } finally {
      setLoading(false);
    }
  }

  const stockNuevo = tipo === "ENTRADA"
    ? item.stock + Number(cantidad || 0)
    : item.stock - Number(cantidad || 0);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>
            Movimiento de Stock
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9CA3AF" }}>
            {item.name} · Stock actual: <strong>{item.stock} {item.unit}</strong>
          </p>
        </div>

        {/* Toggle ENTRADA / SALIDA */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setTipo("ENTRADA")}
            style={{
              flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid",
              borderColor: tipo === "ENTRADA" ? "#059669" : "#E5E7EB",
              background: tipo === "ENTRADA" ? "#ECFDF5" : "white",
              color: tipo === "ENTRADA" ? "#059669" : "#6B7280",
              fontWeight: 600, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <ArrowDownCircle size={16} /> Entrada
          </button>
          <button
            onClick={() => setTipo("SALIDA")}
            style={{
              flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid",
              borderColor: tipo === "SALIDA" ? "#DC2626" : "#E5E7EB",
              background: tipo === "SALIDA" ? "#FEF2F2" : "white",
              color: tipo === "SALIDA" ? "#DC2626" : "#6B7280",
              fontWeight: 600, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <ArrowUpCircle size={16} /> Salida
          </button>
        </div>

        {/* Cantidad */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
            Cantidad ({item.unit})
          </p>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: "1.5px solid #E5E7EB", fontSize: 15, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Motivo */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
            Motivo
          </p>
          <input
            placeholder={tipo === "ENTRADA" ? "Ej: Compra semanal, reposición..." : "Ej: Merma, vencimiento, ajuste..."}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Preview stock nuevo */}
        {cantidad && Number(cantidad) > 0 && (
          <div style={{
            background: "#F9FAFB", borderRadius: 12, padding: "12px 16px",
            marginBottom: 16, display: "flex", justifyContent: "space-between",
            fontSize: 13,
          }}>
            <span style={{ color: "#6B7280" }}>Stock resultante</span>
            <strong style={{ color: stockNuevo < 0 ? "#DC2626" : "#111827" }}>
              {stockNuevo < 0 ? "⚠ Insuficiente" : `${stockNuevo.toFixed(2)} ${item.unit}`}
            </strong>
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 12, borderRadius: 12, border: "1.5px solid #E5E7EB",
              background: "white", color: "#6B7280", fontWeight: 500, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || stockNuevo < 0}
            style={{
              flex: 1, padding: 12, borderRadius: 12, border: "none",
              background: tipo === "ENTRADA" ? "#059669" : "#DC2626",
              color: "white", fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Guardando..." : `Registrar ${tipo === "ENTRADA" ? "Entrada" : "Salida"}`}
          </button>
        </div>
      </div>
    </div>
  );
}