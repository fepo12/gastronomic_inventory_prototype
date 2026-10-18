import { supabase } from "@/lib/supabaseClient";

export const AuthService = {

    async loginConPin(pin) {
        const pinLimpio = String(pin).trim();

        const {data, error} = await supabase
        .from('usuarios')
        .select('id, nombre, rol, activo')
        .eq('pin', pinLimpio)
        .eq('activo', true)
        .maybeSingle();

        if (error) {
            console.error("Error sevuelto por supabase al autenticar:", error);
            throw new Error(`Error de base de datos: ${error.message}`);
        }

        if (!data) {
            throw new Error('PIN o Usuario Inactivo');
        }

        return data;
    }
};