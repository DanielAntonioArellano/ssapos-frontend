import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../services/api";

interface Caja {
  id: number;
  montoInicial: number;
  fechaApertura: string;
  fechaCierre: string | null;
}

interface CajaContextType {
  caja: Caja | null;
  loading: boolean;
  refreshCaja: () => Promise<void>;
}

const CajaContext = createContext<CajaContextType | undefined>(undefined);

export function CajaProvider({ children }: { children: React.ReactNode }) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshCaja() {
    try {
      const data = await apiRequest("/caja/actual");
      setCaja(data);
    } catch {
      setCaja(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCaja();
  }, []);

  return (
    <CajaContext.Provider value={{ caja, loading, refreshCaja }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  const context = useContext(CajaContext);
  if (!context) {
    throw new Error("useCaja must be used inside CajaProvider");
  }
  return context;
}