import { useState } from "react";
import styles from "./inventoryModal.module.css";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateInventoryModal({ onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name || !stock) {
      toast("Completa todos los campos", "warning");
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/inventory", {
        method: "POST",
        body: JSON.stringify({ name, stock: Number(stock), unit }),
      });
      toast("Item de inventario creado", "success");
      onCreated();
      onClose();
    } catch (error: any) {
      toast(error.message ?? "Error creando item de inventario", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Create Inventory Item</h3>

        <input
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <input
          type="number"
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="pcs">pcs</option>
          <option value="kg">kg</option>
          <option value="lt">lt</option>
          <option value="box">box</option>
        </select>

        <div className={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}