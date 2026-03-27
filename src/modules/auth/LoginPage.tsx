import styles from "./login.module.css";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  async function handleLogin() {
    if (!email || !password) {
      toast("Ingresa tu email y contraseña", "warning");
      return;
    }

    try {
      setLoading(true);
      const loggedUser = await login(email, password);

      if (loggedUser?.isSuperAdmin) {
        navigate("/superadmin");
      } else if (loggedUser?.role === "MESERO") {
        navigate("/mesero");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast(error.message ?? "Credenciales incorrectas", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>SSA POS</h1>
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <div style={{ position: "relative", width: "100%" }}>
          <input
            className={styles.input}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ paddingRight: "2.75rem", width: "100%", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 0 }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button className={styles.button} onClick={handleLogin} disabled={loading}>
          {loading ? "Ingresando..." : "Login"}
        </button>
      </div>
    </div>
  );
}