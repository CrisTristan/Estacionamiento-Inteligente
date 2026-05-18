const inputMatricula = document.getElementById('matricula'); 
const inputNombre = document.getElementById('nombre'); 
const inputPlacas = document.getElementById('auto_placa'); 


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

