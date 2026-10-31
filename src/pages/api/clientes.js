import db from '../../lib/database.js';

const insertarCliente = db.prepare(`
  INSERT INTO clientes (nombre, carrito, direccion, fecha)
  VALUES (?, ?, ?, ?)
`);

export async function GET() {

  try {

    const clientes = db.prepare(`
      SELECT * FROM clientes ORDER BY id DESC
    `).all();

    // Convertimos el carrito JSON nuevamente en un array
    const resultado = clientes.map(cliente => ({
      ...cliente,
      carrito: JSON.parse(cliente.carrito)
    }));

    return new Response(
      JSON.stringify(resultado),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({ error: 'Error al consultar clientes' }),
      { status: 500 }
    );

  }
}

export async function POST({ request }) {

  try {

    const datos = await request.json();

    const { nombre, carrito, direccion } = datos;

    // Validaciones
    if (
      typeof nombre !== 'string' ||
      !nombre.trim() ||
      typeof direccion !== 'string' ||
      !direccion.trim() ||
      !Array.isArray(carrito) ||
      carrito.length === 0 ||
      !carrito.every(
        id => Number.isSafeInteger(id) && id > 0
      )
    ) {
      return new Response(
        JSON.stringify({ error: 'Datos inválidos' }),
        { status: 400 }
      );
    }

    // Verificamos que todos los platos existan
    const verificarComida = db.prepare(`
      SELECT id FROM comidas WHERE id = ?
    `);

    const platosValidos = carrito.every(id =>
      Boolean(verificarComida.get(id))
    );

    if (!platosValidos) {
      return new Response(
        JSON.stringify({ error: 'Uno o más platos no existen' }),
        { status: 400 }
      );
    }

    // Registramos el cliente
    const resultado = insertarCliente.run(
      nombre.trim(),
      JSON.stringify(carrito),
      direccion.trim(),
      new Date().toISOString()
    );

    return new Response(
      JSON.stringify({
        mensaje: 'Pedido registrado correctamente',
        id: resultado.lastInsertRowid
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({ error: 'Error al registrar el pedido' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  }
}