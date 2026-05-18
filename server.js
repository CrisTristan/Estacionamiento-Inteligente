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



app.listen(PORT, () => { 
  console.log(`Servidor corriendo en http://localhost:${PORT}`); 
});

