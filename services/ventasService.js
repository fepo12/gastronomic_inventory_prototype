import { supabase } from "@/lib/supabaseClient";

export const VentasService = {
  async obtenerProductos() {
    const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async crearPedido({mesaId, origen, items, usuarioId}) {
    const totalCalculado = items.reduce (
      (acc, prod) => acc + parseFloat(prod.precio) * prod.cantidad, 0
    );
    
    const {data: venta, error: errorVenta} = await supabase
    .from("ventas")
    .insert([{
      mesa: mesaId || null,
      origen: origen || "dispositivo_mesero",
      total: totalCalculado,
      estado_pago: "pendiente_pago",
      estado_cocina: "pendiente",
      usuario_id: usuarioId || null, 
    }])
    .select()
    .single();

    if (errorVenta) throw new Error(errorVenta.message);

    const detalles = items.map((prod) => ({
      venta_id: venta.id,
      producto_id: prod.id, 
      cantidad: prod.cantidad,
      precio_unitario: prod.precio,
      subtotal: parseFloat(prod.precio) * prod.cantidad 
    }));

    const {error: errorDetalle} = await supabase
    .from("detalle_ventas")
    .insert(detalles);

    if (errorDetalle) throw new Error(errorDetalle.message);

    return venta;
  },

  async registrarOrden({ usuario, origen, mesa, metodoPago, carrito, total }) {
    const esMesero = usuario.rol === 'mesero';

    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert([
        {
          turno_id: null,
          origen: esMesero ? 'dispositivo_mesero' : 'caja',
          mesa: mesa || null,
          metodo_pago: esMesero ? 'efectivo' : metodoPago,
          estado_pago: esMesero ? 'pendiente_pago' : 'pagado',
          estado_cocina: 'pendiente',
          total: total
        }
      ])
      .select()
      .single();

    if (errVenta) throw new Error(errVenta.message);

    const detalles = carrito.map((item) => ({
      venta_id: venta.id,
      producto_id: item.id,
      cantidad: item.cantidad, // Correcto
      precio_unitario: item.precio,
      observaciones: item.observaciones || null
    }));

    const { error: errDetalle } = await supabase.from('detalle_ventas').insert(detalles);

    if (errDetalle) throw new Error(errDetalle.message);

    return venta;
  }
};