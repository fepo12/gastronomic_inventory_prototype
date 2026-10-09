import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// 1. Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'TU_SUPABASE_URL'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'TU_SUPABASE_KEY'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export default function DashboardExpress() {
  const [vista, setVista] = useState('pos') // 'pos' | 'cocina' | 'cartera'
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [carrito, setCarrito] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [esFiado, setEsFiado] = useState(false)
  const [escuchando, setEscuchando] = useState(false)

  // 2. Carga inicial de datos desde Supabase
  useEffect(() => {
    cargarDatos()
    
    // Escuchar ventas en tiempo real para la vista de cocina
    const canal = supabase
      .channel('realtime_ventas')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas' }, () => {
        cargarVentas()
      })
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  const cargarDatos = async () => {
    const { data: prodData } = await supabase.from('productos').select('*')
    const { data: cliData } = await supabase.from('clientes').select('*')
    if (prodData) setProductos(prodData)
    if (cliData) setClientes(cliData)
    cargarVentas()
  }

  const cargarVentas = async () => {
    const { data: venData } = await supabase.from('ventas').select('*').order('created_at', { ascending: false })
    if (venData) setVentas(venData)
  }

  // 3. Funciones del Carrito
  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.id === prod.id)
    if (existe) {
      setCarrito(carrito.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item))
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }])
    }
  }

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

  // 4. Dictado por Voz Integrado (Web Speech API)
  const procesarVoz = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) return alert('Usar Google Chrome o Edge para comando de voz.')
    
    const rec = new Speech()
    rec.lang = 'es-CO'
    rec.onstart = () => setEscuchando(true)
    rec.onend = () => setEscuchando(false)
    rec.onresult = (e) => {
      const texto = e.results[0][0].transcript.toLowerCase()
      productos.forEach(prod => {
        if (texto.includes(prod.nombre.toLowerCase())) {
          agregarAlCarrito(prod)
        }
      })
    }
    rec.start()
  }

  // 5. Enviar Venta a Supabase
  const procesarVenta = async () => {
    if (carrito.length === 0) return alert('El carrito está vacío')
    if (esFiado && !clienteId) return alert('Selecciona un cliente para fiar')

    const nuevaVenta = {
      total,
      es_fiado: esFiado,
      cliente_id: esFiado ? clienteId : null,
      estado: 'pendiente'
    }

    const { data, error } = await supabase.from('ventas').insert([nuevaVenta]).select()
    
    if (error) {
      alert('Error al registrar la venta: ' + error.message)
    } else {
      // Si es fiado, actualizar cartera
      if (esFiado) {
        const clienteActual = clientes.find(c => c.id === clienteId)
        const nuevoSaldo = (clienteActual?.saldo_fiado || 0) + total
        await supabase.from('clientes').update({ saldo_fiado: nuevoSaldo }).eq('id', clienteId)
      }
      alert('¡Venta procesada con éxito!')
      setCarrito([])
      setEsFiado(false)
      cargarDatos()
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Navegación Rápida */}
      <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <h1 className="text-xl font-bold text-amber-500">🥟 Gastronomic Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => setVista('pos')} className={`px-4 py-2 rounded ${vista === 'pos' ? 'bg-amber-500 text-black' : 'bg-slate-700'}`}>POS / Venta</button>
          <button onClick={() => setVista('cocina')} className={`px-4 py-2 rounded ${vista === 'cocina' ? 'bg-amber-500 text-black' : 'bg-slate-700'}`}>👨‍🍳 Cocina ({ventas.filter(v => v.estado === 'pendiente').length})</button>
          <button onClick={() => setVista('cartera')} className={`px-4 py-2 rounded ${vista === 'cartera' ? 'bg-amber-500 text-black' : 'bg-slate-700'}`}>👥 Cartera</button>
        </div>
      </header>

      {/* VISTA 1: PUNTO DE VENTA (POS) */}
      {vista === 'pos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Catálogo de Productos</h2>
              <button onClick={procesarVoz} className={`px-3 py-1.5 rounded flex items-center gap-2 ${escuchando ? 'bg-red-600 animate-pulse' : 'bg-indigo-600'}`}>
                🎙️ {escuchando ? 'Escuchando...' : 'Dictar Pedido'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {productos.map(p => (
                <button key={p.id} onClick={() => agregarAlCarrito(p)} className="p-4 bg-slate-800 border border-slate-700 rounded-lg text-left hover:border-amber-500 transition">
                  <div className="font-bold">{p.nombre}</div>
                  <div className="text-amber-400">${p.precio}</div>
                  <div className="text-xs text-slate-400">Stock: {p.stock}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Carrito */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">Carrito de Compras</h2>
              {carrito.map(item => (
                <div key={item.id} className="flex justify-between items-center mb-2">
                  <span>{item.nombre} x{item.cantidad}</span>
                  <span className="font-mono">${item.precio * item.cantidad}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span className="text-amber-400">${total}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={esFiado} onChange={(e) => setEsFiado(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                <span>¿Es Venta a Crédito (Fiado)?</span>
              </label>
              {esFiado && (
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white">
                  <option value="">Seleccionar Cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
              <button onClick={procesarVenta} className="w-full py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400">
                Confirmar y Registrar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: PANTALLA DE COCINA (KDS) */}
      {vista === 'cocina' && (
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-semibold">Comandas en Tiempo Real</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {ventas.filter(v => v.estado === 'pendiente').map(v => (
              <div key={v.id} className="bg-slate-800 border-2 border-amber-500 p-4 rounded-lg">
                <div className="flex justify-between font-bold border-b border-slate-700 pb-2">
                  <span>Orden #{v.id.toString().slice(-4)}</span>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">{v.es_fiado ? 'FIADO' : 'CONTADO'}</span>
                </div>
                <div className="py-4 text-2xl font-bold text-center">${v.total}</div>
                <button 
                  onClick={async () => {
                    await supabase.from('ventas').update({ estado: 'completado' }).eq('id', v.id)
                    cargarVentas()
                  }} 
                  className="w-full py-2 bg-green-600 font-bold rounded hover:bg-green-500"
                >
                  ✅ Despachar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 3: CARTERA / CLIENTES */}
      {vista === 'cartera' && (
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-semibold">Estado de Cuentas por Cobrar</h2>
          <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
            <table className="w-full text-left">
              <thead className="bg-slate-700 text-slate-300">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} className="border-b border-slate-700">
                    <td className="p-3 font-medium">{c.nombre}</td>
                    <td className="p-3 text-slate-400">{c.telefono || 'N/A'}</td>
                    <td className="p-3 text-amber-400 font-bold">${c.saldo_fiado || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}