import { useState, useEffect } from "react";
import { VentasService } from "../services/ventasService";
import styles from '../styles/pos.module.css';

export default function POS() {
  const [usuario, setUsuario] = useState({ id: 2, nombre: 'Juan', rol: 'mesero' });
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [cargando, setCargando] = useState(false);

  const esMesero = usuario.rol === 'mesero';

  useEffect(() => {
    VentasService.obtenerProductos()
      .then((data) => setProductos(data || []))
      .catch((err) => console.error(err));
  }, []);

  const cambiarRol = (e) => {
    const nuevoRol = e.target.value;
    setUsuario({
      id: nuevoRol === 'mesero' ? 2 : 1,
      nombre: nuevoRol === 'mesero' ? 'Juan (Mesero)' : 'Carlos (Cajero)',
      rol: nuevoRol
    });
  };

  const agregarProducto = (prod) => {
    const existe = carrito.find((i) => i.id === prod.id);
    if (existe) {
      setCarrito(carrito.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)));
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const handleSubmit = async () => {
    if (carrito.length === 0) return alert('El carrito está vacío');
    if (esMesero && !mesa) return alert('Ingrese el número de mesa');

    setCargando(true);
    try {
      const venta = await VentasService.registrarOrden({
        usuario,
        origen: esMesero ? 'mesero_dispositivo' : 'caja',
        mesa,
        metodoPago,
        carrito,
        total
      });
      alert(`Orden #${venta.id} registrada con éxito`);
      setCarrito([]);
      setMesa('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Catálogo de Productos */}
      <div className={styles.catalogoSection}>
        <div className={styles.topBar}>
          <div>
            <h1 className={styles.headerTitle}>Punto de Venta</h1>
            <p className={styles.headerSubtitle}>Atiende: <strong>{usuario.nombre}</strong></p>
          </div>

          <div className={styles.roleSelector}>
            <label htmlFor="role">Rol actual: </label>
            <select id="role" value={usuario.rol} onChange={cambiarRol} className={styles.roleSelect}>
              <option value="mesero">Mesero</option>
              <option value="cajero">Cajero</option>
            </select>
          </div>
        </div>

        <div className={styles.gridProducts}>
          {productos.map((p) => (
            <button key={p.id} className={styles.productCard} onClick={() => agregarProducto(p)}>
              <h4 className={styles.productTitle}>{p.nombre}</h4>
              <p className={styles.productPrice}>${Number(p.precio).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito de Compras / Comanda */}
      <div className={styles.cartPanel}>
        <div>
          <div className={styles.cartHeader}>
            <h3>{esMesero ? 'Comanda Cocina' : 'Cobro Directo'}</h3>
            <span>{carrito.length} ítems</span>
          </div>

          <input
            type="text"
            className={styles.inputField}
            placeholder="Nº de Mesa (Ej: Mesa 3)"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
          />

          <div className={styles.cartItemsList}>
            {carrito.map((item, idx) => (
              <div key={idx} className={styles.cartItem}>
                <div>
                  <div className={styles.cartItemName}>{item.nombre}</div>
                  <div className={styles.cartItemPrice}>x{item.cantidad} - ${Number(item.precio * item.cantidad).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {!esMesero && (
            <select
              className={styles.inputField}
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="efectivo">Pago en Efectivo</option>
              <option value="transferencia">Transferencia Nequi/Daviplata</option>
            </select>
          )}

          <div className={styles.totalSection}>
            <span>Total:</span>
            <span>${total.toLocaleString()}</span>
          </div>

          <button
            className={styles.actionButton}
            onClick={handleSubmit}
            disabled={cargando || carrito.length === 0}
          >
            {cargando ? 'Procesando...' : esMesero ? 'Enviar a Cocina' : 'Cobrar Orden'}
          </button>
        </div>
      </div>
    </div>
  );
}