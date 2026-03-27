// components/PrinterStatus.tsx
import { useEffect, useState } from "react";
import { apiRequest } from "../../src/services/api";
import { useCaja } from "../../src/context/CajaContext";

type Status = "online" | "offline" | "unknown";

export default function PrinterStatus() {
  const { caja } = useCaja();
  const [status, setStatus] = useState<Status>("unknown");
  const [pendingJobs, setPendingJobs] = useState(0);

  useEffect(() => {
    if (!caja) return;
    checkStatus();
    const interval = setInterval(checkStatus, 15000); // revisar cada 15s
    return () => clearInterval(interval);
  }, [caja]);

  async function checkStatus() {
    try {
      const data = await apiRequest("/printer/status");
      setStatus(data.connected ? "online" : "offline");
      setPendingJobs(data.pendingJobs ?? 0);
    } catch {
      setStatus("unknown");
    }
  }

  if (!caja) return null;

  const config: Record<Status, { color: string; bg: string; dot: string; label: string }> = {
    online:  { color: "#16a34a", bg: "#dcfce7", dot: "#22c55e", label: "Impresora online"  },
    offline: { color: "#dc2626", bg: "#fee2e2", dot: "#ef4444", label: "Impresora offline" },
    unknown: { color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af", label: "Sin estado"        },
  };

  const c = config[status];

  return (
    <div
      title={pendingJobs > 0 ? `${pendingJobs} ticket(s) pendiente(s) de imprimir` : c.label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 10px",
        borderRadius: "999px",
        background: c.bg,
        fontSize: "0.75rem",
        fontWeight: 600,
        color: c.color,
        cursor: "default",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {/* Dot animado si está online */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: c.dot,
          display: "inline-block",
          animation: status === "online" ? "pulse 2s infinite" : "none",
        }}
      />
      {c.label}
      {pendingJobs > 0 && (
        <span
          style={{
            background: "#f59e0b",
            color: "#fff",
            borderRadius: "999px",
            padding: "1px 6px",
            fontSize: "0.7rem",
          }}
        >
          {pendingJobs} pendiente{pendingJobs !== 1 ? "s" : ""}
        </span>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}