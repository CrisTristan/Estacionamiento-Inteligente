const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(express.json());

const db = new sqlite3.Database("./database.db");

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// ===============================
// HELPERS
// ===============================

function obtenerAlumnoPorQR(qrCode) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM alumnos WHERE qr_code = ?", [qrCode], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function obtenerUltimoAcceso(alumnoId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM accesos WHERE alumno_id = ? ORDER BY id DESC LIMIT 1",
      [alumnoId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      },
    );
  });
}
