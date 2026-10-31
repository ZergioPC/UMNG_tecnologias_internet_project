import db from '../../lib/database.js';

const insertar = db.prepare(`
  INSERT INTO registros (nombre, correo, mensaje, fecha)
  VALUES (?, ?, ?, ?)
`);

export async function POST({ request }) {

  try {

    const datos = await request.formData();

    const nombre = datos.get('nombre');
    const correo = datos.get('correo');
    const mensaje = datos.get('mensaje');

    console.log(datos);
    // Validaciones básicas
    if (
      typeof nombre !== 'string' ||
      !nombre.trim() ||
      typeof correo !== 'string' ||
      !correo.trim() ||
      typeof mensaje !== 'string'
    ) {
      return new Response(
        'Datos inválidos',
        { status: 400 }
      );
    }

    // Insertamos en SQLite
    insertar.run(
      nombre.trim(),
      correo.trim(),
      mensaje.trim(),
      new Date().toISOString()
    );

    return new Response(
      '¡Gracias! Tu mensaje fue registrado.',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      }
    );

  } catch (error) {

    console.error(error);

    return new Response(
      'Error al registrar los datos',
      { status: 500 }
    );

  }
}