import db from '../../lib/database.js';

export async function GET() {

  try {

    const datos = db.prepare(
      'SELECT * FROM registros ORDER BY id'
    ).all();

    return new Response(
      JSON.stringify(datos),
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
      JSON.stringify({
        error: 'Error al consultar los registros'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  }
}