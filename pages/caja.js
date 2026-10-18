import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CajaService } from "@/services/cajaService";
import styles from "@/styles/caja.module.css";

export default function CajaView() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [montoInicial, setMontoInicial] = useState("");
  const [montoFinal, setMontoFinal] = useState("");
  const [tabActiva, setTabActiva] = useState("pendientes"); 
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [pedidosCobrados, setPedidosCobrados] = useState([]);

  useEffect(() => {
    const session = localStorage.getItem("usuario_pos");
    if (!session) {
      router.push("/login");
      return;
    }
    const userObj = JSON.parse(session);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsuario(userObj);
    // eslint-disable-next-line react-hooks/immutability
    cargarTurnoActivo();
  }, [router]);

  const cargarTurnoActivo = async () => {
    setCargando(true);
    try {
      const turno = await CajaService.obtenerTurnoActivo();
      setTurnoActivo(turno);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    if (!montoInicial || isNaN(montoInicial) || parseFloat(montoInicial) < 0) {
      setError("Ingresa un monto inicial válido.");
      return;
    }

    try {
      setError("");
      const nuevoTurno = await CajaService.abrirTurno({
        usuarioId: usuario.id,
        montoInicial: parseFloat(montoInicial)
      });
      setTurnoActivo(nuevoTurno);
      setMontoInicial("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    if (!montoFinal || isNaN(montoFinal)) {
      setError("Ingresa el monto de arqueo final.");
      return;
    }

    try {
      setError("");
      await CajaService.cerrarTurno({
        turnoId: turnoActivo.id,
        montoFinal: parseFloat(montoFinal),
        totalVentas: 0
      });
      setTurnoActivo(null);
      setMontoFinal("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem("usuario_pos");
    router.push("/login");
  };

  const obtenerHoraApertura = (fechaStr) => {
    if (!fechaStr) return "Ahora";
    const fecha = new Date(fechaStr);
    return isNaN(fecha.getTime()) ? "Hora no disponible" : fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!usuario || cargando) {
    return (
      <div className={styles.container}>
        <div className={styles.centeredContent}>
          <p style={{ color: "#94a3b8" }}>Cargando datos de caja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>💰 Pantalla de Caja</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#94a3b8" }}>
            Cajero en turno: <strong>{usuario.nombre}</strong>
          </p>
        </div>
        <button onClick={handleCerrarSesion} className={styles.logoutBtn}>
          Cerrar Sesión
        </button>
      </header>

      <main>
        {turnoActivo ? (
          /* CAJA ABIERTA: DASHBOARD COMPLETO DE 2 COLUMNAS */
          <div className={styles.dashboardGrid}>
            
            {/* COLUMNA 1: RESUMEN Y CIERRE */}
            <div className={styles.card}>
              <span className={`${styles.statusBadge} ${styles.badgeOpen}`}>
                ● CAJA ABIERTA
              </span>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Control de Turno</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
                Abierto a las: <strong>{obtenerHoraApertura(turnoActivo.fecha_apertura || turnoActivo.created_at)}</strong>
              </p>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Base Inicial</label>
                  <span>${parseFloat(turnoActivo.monto_inicial).toFixed(2)}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Responsable</label>
                  <span style={{ fontSize: "0.95rem" }}>
                    {turnoActivo.usuarios?.nombre || usuario.nombre}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCerrarCaja}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Monto Final en Efectivo (Arqueo):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={montoFinal}
                    onChange={(e) => setMontoFinal(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <button type="submit" className={styles.btnDanger}>
                  🔒 Realizar Cierre de Caja
                </button>
              </form>
            </div>

            {/* COLUMNA 2: COMANDAS / CUENTAS POR COBRAR Y COBRADAS */}
            <div className={styles.card}>
              <div className={styles.tabsHeader}>
                <button
                  className={`${styles.tabBtn} ${tabActiva === "pendientes" ? styles.tabActive : ""}`}
                  onClick={() => setTabActiva("pendientes")}
                >
                  ⏳ Cuentas por Cobrar ({pedidosPendientes.length})
                </button>
                <button
                  className={`${styles.tabBtn} ${tabActiva === "cobradas" ? styles.tabActive : ""}`}
                  onClick={() => setTabActiva("cobradas")}
                >
                  ✅ Historial de Cobros ({pedidosCobrados.length})
                </button>
              </div>

              {tabActiva === "pendientes" ? (
                pedidosPendientes.length === 0 ? (
                  <div className={styles.emptyBox}>
                    <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>🛎️</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>No hay cuentas pendientes por cobrar.</p>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                      Las comandas enviadas por los meseros aparecerán aquí automáticamente.
                    </span>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {/* Render de pedidos por cobrar */}
                  </div>
                )
              ) : (
                pedidosCobrados.length === 0 ? (
                  <div className={styles.emptyBox}>
                    <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>💳</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>Aún no has registrado cobros en este turno.</p>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {/* Render de pedidos cobrados */}
                  </div>
                )
              )}
            </div>

          </div>
        ) : (
          /* CAJA CERRADA: APERTURA CENTRADA */
          <div className={styles.centeredContent}>
            <div className={styles.card} style={{ maxWidth: "440px", width: "100%" }}>
              <span className={`${styles.statusBadge} ${styles.badgeClosed}`}>
                ● CAJA CERRADA
              </span>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Apertura de Turno</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                Ingrese la base inicial de efectivo para iniciar operaciones.
              </p>

              <form onSubmit={handleAbrirCaja}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Monto Base Inicial ($):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej: 50000"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className={styles.input}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className={styles.btnPrimary}>
                  🚀 Abrir Caja y Comenzar Turno
                </button>
              </form>
            </div>
          </div>
        )}

        {error && <div className={styles.errorBox}>❌ {error}</div>}
      </main>
    </div>
  );
}