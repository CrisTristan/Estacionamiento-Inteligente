import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const API = 'http://172.16.0.113:3001/api';

export default function App() {
  const [matricula, setMatricula] = useState('');
  const [token, setToken] = useState('');
  const [restante, setRestante] = useState(0);
  const [alumno, setAlumno] = useState(null);
  const [mensaje, setMensaje] = useState('Ingresa tu matrícula para generar tu QR.');

  function mostrarMensajeTemporal(texto, tiempo = 4000) {
  setMensaje(texto);

  setTimeout(() => {
    setMensaje('Ingresa tu matrícula para generar tu QR.');
  }, tiempo);
}
  const qrActivo = Boolean(restante > 0 && token !== '');

  useEffect(() => {
    let timer = null;

    if (restante > 0) {
      timer = setInterval(() => {
        setRestante((prev) => {
          if (prev <= 1) {
            setToken('');
            mostrarMensajeTemporal('QR expirado. Genera uno nuevo.', 4000);
            clearInterval(timer);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [restante]);

  function limpiarMatricula(valor) {
    return valor.replace(/\D/g, '').slice(0, 8);
  }

  async function generarQR() {
    if (qrActivo) {
      Alert.alert(
        'QR aún vigente',
        `Tu QR todavía es válido por ${restante} segundos. Espera a que expire para generar uno nuevo.`
      );
      return;
    }

    if (!/^\d{8}$/.test(matricula)) {
      Alert.alert('Matrícula inválida', 'La matrícula debe tener exactamente 8 números.');
      return;
    }

    try {
      const res = await fetch(`${API}/alumno/generar-qr-temporal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula })
      });

      const data = await res.json();

      if (!res.ok) {
        setToken('');
        setAlumno(null);
        mostrarMensajeTemporal(data.error || 'No se pudo generar el QR.', 4000);
        return;
      }

      setToken(data.token);
      setRestante(data.segundos);
      setAlumno(data.alumno);
      mostrarMensajeTemporal('QR temporal generado correctamente.', 4000);
    } catch (error) {
      mostrarMensajeTemporal('Error de conexión con el servidor.', 4000);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>App Alumno</Text>
      <Text style={styles.descripcion}>Generación de QR temporal para acceso vehicular</Text>

      <ScrollView contentContainerStyle={styles.card}>
        <Text style={styles.subtitulo}>Generar QR temporal</Text>

        <TextInput
          style={styles.input}
          placeholder="Matrícula de 8 números"
          value={matricula}
          onChangeText={(texto) => setMatricula(limpiarMatricula(texto))}
          keyboardType="numeric"
          maxLength={8}
        />

        <Pressable
          style={[styles.boton, qrActivo ? styles.botonDesactivado : null]}
          onPress={generarQR}
          disabled={qrActivo}
        >
          <Text style={styles.botonTexto}>
            {qrActivo ? `Espera ${restante}s` : 'Generar mi QR'}
          </Text>
        </Pressable>

        <Text style={styles.mensaje}>{mensaje}</Text>

        {alumno && (
          <View style={styles.datos}>
            <Text style={styles.datoTexto}>Alumno: {alumno.nombre}</Text>
            <Text style={styles.datoTexto}>Matrícula: {alumno.matricula}</Text>
            <Text style={styles.datoTexto}>Placas: {alumno.placa || 'Sin placas'}</Text>
          </View>
        )}

        {token !== '' ? (
          <View style={styles.qrBox}>
            <QRCode value={token} size={250} />
            <Text style={styles.contador}>Expira en {restante} segundos</Text>
            <Text style={styles.nota}>
              Este QR es temporal, expira automáticamente y solo puede usarse una vez.
            </Text>
          </View>
        ) : null}
      </ScrollView>
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
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    fontSize: 16
  },
  boton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  botonDesactivado: {
    backgroundColor: '#94a3b8'
  },
  botonTexto: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16
  },
  mensaje: {
    backgroundColor: '#e2e8f0',
    padding: 12,
    borderRadius: 12,
    color: '#1f2937'
  },
  datos: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 4
  },
  datoTexto: {
    color: '#1f2937'
  },
  qrBox: {
    alignItems: 'center',
    marginTop: 12,
    gap: 12
  },
  contador: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626'
  },
  nota: {
    textAlign: 'center',
    color: '#475569'
  }
});
