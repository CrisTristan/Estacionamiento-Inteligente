

function soloNumeros(valor) { 

  return valor.replace(/\D/g, ''); 

} 

function soloLetras(valor) { 

  return valor.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, ''); 

} 

function formatearPlaca(valor) { 

  let limpio = valor 

    .toUpperCase() 

    .replace(/[^A-Z0-9]/g, '') 

    .slice(0, 7); 

 

  if (limpio.length > 3) { 

    return `${limpio.slice(0, 3)}-${limpio.slice(3)}`; 

  } 

 

  return limpio; 

} 


const inputMatricula = document.getElementById('matricula'); 
const inputNombre = document.getElementById('nombre'); 
const inputPlacas = document.getElementById('auto_placa'); 

if (inputMatricula) { 

  inputMatricula.addEventListener('input', () => { 

    inputMatricula.value = soloNumeros(inputMatricula.value).slice(0, 8); 

  }); 

}  

if (inputNombre) { 

  inputNombre.addEventListener('input', () => { 

    inputNombre.value = soloLetras(inputNombre.value); 

  }); 

} 

if (inputPlacas) { 

  inputPlacas.addEventListener('input', () => { 

    inputPlacas.value = formatearPlaca(inputPlacas.value); 

  }); 

} 


function validarFormularioAlumno(matricula, nombre, placas) { 

  if (!/^\d{8}$/.test(matricula)) { 

    alert('La matrícula debe tener exactamente 8 números.'); 

    return false; 

  } 

  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombre)) { 

    alert('El nombre solo puede contener letras y espacios.'); 

    return false; 

  } 

  const placaSinGuion = placas.replace('-', ''); 

  if (placaSinGuion && !/^[A-Z0-9]{1,7}$/.test(placaSinGuion)) { 

    alert('La placa solo puede contener letras y números, máximo 7 caracteres.'); 

    return false; 

  } 

  return true; 

} 


function limpiarFormulario() { 

  document.getElementById('alumnoId').value = ''; 

  document.getElementById('matricula').value = ''; 

  document.getElementById('nombre').value = ''; 

  document.getElementById('auto_placa').value = ''; 

  document.getElementById('activo').checked = true; 

} 


async function cargarAlumnos() { 

  const res = await fetch(`${API}/alumnos`); 

  const data = await res.json(); 

  tablaAlumnos.innerHTML = data.map(item => ` 

    <tr> 

      <td>${item.id}</td> 

      <td>${item.matricula}</td> 

      <td>${item.nombre}</td> 

      <td>${item.auto_placa || ''}</td> 

      <td>${item.activo ? 'Sí' : 'No'}</td> 

      <td> 

        <button  

          class="btn-editar"  

          onclick="abrirModalEditar( 

            ${item.id},  

            '${item.matricula}',  

            '${item.nombre.replace(/'/g, "\\'")}',  

            '${(item.auto_placa || '').replace(/'/g, "\\'")}',  

            ${item.activo} 

          )" 

        > 

          Editar 

        </button> 

 

        <button  

          class="btn-eliminar"  

          onclick="eliminarAlumno(${item.id}, '${item.nombre.replace(/'/g, "\\'")}')" 

        > 

          Eliminar 

        </button> 

      </td> 

    </tr> 

  `).join(''); 

} 


window.eliminarAlumno = async function(id, nombre) { 

  const confirmar = confirm(`¿Seguro que deseas eliminar a ${nombre}?`); 

  if (!confirmar) return; 

  const res = await fetch(`${API}/alumnos/${id}`, { 

    method: 'DELETE' 

  }); 

  const data = await res.json(); 

  if (res.ok) { 

    alert(data.mensaje); 

    limpiarFormulario(); 

    contenedorQR.innerHTML = ''; 

    await cargarAlumnos(); 

    await cargarHistorial(); 

  } else { 

    alert(data.error || 'No se pudo eliminar el alumno.'); 

  } 

}; 


window.regenerarQR = async function(id, nombre) { 

  const confirmar = confirm(`¿Deseas generar un nuevo QR para ${nombre}? El QR anterior dejará de funcionar.`); 

  if (!confirmar) return; 

  const res = await fetch(`${API}/alumnos/${id}/regenerar-qr`, { 

    method: 'POST' 

  }); 

  const data = await res.json(); 

  if (res.ok) { 

    alert(data.mensaje); 

    contenedorQR.innerHTML = ` 

      <div> 

        <p><strong>Nuevo QR generado para:</strong> ${nombre}</p> 

        <img class="preview-qr" src="${data.qr_url}" alt="Nuevo QR del alumno" /> 

        <br /> 

        <a class="qr-link" href="${data.qr_url}" target="_blank">Abrir / descargar nuevo QR</a> 

      </div> 

    `; 

    await cargarAlumnos(); 

  } else { 

    alert(data.error || 'No se pudo regenerar el QR.'); 

  } 

}; 


formAlumno.addEventListener('submit', async (e) => { 

  e.preventDefault(); 

  const id = document.getElementById('alumnoId').value.trim(); 

  const payload = { 

    matricula: document.getElementById('matricula').value.trim(), 

    nombre: document.getElementById('nombre').value.trim(), 

    auto_placa: document.getElementById('auto_placa').value.trim(), 

    activo: document.getElementById('activo').checked 

  }; 

  if (!validarFormularioAlumno(payload.matricula, payload.nombre, payload.auto_placa)) { 

    return; 

  } 

  const res = await fetch('/api/alumnos', { 

    method: id ? 'PUT' : 'POST', 

    headers: { 'Content-Type': 'application/json' }, 

    body: JSON.stringify(payload) 

  }); 

  const data = await res.json(); 

  if (res.ok) { 

    if (id) { 

      alert(data.mensaje || 'Alumno actualizado correctamente.'); 

      contenedorQR.innerHTML = `<p><strong>Alumno actualizado correctamente.</strong></p>`; 

    } else { 

      contenedorQR.innerHTML = ` 

        <div> 

          <p><strong>QR generado para:</strong> ${payload.nombre}</p> 

          <img class="preview-qr" src="${data.qr_url}" alt="QR del alumno" /> 

          <br /> 

          <a class="qr-link" href="${data.qr_url}" target="_blank">Abrir / descargar QR</a> 

        </div> 

      `; 

    } 

    limpiarFormulario(); 

    await cargarAlumnos(); 

  } else { 

    alert(data.error || 'No se pudo guardar el alumno.'); 

  } 

}); 