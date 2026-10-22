import { supabase } from "@/lib/supabaseClient";

export const CocinaService = {
    async obtenerPedidosCocina() {
        const {data: ventas, error: errorVentas} = await supabase
        .from("ventas")
        .select("id, mesa, origen, estado_cocina, created_at")
        .in("estado_cocina", ["pendiente", "en_preparacion"])
        .order("created_at", {ascending: true});

        if (errorVentas) {
            console.error("Error al obtener ventas:", errorVentas);
            throw new Error(errorVentas.message);
        }

        if (!ventas || ventas.length === 0) return [];

        const idsVentas = ventas.map((v) => v.id);
        const {data: detalles, error: errorDetalles} = await supabase
        .from("detalle_ventas")
        .select("id, venta_id, cantidad, producto_id")
        .in("venta_id", idsVentas);

        if (errorDetalles) throw new Error(errorDetalles.message);

        const idsProductos = [...new Set(detalles.map((d) => d.producto_id))];
        const {data: productos, error: errorProds} = await supabase
        .from("productos")
        .select("id, nombre")
        .in("id", idsProductos);

        if (errorProds) console.error("Error cargando productos:", errorProds);

        const mapaNombres = {};
        productos?.forEach((p) => {
            mapaNombres[p.id] = p.nombre;
        });

        const detallesConNombre = detalles.map((d) => ({
            ...d, nombre: mapaNombres[d.producto_id] || `Producto #${d.producto_id}`
        }));

        return ventas.map((venta) => ({
            ...venta, detalle_ventas: detallesConNombre.filter((d) => d.venta_id === venta.id)
        })).filter((pedido) => pedido.detalle_ventas.length > 0);
    },

    async actualizarEstadoCocina(ventaId, nuevoEstado) {
        const {error} = await supabase
        .from("ventas")
        .update({estado_cocina: nuevoEstado})
        .eq("id", ventaId);
        
        if (error) throw new Error(error.message);
    }
};