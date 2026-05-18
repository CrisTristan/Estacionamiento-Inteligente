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

app.listen(PORT, () => { 
  console.log(`Servidor corriendo en http://localhost:${PORT}`); 
});

