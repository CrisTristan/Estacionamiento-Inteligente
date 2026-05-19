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

app.get("/api/configuracion/qr-tiempo", async (req, res) => {
  try {
    db.get(
      "SELECT valor FROM configuracion WHERE clave = 'qr_tiempo_segundos'",
      (err, row) => {
        if (err) {
          return res.status(500).json({
            error: "No se pudo consultar la configuración.",
          });
        }

        res.json({
          segundos: Number(row?.valor || 60),
        });
      },
    );
  } catch (error) {
    res.status(500).json({
      error: "No se pudo consultar la configuración.",
    });
  }
});

app.put("/api/configuracion/qr-tiempo", (req, res) => {
  const { segundos } = req.body;

  const tiempo = Number(segundos);

  if (!tiempo || tiempo < 10 || tiempo > 3600) {
    return res.status(400).json({
      error: "El tiempo debe estar entre 10 y 3600 segundos.",
    });
  }

  db.run(
    `
    INSERT INTO configuracion (clave, valor)
    VALUES ('qr_tiempo_segundos', ?)
    ON CONFLICT(clave)
    DO UPDATE SET valor = excluded.valor
    `,
    [String(tiempo)],
    function (err) {
      if (err) {
        return res.status(500).json({
          error: "No se pudo actualizar la configuración.",
        });
      }

      res.json({
        ok: true,
        mensaje: `Tiempo de QR actualizado a ${tiempo} segundos.`,
      });
    },
  );
});
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { db, initDb } = require('./db');
const crypto = require('crypto');
const app = express();
const PORT = 3001;

initDb();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/qrs', express.static(path.join(__dirname, 'qrs')));

const qrDir = path.join(__dirname, 'qrs');
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir);
}
app.get('/api/alumnos', (req, res) => { 
    // Endpoint para obtener la lista de alumnos ordenada por ID descendente
  db.all('SELECT * FROM alumnos ORDER BY id DESC', (err, rows) => { 
    if (err) { 
      return res.status(500).json({ error: 'Error al consultar alumnos.' }); 

    } 
    res.json(rows); 

  }); 
}); 

app.post('/api/alumnos', async (req, res) => { 
    // Endpoint para crear un nuevo alumno con validación y generación de código QR único
  try { 

    const { matricula, nombre, auto_placa, activo } = req.body; 
    const errores = validarDatosAlumno(matricula, nombre, auto_placa || ''); 
    if (errores.length > 0) { 
      return res.status(400).json({ 
        error: errores.join(' ') 
      }); 
    } 
    if (!matricula || !nombre) { 
      return res.status(400).json({ 
        error: 'Matrícula y nombre son obligatorios.' 
      }); 
    }
    const qr_code = generarCodigoQRSeguro(); 
    const qrFileName = generarNombreArchivoQR(); 
    const qrPath = path.join(qrDir, qrFileName); 
    //Aqui se guarda el archivo QR en formato PNG en el sistema de archivos, asegurando que cada código sea único y evitando colisiones
    await QRCode.toFile(qrPath, qr_code, { 
      width: 300, 
      margin: 2 
    }); 
    // Insertar nuevo alumno en la base de datos con el código QR generado
    db.run( 
      `INSERT INTO alumnos (matricula, nombre, qr_code, qr_file, auto_placa, activo) 
       VALUES (?, ?, ?, ?, ?, ?)`, 
      [matricula, nombre, qr_code, qrFileName, auto_placa || '', activo ? 1 : 0], function (err) { 
        if (err) { 
          return res.status(400).json({ 
            error: 'No se pudo registrar el alumno. Verifica que la matrícula no esté repetida.' 
          }); 
        } 
        res.json({ 
          ok: true, 
          id: this.lastID, 
          qr_url: `/qrs/${qrFileName}`, 
          mensaje: `Alumno ${nombre} registrado correctamente.` 
        }); 
      } 
    ); 

    }catch (error) {
        res.status(500).json({ error: 'Error al crear alumno.' }); 
    }
});

app.put('/api/alumnos/:id', (req, res) => { 
  // Endpoint para actualizar un alumno específico
  try { 
    const { id } = req.params; 
    const { matricula, nombre, auto_placa, activo } = req.body; 
    const errores = validarDatosAlumno(matricula, nombre, auto_placa || ''); 
    if (errores.length > 0) { 
      return res.status(400).json({ 
        error: errores.join(' ') 
      }); 
    } 
    db.run( 
      `UPDATE alumnos  
       SET matricula = ?, nombre = ?, auto_placa = ?, activo = ?  
       WHERE id = ?`, 
      [matricula, nombre, auto_placa || '', activo ? 1 : 0, id], 
      function (err) { 
        if (err) { 
          return res.status(400).json({ 
            error: 'No se pudo actualizar el alumno. Verifica que la matrícula no esté repetida.' 
          }); 
        } 
        res.json({ 
          ok: true, 
          mensaje: `Alumno ${nombre} actualizado correctamente.` 
        }); 
      } 
    ); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al actualizar alumno.' }); 
  } 
}); 

app.delete('/api/alumnos/:id', (req, res) => { 
  // Endpoint para eliminar un alumno específico
  try { 
    const { id } = req.params; 
    db.run( 
      `DELETE FROM alumnos WHERE id = ?`, 
      [id], 
      function (err) { 
        if (err) { 
          return res.status(500).json({ 
            error: 'No se pudo eliminar el alumno.' 
          }); 
        } 
        if (this.changes === 0) { 
          return res.status(404).json({ 
            error: 'Alumno no encontrado.' 
          }); 
        } 
        res.json({ 
          ok: true, 
          mensaje: 'Alumno eliminado correctamente.' 
        }); 
      } 
    ); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al eliminar alumno.' }); 
  } 
}); 

app.post('/api/alumnos/:id/regenerar-qr', async (req, res) => { 
 // Endpoint para regenerar el código QR de un alumno específico
  try {
    const { id } = req.params; 
    // Obtener alumno actual 
    db.get( 
      'SELECT * FROM alumnos WHERE id = ?', 
      [id], 
      async (err, alumno) => { 
        if (err || !alumno) { 
          return res.status(404).json({ 
            error: 'Alumno no encontrado.' 
          }); 
        } 
        // Generar nuevo QR 
        const qr_code = generarCodigoQRSeguro(); 
        const qrFileName = generarNombreArchivoQR(); 
        const qrPath = path.join(qrDir, qrFileName); 
        await QRCode.toFile(qrPath, qr_code, { 
          width: 300, 
          margin: 2 
        }); 
        // Actualizar BD 
        db.run( 
          `UPDATE alumnos  
           SET qr_code = ?, qr_file = ?  
           WHERE id = ?`, 
          [qr_code, qrFileName, id], 
          function (err) { 
            if (err) { 
              return res.status(500).json({ 
                error: 'No se pudo regenerar el QR.' 
              }); 
            } 
            res.json({ 
              ok: true, 
              qr_url: `/qrs/${qrFileName}`, 
              mensaje: `Nuevo QR generado para ${alumno.nombre}.` 
            }); 
          } 
        ); 
    } 
    ); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al regenerar QR.' }); 
  } 
}); 

function validarDatosAlumno(matricula, nombre, auto_placa = '') {
    // Validación de matrícula, nombre y placa con mensajes de error específicos
  const errores = []; 
  if (!/^\d{8}$/.test(matricula)) { 
    errores.push('La matrícula debe tener exactamente 8 números.'); 
  } 
  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombre)) { 
    errores.push('El nombre solo puede contener letras y espacios.'); 
  } 
  const placaSinGuion = auto_placa.replace('-', ''); 
  if (placaSinGuion && !/^[A-Z0-9]{1,7}$/.test(placaSinGuion)) { 
    errores.push('La placa solo puede contener letras y números, máximo 7 caracteres.'); 
  } 
  return errores; 
}

function generarCodigoQRSeguro() { 
  //Genera un código QR único y seguro usando crypto para evitar colisiones
  return `QR-${crypto.randomBytes(32).toString('hex')}`; 
} 

function generarNombreArchivoQR() { 
  //Genera un nombre de archivo único usando UUID para evitar colisiones
  return `qr-${crypto.randomUUID()}.png`; 
} 

function obtenerAlumnoPorQR(qrCode) { 
    // Función para obtener un alumno por su código QR
  return new Promise((resolve, reject) => { 
    db.get( 
      'SELECT * FROM alumnos WHERE qr_code = ?', 
      [qrCode], 
      (err, row) => { 
        if (err) reject(err); 
        else resolve(row); 
      } 
    ); 
  }); 
} 

app.listen(PORT, () => { 
  console.log(`Servidor corriendo en http://localhost:${PORT}`); 
});

