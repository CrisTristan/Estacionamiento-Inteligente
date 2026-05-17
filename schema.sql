-- 1 Tabla: alumnos
CREATE TABLE IF NOT EXISTS alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    gr_code TEXT NOT NULL UNIQUE,
    auto_placa TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2 Tabla: accesos
CREATE TABLE IF NOT EXISTS accesos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    matricula TEXT NOT NULL,
    nombre TEXT NOT NULL,
    placa TEXT,
    qr_code TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    estatus TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    FOREIGN KEY (alumno_id) REFERENCES alumnos (id)
);

-- 3 Tabla: configuracion
CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL
);

-- 4 Tabla: qr_temporales
CREATE TABLE IF NOT EXISTS qr_temporales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    usado INTEGER NOT NULL DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    expira_en DATETIME NOT NULL,
    FOREIGN KEY (alumno_id) REFERENCES alumnos (id)
);

-- 5 Inserción de Configuración Inicial
INSERT OR IGNORE INTO configuracion (clave, valor) 
VALUES ('gr_tiempo_segundos', '60');

-- Índices (Optimización de Queries)
CREATE INDEX IF NOT EXISTS idx_alumnos_qr_code ON alumnos (qr_code);
CREATE INDEX IF NOT EXISTS idx_alumnos_matricula ON alumnos (matricula);
CREATE INDEX IF NOT EXISTS idx_accesos_alumno_id ON accesos (alumno_id);
CREATE INDEX IF NOT EXISTS idx_accesos_qr_code ON accesos (qr_code);
CREATE INDEX IF NOT EXISTS idx_accesos_fecha_hora ON accesos (fecha_hora);

-- Testing: Insertar datos de prueba iniciales
INSERT OR IGNORE INTO alumnos (matricula, nombre, gr_code, auto_placa, activo)
VALUES ('12345678', 'Santiago Ek Mar', 'QR-TEST-SANTIAGO-12345678', 'ABC-1234', 1);

INSERT OR IGNORE INTO accesos (alumno_id, matricula, nombre, placa, qr_code, tipo, estatus, mensaje)
VALUES (1, '12345678', 'Santiago Ek Mar', 'ABC-1234', 'QR-TEST-SANTIAGO-12345678', 'ENTRADA', 'EXITOSO', 'Entrada de prueba cargada automáticamente');