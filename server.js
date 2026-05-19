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

function obtenerFechaHoraLocal() {
  const ahora = new Date();

  const opciones = {
    timeZone: "America/Cancun",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const partes = new Intl.DateTimeFormat("es-MX", opciones)
    .formatToParts(ahora)
    .reduce((acc, parte) => {
      acc[parte.type] = parte.value;
      return acc;
    }, {});

  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:${partes.second}`;
}

function insertarAcceso(data) {
  return new Promise((resolve, reject) => {
    const fechaHora = obtenerFechaHoraLocal();

    const sql = `
      INSERT INTO accesos (
        alumno_id,
        matricula,
        nombre,
        placa,
        qr_code,
        tipo,
        fecha_hora,
        estatus,
        mensaje
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        data.alumno_id,
        data.matricula,
        data.nombre,
        data.placa,
        data.qr_code,
        data.tipo,
        fechaHora,
        data.estatus,
        data.mensaje,
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      },
    );
  });
}

// ===============================
// ENDPOINTS
// ===============================

app.get("/api/accesos", (req, res) => {
  db.all("SELECT * FROM accesos ORDER BY fecha_hora DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: "Error al consultar accesos.",
      });
    }

    res.json(rows);
  });
});

app.post("/api/escanear", async (req, res) => {
  try {
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        error: "QR code es obligatorio.",
      });
    }

    const alumno = await obtenerAlumnoPorQR(qr_code);

    if (!alumno) {
      return res.status(400).json({
        acceso: false,
        mensaje: "QR inválido o alumno no existe.",
      });
    }

    if (!alumno.activo) {
      await insertarAcceso({
        alumno_id: alumno.id,
        matricula: alumno.matricula,
        nombre: alumno.nombre,
        placa: alumno.auto_placa,
        qr_code: qr_code,
        tipo: "ENTRADA",
        estatus: "DENEGADO",
        mensaje: "Alumno inactivo",
      });

      return res.status(403).json({
        acceso: false,
        mensaje: "Alumno inactivo. Acceso denegado.",
      });
    }

    const ultimoAcceso = await obtenerUltimoAcceso(alumno.id);

    const tipo =
      !ultimoAcceso || ultimoAcceso.tipo === "SALIDA" ? "ENTRADA" : "SALIDA";

    await insertarAcceso({
      alumno_id: alumno.id,
      matricula: alumno.matricula,
      nombre: alumno.nombre,
      placa: alumno.auto_placa,
      qr_code: qr_code,
      tipo: tipo,
      estatus: "EXITOSO",
      mensaje: `${tipo} registrada correctamente.`,
    });

    res.json({
      acceso: true,
      alumno: {
        id: alumno.id,
        nombre: alumno.nombre,
        matricula: alumno.matricula,
        placa: alumno.auto_placa || "Sin placas",
      },
      tipo: tipo,
      mensaje: `${tipo} registrada correctamente.`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al registrar escaneo.",
      detalles: error.message,
    });
  }
});
