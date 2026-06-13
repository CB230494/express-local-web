const API_URL = "https://script.google.com/macros/s/AKfycbz7NTgUWeC9-0FydoQzW1sCYJqhru4bOydL7itqGzEIAnd3RDSfF2y5ZTkLBQN45iCh/exec";

let sesion = {
  tipo: null,
  persona: null
};

async function api(accion, datos = {}) {
  const respuesta = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      accion,
      ...datos
    })
  });

  return await respuesta.json();
}

function guardarSesion(tipo, persona) {
  sesion.tipo = tipo;
  sesion.persona = persona;

  localStorage.setItem("express_sesion", JSON.stringify(sesion));
}

function cargarSesion() {
  const guardada = localStorage.getItem("express_sesion");

  if (guardada) {
    sesion = JSON.parse(guardada);
  }
}

function cerrarSesion() {
  localStorage.removeItem("express_sesion");
  sesion = {
    tipo: null,
    persona: null
  };

  renderLogin();
}
