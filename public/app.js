

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

