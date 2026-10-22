import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CocinaService } from "@/services/cocinaService";
import { useRouter } from "next/router";
import styles from "@/styles/cocina.module.css";

export default function CocinaView() {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const router = useRouter();

    const cargarPedidos = async () => {
        try {
            const data = await CocinaService.obtenerPedidosCocina();
            setPedidos(data || []);
        } catch (err) {
            console.error("Error al cargar pedidos de cocina:", err);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarPedidos();

        const canalCocina = supabase
        .channel("realtime_cocina")
        .on("postgres_changes", {event: "*", schema: "public", table: "ventas"}, () => {
            cargarPedidos();
        }).subscribe();
        return () => {
            supabase.removeChannel(canalCocina);
        };
    }, []);

    const handleCompletarPedido = async (id) => {
        if (!id) {
            console.error("El ID del pedido es undefined/nulo", id);
            alert("Error: No se encontró el ID del pedido");
            return;
        }

        try {
            await CocinaService.actualizarEstadoCocina(id, "listo");
            setPedidos((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            alert("Error al actualizar pedido:" + err.message);
        }
    };

    const handleCerrarSesion = async () => {
        localStorage.removeItem("usuario_pos");
        router.push("/login")
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>👨‍🍳 Pantalla de Cocina / KDS</h1>
                    <p>Comandas pendientes en tiempo real</p>
                </div>
                <button onClick={handleCerrarSesion} className={styles.btnSalir}>
                    🚪 Cerrar Sesión
                </button>
            </header>

            {cargando ? (
                <p className={styles.loading}>Cargando comandas...</p>
            ) : pedidos.length === 0 ? (
                <div className={styles.empty}>
                    <span>🍳</span>
                    <p>No hay comandas pendientes por preparar</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {pedidos.map((pedido) => (
                        <div key={pedido.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2>{pedido.origen === "dispositivo_mesero" && pedido.mesa !== "llevar" ? `Mesa #${pedido.mesa}` : "🛍️ Para Llevar"}</h2>
                                <span className={styles.time}>
                                    {new Date(pedido.created_at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                                </span>
                            </div>

                            <div className={styles.cardBody}>
                                <ul>
                                    {pedido.detalle_ventas?.map((item) => (
                                        <li key={item.id}>
                                            <span className={styles.qty}>{item.cantidad}</span>
                                            <span className={styles.itenName}>{item.nombre}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className={styles.cardFooter}>
                                <button onClick={() => handleCompletarPedido(pedido.id)} className={styles.btnListo}>
                                    ✅ Marcar como Listo
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}