import Link from "next/link";
import stayle from "@/styles/home.module.css";

export default function Home() {
  return (
    <div className={stayle.container}>
      <header className={stayle.navbar}>
        <div className={stayle.logo}>🍽️ Gastronomic Inventory</div>
        <Link href="/login" className={stayle.loginBtn}>
          Iniciar Sesión (PIN)
        </Link>
      </header>

      <main className={stayle.hero}>
        <h1 className={stayle.heroTitle}>Bienvenido a Gastronomic Inventory</h1>
        <p className={stayle.heroSubtitle}>
          Gerstor integral de comandas, cocina KDS, turnos de caja y  administracion de seguridad por PIN.
        </p>

        <div className={stayle.actions}>
          <Link href="/login" className={stayle.primaryBtn}>
            Ingresar al Punto de Venta
          </Link>
        </div>

        {/**Tarjetas Informativas de Modulos*/}
        <div className={stayle.grid}>
          <div className={stayle.card}>
            <h3>📲 Comandera Meseros</h3>
            <p>Toma de pedidos ágil desde cualquier dispositivo directamente a cocina.</p>
          </div>
          <div className={stayle.card}>
            <h3>🍳 Pantalla Cocina (KDS)</h3>
            <p>Visualización en tiempo real de órdenes con estados de preparacion.</p>
          </div>
          <div className={stayle.card}>
            <h3>💰 Control de Caja</h3>
            <p>Apertura, cierre de turno y arqueo de caja centralizado.</p>
          </div>
          <div className={stayle.card}>
            <h3>⚙️ Administración</h3>
            <p>Gestion de personal, roles, generacion de PINs y catalogo de productos.</p>
          </div>
        </div>
      </main>
    </div>
  );
}