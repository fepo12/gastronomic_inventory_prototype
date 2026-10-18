import { supabase } from "@/lib/supabaseClient";

export const VentasService = {
  async obtenerProductos() {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) throw new Error(error.message);
    return data;
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