import { supabase } from "@/lib/supabaseClient";

export const CajaService = {
    async obtenerTurnoActivo() {
        const {data: turno, error} = await supabase
        .from("turnos_caja")
        .select("*, usuarios(nombre, rol)")
        .eq("estado", "abierto")
        .maybeSingle();

        if (error || !turno) return null;
        
        const {data: ventasEfectivo, error: erroVentas} = await supabase
        .from("ventas")
        .select("total")
        .eq("turno_id", turno.id)
        .eq("estado_pago", "pagado")
        .eq("metodo_pago", "efectivo")

        const totalCalculado = (ventasEfectivo || []).reduce(
        (acc, v) => acc + parseFloat(v.total || 0), 0
        );

        return {
            ...turno, total_venta_efectivo: totalCalculado,
        };
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

    async cobrarPedidos({pedidoId, metodoPago, montoTotal, turnoActivo}) {
        const {error: errorVenta} = await supabase
        .from("ventas")
        .update({
            estado_pago: "pagado",
            metodo_pago: metodoPago,
            turno_id: turnoActivo.id,
        })
        .eq("id", pedidoId);

        if (errorVenta) throw new Error(errorVenta.message);

        if (metodoPago === "efectivo") {
            const acumuladoActual = parseFloat(turnoActivo.total_ventas_efectivo || turnoActivo.total_venta_efectivo || 0);
            const nuevoTotalEfectivo = acumuladoActual + parseFloat(montoTotal || 0);

            const {error: errorTurno} = await supabase
            .from("turnos_caja")
            .update({ total_ventas_efectivo: nuevoTotalEfectivo })
            .eq("id", turnoActivo.id);

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
