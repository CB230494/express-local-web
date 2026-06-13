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
const SERVICIOS_UI = {
  Taxi: {
    icono: "🚕",
    color: "linear-gradient(135deg,#facc15,#f97316)",
    texto: "Viajes locales y traslados rápidos."
  },
  Express: {
    icono: "🛵",
    color: "linear-gradient(135deg,#ef4444,#fb7185)",
    texto: "Mandados, compras y entregas rápidas."
  },
  Carga: {
    icono: "📦",
    color: "linear-gradient(135deg,#2563eb,#06b6d4)",
    texto: "Paquetes, compras grandes o artículos medianos."
  },
  Camión: {
    icono: "🚚",
    color: "linear-gradient(135deg,#16a34a,#22c55e)",
    texto: "Mudanzas, materiales y carga pesada."
  }
};

function badge(estado) {
  const e = String(estado || "").toLowerCase();

  if (e === "pendiente") return `<span class="badge pendiente">⏳ Pendiente</span>`;
  if (e === "aceptado") return `<span class="badge aceptado">✅ Aceptado</span>`;
  if (e === "finalizado") return `<span class="badge finalizado">🏁 Finalizado</span>`;
  if (e === "disponible") return `<span class="badge disponible">🟢 Disponible</span>`;
  if (e === "ocupado") return `<span class="badge ocupado">🔴 Ocupado</span>`;
  if (e === "fuera de servicio") return `<span class="badge fuera">⚫ Fuera de servicio</span>`;

  return `<span class="badge fuera">${estado}</span>`;
}

function whatsapp(numero, mensaje) {
  const limpio = String(numero || "").replace(/\D/g, "");
  const n = limpio.startsWith("506") ? limpio : "506" + limpio;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}

function hero() {
  return `
    <div class="card">
      <h1>🛵 Express <span>Local</span></h1>
      <p>Solicita taxi, express, carga y camión de forma rápida y segura.</p>
    </div>
  `;
}

function renderLogin() {
  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="tabs">
      <div class="card">
        <h2>👤 Ingreso usuario</h2>
        <input id="loginUsuario" placeholder="Usuario">
        <input id="loginClave" type="password" placeholder="Clave">
        <button onclick="loginUsuario()">Ingresar como usuario</button>
      </div>

      <div class="card">
        <h2>👤 Registro usuario</h2>
        <input id="regNombre" placeholder="Nombre">
        <input id="regApellido1" placeholder="Primer apellido">
        <input id="regApellido2" placeholder="Segundo apellido">
        <input id="regTelefono" placeholder="Teléfono">
        <input id="regUsuario" placeholder="Usuario">
        <input id="regClave" type="password" placeholder="Clave">
        <button onclick="registrarUsuario()">Registrarme</button>
      </div>
    </div>

    <div class="tabs">
      <div class="card">
        <h2>🛠️ Ingreso colaborador</h2>
        <input id="loginColUsuario" placeholder="Usuario">
        <input id="loginColClave" type="password" placeholder="Clave">
        <button onclick="loginColaborador()">Ingresar como colaborador</button>
      </div>

      <div class="card">
        <h2>🧰 Registro colaborador</h2>
        <input id="colNombre" placeholder="Nombre">
        <input id="colApellido1" placeholder="Primer apellido">
        <input id="colApellido2" placeholder="Segundo apellido">
        <input id="colTelefono" placeholder="Teléfono">

        <select id="colServicio">
          <option>Taxi</option>
          <option>Express</option>
          <option>Carga</option>
          <option>Camión</option>
        </select>

        <input id="colCodigo" type="password" placeholder="Código autorizado">
        <input id="colUsuario" placeholder="Usuario">
        <input id="colClave" type="password" placeholder="Clave personal">
        <button onclick="registrarColaborador()">Registrarme como colaborador</button>
      </div>
    </div>

    <div class="card">
      <h2>🔐 Administrador</h2>
      <input id="adminUsuario" placeholder="Usuario administrador">
      <input id="adminClave" type="password" placeholder="Clave administrador">
      <button onclick="loginAdmin()">Ingresar administrador</button>
    </div>
  `;
}
