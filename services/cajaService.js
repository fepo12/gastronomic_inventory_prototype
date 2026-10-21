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
                total_ventas_efectivo: 0,
                estado: "abierto"
            }])
            .select("*, usuarios(nombre, rol)")
            .single();
        
        if (error) throw new Error(error.message);
        return data;
    },

    async obtenerPedidosPendientes() {
        const {data, error} = await supabase
        .from("ventas")
        .select("*, detalle_ventas(*)")
        .eq("estado_pago", "pendiente_pago")
        .order("created_at", {ascending: true});

        if (error) throw new Error(error.message);
        return data || [];
    },

    async cobrarPedidos({pedidoIds, metodoPago, montoTotal, turnoactivo}) {
        const {error: errorVenta} = await supabase
        .from("ventas")
        .update({
            estado_pago: "pagado",
            metodo_pago: metodoPago,
            turno_id: turnoactivo.id,
        })
        .in("id", pedidoIds);

        if (errorVenta) throw new Error(errorVenta.message);

        if (metodoPago === "efectivo") {
            const nuevoTotalEfectivo = (parseFloat(turnoActivo.total_ventas_efectivo) || 0) + parseFloat(montoTotal);

            const {error: errorTurno} = await supabase
            .from("turnos_caja")
            .update({ total_ventas_efectivo: nuevoTotalEfectivo })
            .eq("id", turnoactivo.id);

            if (errorTurno) throw new Error(errorTurno.message);
        }
        return true;
    },

    async obtenerPedidosCobrados({turnoId}) {
        const {data, error} = await supabase
        .from("ventas")
        .select("*, detalle_ventas(*)")
        .eq("turno_id", turnoId)
        .eq("estado_pago", "pendiente")
        .order("created_at", {ascending: false});

        if (error) throw new Error(error.message);
        return data || [];
    },

    async cobrarPedido({pedidoId, metodoPago, montoTotal, turnoactivo}) {
        const {error: errorVenta} = await supabase
        .from("ventas")
        .update({
            estado_pago: "pagado",
            metodo_pago: metodoPago,
            turno_id: turnoactivo.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", pedidoId);

        if (errorVenta) throw new Error(errorVenta.message);

        if (metodoPago === "efectivo") {
            const nuevoTotalEfectivo = (parseFloat(turnoactivo.total_ventas_efectivo) + parseFloat(montoTotal)) || 0;
            const {error: errorTurno} = await supabase
                .from("turnos_caja")
                .update({ total_ventas_efectivo: nuevoTotalEfectivo })
                .eq("id", turnoactivo.id);

            if (errorTurno) throw new Error(errorTurno.message);
        }
        return true;
    },

    async cerrarTurno({turnoId, montoFinal, totalVentas, observaciones}) {
        const {data, error} = await supabase
        .from("turnos_caja")
        .update({
            monto_final_declarado: parseFloat(montoFinal) || 0,
            total_ventas_efectivo: parseFloat(totalVentas) || 0,
            estado: "cerrado",
            closed_at: new Date().toISOString(),
            observaciones: observaciones || "Cierre automatico Caja",
        })
        .eq ("id", turnoId)
        .select()
        .single();

        if (error) throw new Error(error.message);
        return data;
    }
};
