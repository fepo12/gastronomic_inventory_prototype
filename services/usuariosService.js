import { supabase } from "@/lib/supabaseClient";

const generarPinAleatorio = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

export const UsuariosService = {

    async registrarEmpleado({nombre, rol}) {
        let pinGenerado = generarPinAleatorio();
        let exito = false;
        let intentos = 0;
        let data = null;
        let usuarioCreado = null;

        while (!exito && intentos <5) {
            intentos++;
            const {data, error} = await supabase
            .from('usuarios')
            .insert([{
                nombre, 
                pin: pinGenerado,
                rol, 
                activo: true
            }])
            .select('id, nombre, pin, rol, activo');

            if (!error && data && data.length > 0) {
                exito = true;
                usuarioCreado = data[0];
            } else if (error && error.code === '23505') {
                pinGenerado = generarPinAleatorio();
            } else if (error){
                throw new Error(error.message);
            }
        }

        if (!exito || !usuarioCreado) {
            throw new Error('No se pudo registrar el usuario. Intente Nuevamente')
        }
        return usuarioCreado;
    },

    async obtenerPersonal() {
        const {data,  error} = await supabase
        .from('usuarios')
        .select('id, nombre, pin, rol, activo')
        .order('id', {ascending: true});

        if (error) throw new Error(error.message);
        return data || [];
    },

    async cambiarEstadoUsuario(usuarioId, nuevoEstado){
        const {data, error} = await supabase
        .from('usuarios')
        .update({activo: nuevoEstado})
        .eq('id', usuarioId)
        .select()
        .single();

        if (error) throw new Error(error.message);
        return data;
    }
};