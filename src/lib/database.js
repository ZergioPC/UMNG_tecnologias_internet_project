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

// Activamos las claves foráneas
db.pragma('foreign_keys = ON');

// TABLA REGISTROS
db.exec(`
  CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    mensaje TEXT,
    fecha TEXT NOT NULL
  )
`);

// TABLA COMIDAS
db.exec(`
  CREATE TABLE IF NOT EXISTS comidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio INTEGER NOT NULL
  )
`);

// TABLA CLIENTES
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    carrito TEXT NOT NULL,
    direccion TEXT NOT NULL,
    fecha TEXT NOT NULL
  )
`);

export default db;