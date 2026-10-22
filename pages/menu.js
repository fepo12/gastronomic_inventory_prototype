import { useState, useEffect } from "react";
import { VentasService } from "@/services/ventasService";
import { useRouter } from "next/router";
import styles from "@/styles/menu.module.css";

export default function MenuPedidosView(){
    const [productos, setProductos] = useState([]);
    const [comanda, setComanda] = useState([]);
    const [tipoPedido,  setTipoPedido] = useState("mesa");
    const [mesa, setMesa] = useState("1");
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState({tipo: "", texto: ""});
    const router = useRouter();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability
        cargarProducto();
    }, []);

    const handleCerrarSesion = () => {
        localStorage.removeItem("usuario_pos");
        router.push("/login");
    }

    const cargarProducto = async () => {
        try {
            const data = await VentasService.obtenerProductos();
            setProductos(data);
        } catch (err) {
            setMensaje({tipo: "error", texto: "Error al cargar el menu: " + err.mensaje});
        }
    };

    const agregarAlPedido = (producto) => {
        setComanda((prev) => {
            const existe = prev.find((item) => item.id === producto.id);
            if (existe) {
                return prev.map((item) => item.id === producto.id ? {...item, cantidad: item.cantidad + 1}: item);
            }
            return [...prev, {...producto, cantidad: 1}];
        });
    };

    const cambiarCantidad = (id, delta) => {
        setComanda ((prev) => prev.map((item) => {
            if (item.id === id) {
                const nuevaCantidad = item.cantidad + delta;
                return nuevaCantidad > 0 ? {...item, cantidad: nuevaCantidad}: null; 
            }
            return item;
        }).filter(Boolean));
    };

    const totalOrden = comanda.reduce (
        (acc, item) => acc + parseFloat(item.precio) * item.cantidad,
        0
    );

    const handleEnviarComanda = async () => {
        if (comanda.length === 0) {
            setMensaje({tipo: "error", texto: "Agregar al menos uhnproducto a la orden."});
            return;
        }

        try {
            setCargando(true);
            setMensaje({tipo: "", texto: ""});

            const session = localStorage.getItem("usuario_pos");
            const user = session ? JSON.parse(session): null;

            await VentasService.crearPedido({
                mesaId: tipoPedido === "mesa" ? mesa : "Llevar",
                origen: "dispositivo_mesero",
                items: comanda,
                usuarioId: user?.id
            });

            setMensaje({tipo: "exito", texto: "🚀 ¡Comanda enviada a Caja y Cocina!"});
            setComanda([]);
        } catch (err) {
            console.error("Error al enviar la comanda:", err);
            setMensaje({tipo: "error", texto: "Error al registrar la comanda:" + err.message});
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>🍽️ Menú & Toma de Pedidos</h1>
                    <p>Seleccionar productos para la comanda</p>
                </div>

                <div className={styles.configMesa}>
                    <label>Tipo:</label>
                    <select 
                    value={tipoPedido}
                    onChange={(e) => setTipoPedido(e.target.value)}
                    className={styles.selectInput}>
                        <option value="mesa">🪑 Mesa en Salón</option>
                        <option value="llevar">🛍️ Para Llevar</option>
                    </select>
                </div>

                {tipoPedido === "mesa" && (
                    <div className={styles.fielId}>
                        <label>N° Mesa:</label>
                        <input
                        type="number"
                        value={mesa}
                        onChange={(e) => setMesa(e.target.value)}
                        className={styles.numInput}
                        min="1"/>
                    </div>
                )}

                <button onClick={handleCerrarSesion} className={styles.btnLogout}>
                    🚪 Cerrar Sesión
                </button>
            </header>

            <div className={styles.mainGrid}>
                <div className={styles.catalogoSection}>
                    <h2 className={styles.sectionTitle}>Catalogo de productos</h2>
                    <div className={styles.productGrid}>
                        {productos.map((prod) => (
                            <div key={prod.id} className={styles.productCard} onClick={() => agregarAlPedido(prod)}>
                                <div className={styles.productHeader}>
                                    <span className={styles.prodName}>{prod.nombre}</span>
                                </div>
                                <div className={styles.prodPrice}>
                                    ${parseFloat(prod.precio || 0).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.orderCard}>
                    <h3>Comanda Actual ({tipoPedido === "mesa" ? `Mesa #${mesa}`: "Para Llevar"})</h3>

                    {comanda.length === 0 ? (
                        <div className={styles.emptyOrder}>
                            <p>🛒 No has agregado ítems</p>
                        </div>
                    ): (
                        <div className={styles.itemList}>
                            {comanda.map((item) => (
                                <div key={item.id} className={styles.itemRow}>
                                    <div className={styles.itemDetail}>
                                        <strong>{item.nombre}</strong>
                                        <span>${parseFloat(item.precio).toLocaleString()} c/u</span>
                                    </div>
                                    <div className={styles.qtyBox}>
                                        <button onClick={() => cambiarCantidad(item.id, -1)}>-</button>
                                        <span>{item.cantidad}</span>
                                        <button onClick={() => cambiarCantidad(item.id, 1)}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.orderFooter}>
                        <div className={styles.totalBox}>
                            <span>Total Comanda:</span>
                            <strong>${totalOrden.toLocaleString()}</strong>
                        </div>

                        <button 
                        onClick={handleEnviarComanda}
                        className={styles.btnSubmit}
                        disabled={Boolean(cargando || comanda.length === 0)}>
                            {cargando ? "Enviando..." : "📤 Enviar Comanda a Caja"}
                        </button>
                        
                        {mensaje.texto && (
                            <div className={mensaje.tipo === "exito" ? styles.msgExito : styles.msgError}>
                                {mensaje.texto}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}