import { useState, useEffect } from "react";
import { Router } from "lucide-react";
import { useRouter } from "next/router";

export default function MenuView(){
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);

    useEffect(() => {
        const session = localStorage.getItem("usuario_pos");
        if (!session) {
            router.push("/login");
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUsuario(JSON.parse(session));
        }
    }, [router]);

    if (!usuario) return null;

    return (
        <div style={{padding: "2rem", color: "#fff", backgroundColor: "#0b0f19", minHeight: "100hv"}}>
            <h1>📲 Comandera de Meseros</h1>
            <p>Bienvenido, <strong>{usuario.nombre}</strong> ({usuario.rol.toUpperCase()})</p>
            <button 
            onClick={() => {localStorage.removeItem("usuario_pos"); router.push("/login");}}
            style={{padding: "0.5rem 1rem", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer"}}>
                Cerrar Sesión
            </button>
        </div>
    )
}