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

app.listen(PORT, () => { 
  console.log(`Servidor corriendo en http://localhost:${PORT}`); 
});

