import { useState, useEffect} from "react";
import { UsuariosService } from "@/services/usuariosService";
import { useRouter } from "next/router";
import styles from "@/styles/usuarios.module.css"

export default function GestionUsuarios() {
    const [personal, setPersonal] = useState([]);
    const [nombre, setNombre] = useState('');
    const [rol, setRol] = useState('mesero');
    const [nuevoPin, setNuevoPin] = useState(null);
    const [cargando, setCargando] = useState(false);
    const router = useRouter();

    const cargarPersonal = async () => {
        try {
            const data = await UsuariosService.obtenerPersonal();
            setPersonal(data || []);
        } catch (err) {
            console.error(err.message);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarPersonal();
    }, []);

    const handleCrearUsuario = async (e) => {
        e.preventDefault();
        if (!nombre.trim()) return alert('Ingrese el nombre del empleado');

        setCargando(true);
        setNuevoPin(null);

        try {
            const empleado = await UsuariosService.registrarEmpleado({nombre, rol});
            setNuevoPin(empleado.pin);
            setNombre('');
            setRol('mesero');
            cargarPersonal();
        } catch (err) {
            alert('Error' + err.message);
        } finally {
            setCargando(false);
        }
    };

    const toggleEstado = async (id, estadoActual) => {
        try {
            await UsuariosService.cambiarEstadoUsuario(id, !estadoActual);
            cargarPersonal();
        } catch (err) {
            alert('Error cambiando estado: ' + err.message);
        }
    };

    const handleCerrarSesion = () => {
    localStorage.removeItem("usuario_pos");
    router.push("/login");
     };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Administracion de Personal</h1>
                    <p className={styles.subtitle}>Registrar empleados. El PIN de 4 digitos se generara automaticamente</p>
                </div>
                <button onClick={handleCerrarSesion} className={styles.btnSalir}>
                    🚪 Cerrar Sesión
                </button>
            </header>

            <div className={styles.layputGrid}>
                {/*Formulario*/}
                <form onSubmit={handleCrearUsuario} className={styles.formCard}>
                    <h3>Nuevo Empleado</h3>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Nombre Completo:</label>
                        <input
                        type="text"
                        required
                        className={styles.inputField}
                        placeholder="Ej: Ana Mesera"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}/>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Rol:</label>
                        <select className={styles.inputField} value={rol} onChange={(e) => setRol(e.target.value)}>
                            <option value="mesero">Mesero</option>
                            <option value="cajero">Cajero</option>
                            <option value="cocina">Cocina</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button type="submit" disabled={cargando} className={styles.submitBtn}>
                        {cargando ? 'Generando PIN...' : 'Registrar y Generar PIN'}
                    </button>
                </form>

                {/**Tabla*/}
                <div className={styles.tableCard}>
                    <h3>Personal Registrado</h3>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr className={styles.tablaHeader}>
                                <th>Nombre</th>
                                <th>Rol</th>
                                <th>PIN Acceso</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personal.map((u) => (
                                <tr key={u.id} className={styles.tableRow}>
                                    <td><strong>{u.nombre}</strong></td>
                                    <td className={styles.rolBadge}>{u.rol.toUpperCase()}</td>
                                    <td className={styles.pinBadge}>{u.pin}</td>
                                    <td>
                                        <button
                                        onClick={() => toggleEstado(u.id, u.activo)}
                                        className={`${styles.statusBtn} ${u.activo ? styles.statusActive : styles.statusInactive}`}>
                                            {u.activo ? 'Activo' : 'Inactivo'}
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