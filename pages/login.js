import { useState, useEffect } from "react";
import { AuthService } from "@/services/authService";
import styles from "@/styles/login.module.css"

export default function LoginView() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [usuarioAutenticado, setUsuarioAutenticado] = useState(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (usuarioAutenticado) return;
            if (e.key >= "0" && e.key <= "9") {
                handlePressNum(e.key);
            } else if (e.key === "Backspace") {
                handleDelete();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pin, usuarioAutenticado]);

    const handlePressNum = (num) => {
        if (pin.length < 4) {
            const nuevoPin = pin + num;
            setPin(nuevoPin);
            setError("");

            if (nuevoPin.length === 4) {
                validarPin(nuevoPin);
            }
        }
    };

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1));
        setError("");
    };

    const handleClear = () => {
        setPin("");
        setError("");
    };

    const validarPin = async (pinAValidar) => {
        setCargando(true);
        try {
            const usuario = await AuthService.loginConPin(pinAValidar);
            setUsuarioAutenticado(usuario);
        } catch (err) {
            setError(err.message || "PIN inválido");
            setPin("");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <h2 className={styles.title}>Inicie Sesión</h2>
                <p className={styles.subtitle}>Ingresa tu PIN de 4 digitos</p>

                {/**Indicadores de pin */}

                <div className={styles.pinDisplay}>
                    {[0, 1, 2, 3].map((idx) => (
                        <div key={idx}
                        className={`${styles.pinDot} ${pin.length > idx ?styles.pinDotActive : ""}`}/>
                    ))}
                </div>

                {/**Teclado Numerico */}
                <div className={styles.keypad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                        key={num}
                        onClick={() => handlePressNum(num.toString())}
                        className={styles.keyBtn}
                        disabled={cargando}>
                            {num}
                        </button>
                    ))}

                    <button onClick={() => handlePressNum("0")} className={`${styles.keyBtn} ${styles.keyBtnAction}`}>
                        C
                    </button>

                    <button
                    onClick={() => handlePressNum("0")}
                    className={styles.keyBtn}
                    disabled={cargando}>
                        0
                    </button>
                    <button onClick={handleDelete} className={`${styles.keyBtn} ${styles.keyBtnAction}`}>
                        ⌫
                    </button>
                </div>

                {error && <p className={styles.errorText}>❌ {error}</p>}

                {/**Resultado de la autenticación Exitosa */}
                {usuarioAutenticado && (
                    <div className={styles.userCard}>
                        <h4 style={{margin: 0, color: "#a7f3d0"}}>✅ ¡Bienvenido!</h4>
                        <p style={{margin: "0.25rem 0 0", color: "#fff", fontWeight: "bold"}}>
                            {usuarioAutenticado.nombre}
                        </p>
                        <span style={{fontSize: "0.8rem", color: "#38bdf8", fontWeight: "bold"}}>
                            Rol: {usuarioAutenticado.rol.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}