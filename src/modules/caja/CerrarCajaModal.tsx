import { useState } from "react";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import styles from "./CerrarCajaModal.module.css";
import { LockKeyhole, Banknote } from "lucide-react";
import { useToast } from "../../context/ToastContext";

interface Props {
  onCancel: () => void;
}

type Step = "password" | "fondo" | "resumen";

export default function CerrarCajaModal({ onCancel }: Props) {
  const { logout } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [fondoFinal, setFondoFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<any>(null);

  // ── STEP 1: Validar contraseña (sin cerrar aún) ──
  async function handleValidarPassword() {
    if (!password) {
      toast("Ingresa tu contraseña", "warning");
      return;
    }
    // Solo avanzamos al paso de fondo, el cierre ocurre después
    setStep("fondo");
  }

  // ── STEP 2: Cerrar caja con o sin fondo ──
  async function handleCerrar() {
    try {
      setLoading(true);

      const fondo = parseFloat(fondoFinal);
      const body: any = { password };
      if (!isNaN(fondo) && fondo > 0) {
        body.fondoFinal = fondo;
      }

      const data = await apiRequest("/caja/cerrar", {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast("Caja cerrada exitosamente", "success");
      setResumen(data);

      // Impresión automática del corte
      try {
        await apiRequest(`/tickets/print/corte/${data.id}`, { method: "POST" });
      } catch {
        toast("Caja cerrada, pero no se pudo imprimir el corte", "warning");
      }
    } catch (err: any) {
      toast(err.message ?? "Error al cerrar caja", "error");
      // Volver al paso de contraseña si falla
      setStep("password");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(n: number) {
    return `$${(n ?? 0).toFixed(2)}`;
  }

  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const totalGastos = resumen?.gastos?.reduce((s: number, g: any) => s + g.monto, 0) ?? 0;
  const entradas = resumen?.movimientos?.filter((m: any) => m.tipo === "ENTRADA").reduce((s: number, m: any) => s + m.monto, 0) ?? 0;
  const salidas = resumen?.movimientos?.filter((m: any) => m.tipo === "SALIDA" && m.descripcion !== "Fondo para siguiente turno").reduce((s: number, m: any) => s + m.monto, 0) ?? 0;
  const fondo = resumen?.movimientos?.find((m: any) => m.descripcion === "Fondo para siguiente turno");

  // ── STEP 1: Contraseña ──
  if (step === "password") {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.passwordStep}>
            <div className={styles.iconWrapper}>
              <LockKeyhole size={24} />
            </div>
            <div>
              <h3 className={styles.title}>Cerrar Caja</h3>
              <p className={styles.subtitle}>Confirma tu contraseña para continuar</p>
            </div>
            <div>
              <p className={styles.label}>Contraseña</p>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleValidarPassword()}
              />
            </div>
            <button className={styles.btnDanger} onClick={handleValidarPassword} disabled={loading}>
              Continuar
            </button>
            <button
              onClick={onCancel}
              style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 13 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: Fondo final (opcional) ──
  if (step === "fondo") {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.passwordStep}>
            <div className={styles.iconWrapper} style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <Banknote size={24} />
            </div>
            <div>
              <h3 className={styles.title}>Fondo para siguiente turno</h3>
              <p className={styles.subtitle}>
                Opcional — indica el monto a dejar en caja para el siguiente turno.
                Si no deseas dejar fondo, déjalo vacío.
              </p>
            </div>
            <div>
              <p className={styles.label}>Monto del fondo</p>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="$0.00"
                value={fondoFinal}
                onChange={(e) => setFondoFinal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCerrar()}
                autoFocus
              />
            </div>

            <button
              className={styles.btnDanger}
              onClick={handleCerrar}
              disabled={loading}
            >
              {loading ? "Cerrando..." : "Cerrar caja"}
            </button>

            <button
              onClick={() => setStep("password")}
              style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 13 }}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: Resumen / Corte ──
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h3 className={styles.headerTitle}>Corte de Caja</h3>
              <p className={styles.headerSub}>{formatFecha(resumen.fechaCierre)}</p>
            </div>
            <span className={styles.badge}>✓ Cerrada</span>
          </div>
          <div className={styles.totalGeneral}>{formatMoney(resumen.totalGeneral)}</div>
          <div className={styles.totalLabel}>Total en caja al cierre</div>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Fondo inicial</div>
              <div className={styles.cardValue}>{formatMoney(resumen.montoInicial)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Ventas totales</div>
              <div className={`${styles.cardValue} ${styles.green}`}>
                {formatMoney(resumen.totalEfectivo + resumen.totalTarjeta)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Efectivo</div>
              <div className={`${styles.cardValue} ${styles.green}`}>{formatMoney(resumen.totalEfectivo)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Tarjeta</div>
              <div className={`${styles.cardValue} ${styles.blue}`}>{formatMoney(resumen.totalTarjeta)}</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Detalle del turno</div>
            <div className={styles.row}>
              <span>Órdenes completadas</span>
              <span>{resumen.ventas?.length ?? 0}</span>
            </div>
            <div className={styles.row}>
              <span>Gastos registrados</span>
              <span style={{ color: "#DC2626" }}>{formatMoney(totalGastos)}</span>
            </div>
            {entradas > 0 && (
              <div className={styles.row}>
                <span>Entradas manuales</span>
                <span>{formatMoney(entradas)}</span>
              </div>
            )}
            {salidas > 0 && (
              <div className={styles.row}>
                <span>Salidas manuales</span>
                <span>{formatMoney(salidas)}</span>
              </div>
            )}
            {fondo && (
              <div className={styles.row}>
                <span>Fondo siguiente turno</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>
                  {formatMoney(fondo.monto)}
                </span>
              </div>
            )}
            <div className={styles.row}>
              <span>Apertura</span>
              <span>{formatHora(resumen.fechaApertura)}</span>
            </div>
            <div className={styles.row}>
              <span>Cierre</span>
              <span>{formatHora(resumen.fechaCierre)}</span>
            </div>
          </div>

          <p className={styles.turno}>
            Turno del {formatFecha(resumen.fechaApertura)} · {formatHora(resumen.fechaApertura)} – {formatHora(resumen.fechaCierre)}
          </p>

          <button className={styles.btnClose} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}