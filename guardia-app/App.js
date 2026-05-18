import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

const API = 'http://172.16.0.113:3001/api';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [resultado, setResultado] = useState('Presiona iniciar para escanear un QR.');

  function mostrarResultadoTemporal(texto, tiempo = 5000) {
  setResultado(texto);

  setTimeout(() => {
    if (escaneando) {
      setResultado('Cámara activa. Escanea un QR de alumno.');
    } else {
      setResultado('Presiona iniciar para escanear un QR.');
    }
  }, tiempo);
}

  async function iniciarCamara() {
    if (!permission?.granted) {
      const res = await requestPermission();

      if (!res.granted) {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la cámara.');
        return;
      }
    }

    setEscaneando(true);
    setResultado('Cámara activa. Escanea un QR de alumno.');
  }

  async function registrarEscaneo(dataQR) {
  try {
    const res = await fetch(`${API}/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_code: dataQR })
    });

    const data = await res.json();

    if (data.acceso) {
      mostrarResultadoTemporal(
        `✅ ${data.mensaje}\n\nAlumno: ${data.alumno.nombre}\nMatrícula: ${data.alumno.matricula}\nPlacas: ${data.alumno.placa || 'Sin placas'}\nMovimiento: ${data.tipo}`,
        5000
      );
    } else {
      mostrarResultadoTemporal(
        `❌ ${data.mensaje || 'Acceso denegado.'}`,
        4000
      );
    }
  } catch (error) {
    mostrarResultadoTemporal(
      'Error de conexión con el servidor.',
      4000
    );
  }
}

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>App Guardia</Text>
      <Text style={styles.descripcion}>Escaneo de QR para entrada y salida vehicular</Text>

      <View style={styles.card}>
        <Text style={styles.subtitulo}>Escáner QR</Text>

        {!escaneando ? (
          <Pressable style={styles.boton} onPress={iniciarCamara}>
            <Text style={styles.botonTexto}>Iniciar cámara</Text>
          </Pressable>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr']
              }}
              onBarcodeScanned={
                bloqueado
                  ? undefined
                  : async ({ data }) => {
                      setBloqueado(true);
                      await registrarEscaneo(data);

                      setTimeout(() => {
                        setBloqueado(false);
                      }, 2500);
                    }
              }
            />

            <Pressable
              style={[styles.boton, styles.botonSecundario]}
              onPress={() => {
  setEscaneando(false);
  setResultado('Escáner detenido.');

  setTimeout(() => {
    setResultado('Presiona iniciar para escanear un QR.');
  }, 3000);
}}
            >
              <Text style={styles.botonTexto}>Detener cámara</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.resultado}>{resultado}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    paddingTop: 50,
    paddingHorizontal: 16
  },
  titulo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center'
  },
  descripcion: {
    textAlign: 'center',
    color: '#475569',
    marginTop: 6,
    marginBottom: 18
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 12
  },
  subtitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8
  },
  boton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  botonSecundario: {
    backgroundColor: '#64748b'
  },
  botonTexto: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16
  },
  camera: {
    width: '100%',
    height: 360,
    borderRadius: 18,
    overflow: 'hidden'
  },
  resultado: {
    marginTop: 12,
    backgroundColor: '#e2e8f0',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#1f2937'
  }
});
