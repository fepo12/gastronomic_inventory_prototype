import { supabase } from "@/lib/supabaseClient";

export const CajaService = {
    async obtenerTurnoActivo() {
        const {data, error} = await supabase
        .from("turnos_caja")
        .select("*, usuarios(nombre, rol)")
        .eq("estado", "abierto")
        .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
    },

    async abrirTurno({usuarioId, montoInicial}) {
        const turnoExistente = await this.obtenerTurnoActivo();
        if (turnoExistente) {
            throw new Error("Ya existe un turno de caja abierto actualmente.");
        }

        const {data, error} = await supabase
            .from("turnos_caja")
            .insert([{
                usuario_id: usuarioId,
                monto_inicial: parseFloat(montoInicial) || 0,
                estado: "abierto"
            }])
            .select("*, usuarios(nombre, rol)")
            .single();
        
        if (error) throw new Error(error.message);
        return data;
    },

    async cerrarTurno({turnoId, montoFinal, totalVentas, observaciones}) {
        const {data, error} = await supabase
        .from("turnos_caja")
        .update({
            monto_final_declarado: parseFloat(montoFinal) || 0,
            total_ventas_efectivo: parseFloat(totalVentas) || 0,
            estado: "cerrado",
            closed_at: new Date().toISOString(),
            observaciones
        })
        .eq ("id", turnoId)
        .select()
        .single();

        if (error) throw new Error(error.message);
        return data;
    }
};
