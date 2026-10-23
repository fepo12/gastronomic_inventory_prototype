import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CajaService } from "@/services/cajaService";
import { supabase } from "@/lib/supabaseClient";
import styles from "@/styles/caja.module.css";

export default function CajaView() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [montoInicial, setMontoInicial] = useState("");
  const [tabActiva, setTabActiva] = useState("pendientes"); 
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [pedidosCobrados, setPedidosCobrados] = useState([]);
  const [metodosPagoSeleccionado, setMetodosPagoSeleccionado] = useState({});

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
    cargarDatosIniciales();
  }, [router]);

  useEffect(() => {
    if (!turnoActivo) return;
    const canalVentas = supabase.channel("realtime-caja-ventas").on("postgres_changes", {event: "*", schema: "public", table: "ventas"},
      async () => {
        // eslint-disable-next-line react-hooks/immutability
        await recargarTodo(turnoActivo.id);
      }
    ).subscribe();
    return () => {
      supabase.removeChannel(canalVentas);
    };
  }, [turnoActivo]);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      const turno = await CajaService.obtenerTurnoActivo();
      setTurnoActivo(turno);
      if (turno) {
        await cargarComandas(turno.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const recargarTodo = async (turnoId) => {
    try {
      const turnoActualizado = await CajaService.obtenerTurnoActivo();
      setTurnoActivo(turnoActualizado);
      await cargarComandas(turnoId);
    } catch (err) {
      console.error("Error al sincronizar en Realtime:", err.message);
    }
  };

  const cargarComandas = async (turnoId) => {
    try {
      const pendientes = await CajaService.obtenerPedidosPendientes();
      setPedidosPendientes(pendientes);

      if (turnoId) {
        const cobrados = await CajaService.obtenerPedidosCobrados({ turnoId });
        setPedidosCobrados(cobrados);
      }
    } catch (err) {
      setError("Error al cargar pedidos:" + err.message);
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
      await cargarComandas(nuevoTurno.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmarCobro = async (pedido) => {
    const metodoPago = metodosPagoSeleccionado[pedido.id] || "efectivo";

    try {
      setError("");
      await CajaService.cobrarPedidos({
        pedidoId: pedido.id,
        metodoPago: metodoPago,
        montoTotal: pedido.total || pedido.monto_total,
        turnoActivo: turnoActivo,
      });
      
      if (turnoActivo?.id) {
        await recargarTodo(turnoActivo.id);
        const turnoActualizado = await CajaService.obtenerTurnoActivo();
        setTurnoActivo(turnoActualizado);
      }

    } catch (err) {
      setError("Error al procesar el cobro: " + err.message);
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    const baseInicial = parseFloat(turnoActivo.monto_inicial || 0);
    const totalVentasEfectivo = parseFloat(turnoActivo.total_venta_efectivo || 0);
    const arqueoCalculado = baseInicial + totalVentasEfectivo;

    try {
      setError("");
      setCargando(true);

      await CajaService.cerrarTurno({
        turnoId: turnoActivo.id,
        montoInicial: turnoActivo.monto_inicial,
        totalVentas: parseFloat(turnoActivo.total_venta_efectivo || 0),
        totalEfectivo: turnoActivo.total_venta_efectivo || 0,
      });
      setTurnoActivo(null);
    } catch (err) {
      setError("Error al cerrar la caja: " + err.message);
    } finally {
      setCargando(false);
    }

  };

  const handleCerrarSesion = () => {
    localStorage.removeItem("usuario_pos");
    router.push("/login");
  };

  const handleCambioMetodoPago = (pedidoId, metodo) => { 
    setMetodosPagoSeleccionado((prev) => ({
      ...prev, 
      [pedidoId]: metodo,
    }));
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

  const totalEfectivoVentas = parseFloat(turnoActivo?.total_venta_efectivo || 0);
  const baseInicial = parseFloat(turnoActivo?.monto_inicial || 0);
  const totalArqueoEfectivo = baseInicial + totalEfectivoVentas;

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
          
          <div className={styles.dashboardGrid}>
            
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
                  <span>${baseInicial.toLocaleString()}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Ventas en efectivo</label>
                  <span style={{ color: "#10b981" }}>
                    {totalEfectivoVentas.toLocaleString()}
                  </span>
                </div>
                <div className={styles.infoItem} style={{gridColumn: "span 2"}}>
                  <label>Efectivo Total Esperando en Caja (Arqueo)</label>
                  <span style={{fontSize: "1.4rem", color: "#60a5fa"}}>
                    ${totalArqueoEfectivo.toLocaleString()}
                  </span>
                </div>
              </div>

                <div style={{marginTop: "1.5rem"}}>
                  <button 
                  type="submit"
                  onClick={handleCerrarCaja} 
                  className={styles.btnDanger}
                  style={{width: "100%"}}>
                  🔒 Realizar Cierre de Caja
                  </button>
                </div>
            </div>

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
                    {pedidosPendientes.map((pedido) => (
                      <div key={pedido.id} className={styles.orderCard}>
                        <div className={styles.orderInfo}>
                          <div className={styles.mesaHeader}>
                            <span className={styles.mesaTitle}>
                              Mesa #{pedido.mesa_id || pedido.mesa || "Llevar"}
                            </span>
                            <span className={styles.comandaNum}>
                              Comanda #{pedido.id}
                            </span>
                            <span className={styles.orderTotal}>
                              ${(pedido.total || pedido.monto_total || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className={styles.paymentCol}>
                          <label className={styles.paymentLabel}>Medio de Pago</label>
                          <select
                          value={metodosPagoSeleccionado[pedido.id] || "efectivo"}
                          onChange={(e) => handleCambioMetodoPago(pedido.id, e.target.value)}
                          className={styles.selectInput}>
                            <option value="efectivo">💵 Efectivo</option>
                            <option value="tarjeta">💳 Tarjeta / Datáfono</option>
                            <option value="transferencia">📱 Transferencia / Nequi</option>
                          </select>
                        </div>

                        <div className={styles.confirmCol}> 
                          <button
                          onClick={() => handleConfirmarCobro(pedido)}
                          className={styles.btnSuccess}>
                            ✅ Confirmar y Registrar Pago
                          </button>
                        </div>
                      </div>
                    ))}
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
                    {pedidosCobrados.map((pedido) => (
                      <div key={pedido.id} className={styles.orderCardCobrada}>
                        <div>
                          <strong>Mesa #{pedido.mesa_id || pedido.mesa || "Levar"}</strong> $
                          {(pedido.total || pedido.monto_total || 0).toLocaleString()}
                        </div>
                        <span className={styles.badgePaid}>
                          {pedido.metodo_pago === "efectivo" ? "💵 Efectivo" : "💳 Electrónico"}
                        </span>
                      </div>
                    ))}
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