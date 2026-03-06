import { useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./AbrirCajaModal.module.css";
import { Landmark } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export default function AbrirCajaModal({ onSuccess }: any) {
  const { toast } = useToast();
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    if (!monto) {
      toast("Ingresa el monto inicial", "warning");
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/caja/abrir", {
        method: "POST",
        body: JSON.stringify({ montoInicial: Number(monto) }),
      });
      toast("Caja abierta exitosamente", "success");
      onSuccess();
    } catch (err: any) {
      toast(err.message ?? "Error al abrir caja", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <div className={styles.iconWrapper}>
          <Landmark size={24} />
        </div>

        <div>
          <h3 className={styles.title}>Abrir Caja</h3>
          <p className={styles.subtitle}>Ingresa el monto inicial para comenzar el turno</p>
        </div>

        <div>
          <p className={styles.label}>Monto inicial</p>
          <input
            className={styles.input}
            type="number"
            placeholder="$ 0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpen()}
          />
        </div>

        <button className={styles.btn} onClick={handleOpen} disabled={loading}>
          {loading ? "Abriendo..." : "Abrir Caja"}
        </button>

      </div>
    </div>
  );
}