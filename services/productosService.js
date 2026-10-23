import { supabase } from "@/lib/supabaseClient";

export const ProductosService = {
    async obtenerProductos() {
        const {data, error} = await supabase
        .from("productos")
        .select("*")
        .order("id", {ascending: true});

        if (error) throw new Error(error.message);
        return data || [];
    },

    async obtenerCategorias() {
        const {data, error} = await supabase
        .from("categorias")
        .select("id, nombre, activo")
        .eq("activo", true)
        .order("nombre", {ascending: true});

        if (error) throw new Error(error.message);
        return data || [];
    },

    async crearProducto(producto) {
        const {data, error} = await supabase
        .from("productos")
        .insert([{
            nombre: producto.nombre,
            precio: parseFloat(producto.precio),
            categoria_id: producto.categoria_id ? parseInt(producto.categoria_id) : null,
            stock: producto.stock ? parseInt(producto.stock) : 0,
            description: producto.description || null,
        }]).select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    async actualizarProductos(id, cambios) {
        const {data, error} = await supabase
        .from("productos")
        .update({
            nombre: cambios.nombre,
            precio: parseFloat(cambios.precio),
            categoria_id: cambios.categoria_id ? parseInt(cambios.categoria_id) : null,
            stock: cambios.stock ? parseInt(cambios.stock) : 0,
            description: cambios.description || null,
        })
        .eq("id", id)
        .select();

        if (error) throw new Error(error.message);
        return data[0];
    },
};