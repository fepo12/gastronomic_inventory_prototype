import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ProductosService } from "@/services/productosService";
import styles from "@/styles/productos.module.css";

export default function GestionProductos() {
    const router = useRouter();
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState({
        nombre: "",
        precio: "",
        categoria_id: "",
        stock: "0",
        description: "",
    });

    useEffect (() => {
        const session = localStorage.getItem("usuario_pos");
        if (!session) {
            router.push("/login");
            return;
        }

        const userObj = JSON.parse(session);
        if (userObj.rol?.toLowerCase() !== "admin") {
            router.push("/login")
            return;
        // eslint-disable-next-line react-hooks/immutability
        } CargarDatos(); 
    }, [router]);

    const CargarDatos = async () => {
        setCargando(true);
        try {
            const [prods, cats] = await Promise.all([
                ProductosService.obtenerProductos(),
                ProductosService.obtenerCategorias(),
            ]);
            setProductos(prods);
            setCategorias(cats);
        } catch (err) {
            setError("Error al cargar datos:" + err.message);
        } finally {
            setCargando(false);
        }
    };

    const limpiarFormulario = () => {
        setEditandoId(null);
        setForm({nombre: "", precio: "", categoria_id: "", stock: "0", description: ""});
    }; 

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.nombre || !form.precio) {
            setError("Nombre y precio son obligatorios.");
            return;
        }

        try{
            setError("");
            if (editandoId) {
                await ProductosService.actualizarProductos(editandoId, form);
            } else {
                await ProductosService.crearProducto(form);
            }
            limpiarFormulario();
            await CargarDatos();
        } catch (err) {
            setError("Error al guardar:" + err.message);
        }
    };
    
    const handleEditarClick = (prod) => {
        setEditandoId(prod.id);
        setForm({
            nombre: prod.nombrer,
            precio: prod.precio,
            categoria_id: prod.categoria_id || "",
            stock: prod.stock ?? "0",
            description: prod.description || "",
        });
    };

    if (cargando) {
        return <div className={styles.loading}>Cargando Catalogo...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>🍔 Gestión de Menú</h1>
                    <p className={styles.subtitle}>Administracion de productos y categorias de tu menú</p>
                </div>
                <button onClick={() => router.push("../admin/usuarios")} className={styles.btnNav}>
                    Ir a usuarios
                </button>
            </header>

            {error && <div className={styles.errorBox}>❌ {error}</div>}

            <div className={styles.grid}>
                <div className={styles.formCard}>
                    <h3>{editandoId ? "✏️ Editar Producto" : "➕ Nuevo Producto"}</h3>
                    <form onSubmit={handleGuardar}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nombre del Producto:</label>
                            <input type="text" placeholder="Ej: Empanada de Pollo" value={form.nombre} onChange={(e) => setForm({
                                ...form, nombre: e.target.value})} className={styles.input} required/>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Precio ($):</label>
                            <input type="number" step="any" placeholder="Ej: 3000" value={form.precio} onChange={(e) => setForm({
                            ...form, precio: e.target.value})} className={styles.input} required/>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Categorías:</label>
                            <select className={styles.select} value={form.categoria_id} onChange={(e) => setForm({...form, categoria_id: e.target.value})}>
                                <option value="">-- Sin Categoria --</option>
                                {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Stock Inicial / Actual:</label>
                            <input type="number" placeholder="Ej: 40" value={form.stock} onChange={(e) => setForm({
                            ...form, stock: e.target.value})} className={styles.input}/>
                        </div>

                        <button type="submit" className={styles.btnPrimary}>
                            {editandoId ? "Guardar Cambios" : "crear Producto"}
                        </button>

                        {editandoId && (
                            <button type="button" onClick={limpiarFormulario} className={styles.btnSecondary}>
                                Cancelar Edición
                            </button>
                        )}
                    </form>
                </div>

                <div className={styles.card}>
                    <h3>Productos Registrados ({productos.length})</h3>
                    <table className={styles.table}>
                        <thead>
                            <tr className={styles.tableHeader}>
                                <th>Nombre</th>
                                <th>Categoria</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                        {productos.map((prod) => (
                            <tr key={prod.id} className={styles.tableRow}>
                                <td className={styles.prdoName}>{prod.nombre}</td>
                                <td className={styles.prodCategory}>{prod.categorias?.nombre || "-"}</td>
                                <td className={styles.prodPrice}>${parseFloat(prod.precio).toLocaleString()}</td>
                                <td style={{ width: "15%", textAlign: "center", color: "#f8fafc" }}>{prod.stock ?? 0}</td>
                                <td style={{textAlign: "right"}}>
                                    <button onClick={() => handleEditarClick(prod)} className={styles.btnEdit}>
                                        ✏️ Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}