import db from './database.js';

/**
 * Utilidades de consulta para el panel administrativo.
 * Todo es de solo lectura: no se modifican datos ni el esquema.
 */

const ZONA_HORARIA = 'America/Bogota';

export const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', clase: 'pendiente' },
  preparando: { etiqueta: 'Preparando', clase: 'preparando' },
  enviado: { etiqueta: 'Enviado', clase: 'enviado' },
  entregado: { etiqueta: 'Entregado', clase: 'entregado' },
  cancelado: { etiqueta: 'Cancelado', clase: 'cancelado' },
};

export function infoEstado(estado) {
  return (
    ESTADOS[estado] ?? {
      etiqueta: estado || 'Sin estado',
      clase: 'otro',
    }
  );
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_HORARIA,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatoDiaCorto = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: 'short',
});

const formatoClaveDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatearFecha(fecha) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '—';
  return formatoFecha.format(valor);
}

export function formatearFechaHora(fecha) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '—';
  return formatoFechaHora.format(valor);
}

/** Clave YYYY-MM-DD del día en la zona horaria del restaurante. */
export function claveDia(fecha) {
  return formatoClaveDia.format(new Date(fecha));
}

function inicioDelDia(fecha = new Date()) {
  const valor = new Date(fecha);
  valor.setHours(0, 0, 0, 0);
  return valor;
}

function finDelDia(fecha = new Date()) {
  const valor = inicioDelDia(fecha);
  valor.setDate(valor.getDate() + 1);
  return valor;
}

function fechaDesdeInput(valor) {
  const texto = String(valor ?? '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;

  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

/** Convierte el JSON de items en un arreglo seguro y normalizado. */
export function parsearItems(fila) {
  if (!fila) return [];

  let items = [];

  try {
    items = JSON.parse(fila.items);
  } catch {
    items = [];
  }

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id) || null,
      nombre:
        typeof item.nombre === 'string' && item.nombre.trim()
          ? item.nombre.trim()
          : 'Producto',
      precio: Number(item.precio) || 0,
      cantidad: Math.max(0, Number(item.cantidad) || 0),
      imagen: typeof item.imagen === 'string' ? item.imagen : '',
    }));
}

export function parsearPedido(fila) {
  return {
    ...fila,
    items: parsearItems(fila),
    subtotal: Number(fila.subtotal) || 0,
    envio: Number(fila.envio) || 0,
    total: Number(fila.total) || 0,
    efectivoCon:
      fila.efectivo_con === null || fila.efectivo_con === undefined
        ? null
        : Number(fila.efectivo_con),
    cambio:
      fila.cambio === null || fila.cambio === undefined
        ? null
        : Number(fila.cambio),
    estadoInfo: infoEstado(fila.estado),
    fechaTexto: formatearFechaHora(fila.fecha),
  };
}

export function obtenerResumen() {
  const base = db
    .prepare(
      `
      SELECT
        COUNT(*) AS pedidos,
        COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total ELSE 0 END), 0) AS ventas,
        COALESCE(SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END), 0) AS cancelados,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes
      FROM pagos
    `
    )
    .get();

  const hoyInicio = inicioDelDia().toISOString();
  const hoyFin = finDelDia().toISOString();

  const semanaInicio = inicioDelDia(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  ).toISOString();

  const pedidosEnRango = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) AS total,
      COUNT(*) AS pedidos
    FROM pagos
    WHERE fecha >= ? AND fecha < ? AND estado <> 'cancelado'
  `);

  const hoy = pedidosEnRango.get(hoyInicio, hoyFin);
  const semana = pedidosEnRango.get(semanaInicio, hoyFin);

  const mensajes = db
    .prepare('SELECT COUNT(*) AS total FROM registros')
    .get().total;

  const mensajesSemana = db
    .prepare('SELECT COUNT(*) AS total FROM registros WHERE fecha >= ?')
    .get(semanaInicio).total;

  const pedidosValidos = Number(base.pedidos) - Number(base.cancelados);

  return {
    ventasTotales: Number(base.ventas),
    pedidos: Number(base.pedidos),
    pendientes: Number(base.pendientes),
    cancelados: Number(base.cancelados),
    ticketPromedio:
      pedidosValidos > 0 ? Number(base.ventas) / pedidosValidos : 0,
    ventasHoy: Number(hoy.total),
    pedidosHoy: Number(hoy.pedidos),
    ventasSemana: Number(semana.total),
    pedidosSemana: Number(semana.pedidos),
    mensajes: Number(mensajes),
    mensajesSemana: Number(mensajesSemana),
  };
}

/** Serie diaria de ventas para el gráfico (incluye días sin ventas). */
export function obtenerVentasPorDia(dias = 14) {
  const totalDias = Math.min(60, Math.max(1, Number(dias) || 14));
  const hoy = inicioDelDia();
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - (totalDias - 1));
  const fin = finDelDia(hoy);

  const filas = db
    .prepare(
      `
      SELECT total, fecha
      FROM pagos
      WHERE fecha >= ? AND fecha < ? AND estado <> 'cancelado'
    `
    )
    .all(inicio.toISOString(), fin.toISOString());

  const porDia = new Map();

  for (let i = 0; i < totalDias; i += 1) {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + i);
    porDia.set(claveDia(fecha), { fecha, total: 0, pedidos: 0 });
  }

  for (const fila of filas) {
    const dia = porDia.get(claveDia(fila.fecha));
    if (!dia) continue;
    dia.total += Number(fila.total) || 0;
    dia.pedidos += 1;
  }

  const serie = Array.from(porDia.values());

  return {
    etiquetas: serie.map((dia) => formatoDiaCorto.format(dia.fecha)),
    totales: serie.map((dia) => dia.total),
    pedidos: serie.map((dia) => dia.pedidos),
    totalPeriodo: serie.reduce((total, dia) => total + dia.total, 0),
    pedidosPeriodo: serie.reduce((total, dia) => total + dia.pedidos, 0),
    desde: serie[0]?.fecha ?? null,
    hasta: serie[serie.length - 1]?.fecha ?? null,
  };
}

/** Agrega unidades e ingresos por producto a partir de los pedidos. */
export function obtenerVentasPorProducto() {
  const filas = db
    .prepare("SELECT items FROM pagos WHERE estado <> 'cancelado'")
    .all();

  const productos = new Map();

  for (const fila of filas) {
    for (const item of parsearItems(fila)) {
      const clave = item.id ?? item.nombre;
      const actual = productos.get(clave) ?? {
        id: item.id,
        nombre: item.nombre,
        imagen: item.imagen,
        cantidad: 0,
        ingresos: 0,
      };

      actual.cantidad += item.cantidad;
      actual.ingresos += item.precio * item.cantidad;

      if (!actual.imagen && item.imagen) actual.imagen = item.imagen;

      productos.set(clave, actual);
    }
  }

  return Array.from(productos.values()).sort(
    (a, b) => b.cantidad - a.cantidad || b.ingresos - a.ingresos
  );
}

export function obtenerProductosMasVendidos(limite = 5) {
  const total = Math.min(20, Math.max(1, Number(limite) || 5));
  return obtenerVentasPorProducto().slice(0, total);
}

export function obtenerUltimosPedidos(limite = 5) {
  const total = Math.min(50, Math.max(1, Number(limite) || 5));

  return db
    .prepare('SELECT * FROM pagos ORDER BY fecha DESC, id DESC LIMIT ?')
    .all(total)
    .map(parsearPedido);
}

export function obtenerUltimosMensajes(limite = 5) {
  const total = Math.min(50, Math.max(1, Number(limite) || 5));

  return db
    .prepare('SELECT * FROM registros ORDER BY fecha DESC, id DESC LIMIT ?')
    .all(total);
}

export function obtenerPedidos({
  estado = 'todos',
  busqueda = '',
  desde = '',
  hasta = '',
  pagina = 1,
  porPagina = 10,
} = {}) {
  const condiciones = [];
  const parametros = [];

  const estadoNormalizado = String(estado ?? '').trim();

  if (
    estadoNormalizado &&
    estadoNormalizado !== 'todos' &&
    ESTADOS[estadoNormalizado]
  ) {
    condiciones.push('estado = ?');
    parametros.push(estadoNormalizado);
  }

  const texto = String(busqueda ?? '').trim().slice(0, 80);

  if (texto) {
    const patron = `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
    condiciones.push(
      "(referencia LIKE ? ESCAPE '\\' OR nombre LIKE ? ESCAPE '\\' OR correo LIKE ? ESCAPE '\\')"
    );
    parametros.push(patron, patron, patron);
  }

  const fechaDesde = fechaDesdeInput(desde);

  if (fechaDesde) {
    condiciones.push('fecha >= ?');
    parametros.push(fechaDesde.toISOString());
  }

  const fechaHasta = fechaDesdeInput(hasta);

  if (fechaHasta) {
    fechaHasta.setDate(fechaHasta.getDate() + 1);
    condiciones.push('fecha < ?');
    parametros.push(fechaHasta.toISOString());
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const total = Number(
    db
      .prepare(`SELECT COUNT(*) AS total FROM pagos ${where}`)
      .get(...parametros).total
  );

  const tamano = Math.min(50, Math.max(1, Number(porPagina) || 10));
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const paginaActual = Math.min(
    totalPaginas,
    Math.max(1, Number(pagina) || 1)
  );

  const pedidos = db
    .prepare(
      `SELECT * FROM pagos ${where} ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...parametros, tamano, (paginaActual - 1) * tamano)
    .map(parsearPedido);

  return {
    pedidos,
    total,
    pagina: paginaActual,
    porPagina: tamano,
    totalPaginas,
  };
}

export function obtenerMensajes({
  busqueda = '',
  pagina = 1,
  porPagina = 10,
} = {}) {
  const condiciones = [];
  const parametros = [];

  const texto = String(busqueda ?? '').trim().slice(0, 80);

  if (texto) {
    const patron = `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
    condiciones.push(
      "(nombre LIKE ? ESCAPE '\\' OR correo LIKE ? ESCAPE '\\' OR mensaje LIKE ? ESCAPE '\\')"
    );
    parametros.push(patron, patron, patron);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const total = Number(
    db
      .prepare(`SELECT COUNT(*) AS total FROM registros ${where}`)
      .get(...parametros).total
  );

  const tamano = Math.min(50, Math.max(1, Number(porPagina) || 10));
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const paginaActual = Math.min(
    totalPaginas,
    Math.max(1, Number(pagina) || 1)
  );

  const mensajes = db
    .prepare(
      `SELECT * FROM registros ${where} ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...parametros, tamano, (paginaActual - 1) * tamano);

  return {
    mensajes,
    total,
    pagina: paginaActual,
    porPagina: tamano,
    totalPaginas,
  };
}
