import { randomUUID } from 'node:crypto';
import db from '../../lib/database.js';
import { PRODUCTOS } from '../../data/productos.js';
import {
  ENVIO_FIJO,
  formatCOP,
  validarCorreo,
  validarTelefono,
} from '../../lib/pasarela.js';

const insertarPago = db.prepare(`
  INSERT INTO pagos (
    referencia, nombre, correo, telefono, direccion, ciudad, notas,
    items, subtotal, envio, total, metodo, estado, efectivo_con, cambio, fecha
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function respuestaJSON(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function texto(valor, maximo = 300) {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function generarReferencia(fecha) {
  const fechaCorta = fecha.replace(/\D/g, '').slice(0, 8);
  const aleatorio = randomUUID().slice(0, 8).toUpperCase();
  return `PED-${fechaCorta}-${aleatorio}`;
}

export async function GET() {
  try {
    const filas = db
      .prepare('SELECT * FROM pagos ORDER BY id DESC')
      .all();

    const pagos = filas.map((fila) => {
      let items = [];
      try {
        items = JSON.parse(fila.items);
      } catch {
        items = [];
      }

      return { ...fila, items };
    });

    return respuestaJSON(pagos);
  } catch (error) {
    console.error(error);
    return respuestaJSON(
      { error: 'Error al consultar los pedidos' },
      500
    );
  }
}

export async function POST({ request }) {
  try {
    let datos;

    try {
      datos = await request.json();
    } catch {
      return respuestaJSON(
        { error: 'El cuerpo de la solicitud no es un JSON válido' },
        400
      );
    }

    const nombre = texto(datos.nombre, 120);
    const correo = texto(datos.correo, 120).toLowerCase();
    const telefono = texto(datos.telefono, 30);
    const direccion = texto(datos.direccion, 200);
    const ciudad = texto(datos.ciudad, 80);
    const notas = texto(datos.notas, 300);
    const metodo = datos.metodo ?? 'contra_entrega';

    if (nombre.length < 2) {
      return respuestaJSON(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        400
      );
    }

    if (!validarCorreo(correo)) {
      return respuestaJSON(
        { error: 'El correo electrónico no es válido' },
        400
      );
    }

    if (!validarTelefono(telefono)) {
      return respuestaJSON(
        { error: 'El teléfono debe tener entre 7 y 15 dígitos' },
        400
      );
    }

    if (direccion.length < 5) {
      return respuestaJSON(
        { error: 'La dirección de entrega es obligatoria' },
        400
      );
    }

    if (!ciudad) {
      return respuestaJSON(
        { error: 'La ciudad o barrio es obligatorio' },
        400
      );
    }

    if (metodo !== 'contra_entrega') {
      return respuestaJSON(
        { error: 'El único método de pago disponible es contra entrega' },
        400
      );
    }

    if (!Array.isArray(datos.items) || datos.items.length === 0) {
      return respuestaJSON(
        { error: 'El pedido no contiene productos' },
        400
      );
    }

    if (datos.items.length > 50) {
      return respuestaJSON(
        { error: 'El pedido contiene demasiados productos' },
        400
      );
    }

    // Agrupamos cantidades y validamos contra el catálogo oficial.
    const cantidades = new Map();

    for (const item of datos.items) {
      const id = Number(item?.id);
      const cantidad = Number(item?.cantidad);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return respuestaJSON(
          { error: 'Uno o más productos no son válidos' },
          400
        );
      }

      if (
        !Number.isSafeInteger(cantidad) ||
        cantidad < 1 ||
        cantidad > 20
      ) {
        return respuestaJSON(
          { error: 'Las cantidades deben estar entre 1 y 20' },
          400
        );
      }

      if (!PRODUCTOS.some((producto) => producto.id === id)) {
        return respuestaJSON(
          { error: 'Uno o más productos no existen en el catálogo' },
          400
        );
      }

      cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
    }

    if (Array.from(cantidades.values()).some((cantidad) => cantidad > 20)) {
      return respuestaJSON(
        { error: 'La cantidad máxima por producto es 20' },
        400
      );
    }

    // Los precios y nombres se toman del catálogo, nunca del cliente.
    const itemsOficiales = Array.from(cantidades.entries()).map(
      ([id, cantidad]) => {
        const producto = PRODUCTOS.find((p) => p.id === id);
        return {
          id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad,
          imagen: producto.imagen,
        };
      }
    );

    const subtotal = itemsOficiales.reduce(
      (total, item) => total + item.precio * item.cantidad,
      0
    );
    const envio = ENVIO_FIJO;
    const total = subtotal + envio;

    let efectivoCon = null;
    let cambio = null;
    const efectivoCrudo = datos.efectivoCon;

    if (
      efectivoCrudo !== undefined &&
      efectivoCrudo !== null &&
      efectivoCrudo !== ''
    ) {
      const valor = Number(efectivoCrudo);

      if (!Number.isSafeInteger(valor) || valor < total) {
        return respuestaJSON(
          {
            error: `El efectivo debe ser un valor entero igual o mayor al total (${formatCOP(total)})`,
          },
          400
        );
      }

      efectivoCon = valor;
      cambio = valor - total;
    }

    const fecha = new Date().toISOString();
    const referencia = generarReferencia(fecha);

    const resultado = insertarPago.run(
      referencia,
      nombre,
      correo,
      telefono,
      direccion,
      ciudad,
      notas || null,
      JSON.stringify(itemsOficiales),
      subtotal,
      envio,
      total,
      'contra_entrega',
      'pendiente',
      efectivoCon,
      cambio,
      fecha
    );

    return respuestaJSON(
      {
        id: Number(resultado.lastInsertRowid),
        referencia,
        estado: 'pendiente',
        subtotal,
        envio,
        total,
        efectivoCon,
        cambio,
        fecha,
        mensaje:
          'Pedido registrado. El pago se realiza en efectivo contra entrega.',
      },
      201
    );
  } catch (error) {
    console.error(error);
    return respuestaJSON(
      { error: 'Error al registrar el pedido' },
      500
    );
  }
}
