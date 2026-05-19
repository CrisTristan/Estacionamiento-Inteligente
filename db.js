/**
 * DOCUMENTACIÓN DE LA BASE DE DATOS (SANTIAGO)
 * * Diagrama ER - Relaciones de Llaves Foráneas:
 * - alumnos (1) ---------> accesos (N)        [A través de alumno_id]
 * - alumnos (1) ---------> qr_temporales (N)   [A través de alumno_id]
* * Comandos para Script de Backup / Restore manual de SQLite:
 * - Copia de seguridad (Backup):
 * sqlite3 acceso_vehicular.db ".backup 'backup_acceso_vehicular.db'"
 * - Restauración (Restore):
 * sqlite3 acceso_vehicular.db ".restore 'backup_acceso_vehicular.db'"
*/

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'acceso_vehicular.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const db = new sqlite3.Database(dbPath);

function initDb() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error al inicializar la base de datos:', err.message);
            return;
        }
        console.log('Base de datos lista.');
    });
}

module.exports = { db, initDb };