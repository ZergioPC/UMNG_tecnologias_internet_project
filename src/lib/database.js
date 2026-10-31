import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Creamos la carpeta data si no existe
const carpeta = path.resolve('data');

if (!fs.existsSync(carpeta)) {
  fs.mkdirSync(carpeta, { recursive: true });
}

// Conectamos con SQLite
const db = new Database(
  path.join(carpeta, 'chinoshermanos.db')
);

// Creamos la tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    mensaje TEXT,
    fecha TEXT NOT NULL
  )
`);

export default db;