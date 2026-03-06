import styles from "./login.module.css";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
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

      // Redirige según rol
      if (loggedUser?.isSuperAdmin) {
        navigate("/superadmin");
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
        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <button className={styles.button} onClick={handleLogin} disabled={loading}>
          {loading ? "Ingresando..." : "Login"}
        </button>
      </div>
    </div>
  );
}