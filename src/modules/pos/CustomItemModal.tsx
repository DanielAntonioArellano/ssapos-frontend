import { useState } from "react";
import styles from "./modal.module.css";
import { useToast } from "../../context/ToastContext";

interface Props {
  onClose: () => void;
  onAdd: (item: {
    name: string;
    price: number;
  }) => void;
}

export default function CustomItemModal({ onClose, onAdd }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function handleAdd() {
    if (!name.trim() || !price) {
      toast("Completa nombre y precio", "warning");
      return;
    }

    onAdd({ name, price: Number(price) });
    onClose();
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2>Custom Product</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className={styles.inputGroup}>
          <label>Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Precio</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>

        <div className={styles.modalActions}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.primaryBtn} onClick={handleAdd}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}