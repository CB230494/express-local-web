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
// =====================================================
// LOGIN USUARIO
// =====================================================

async function loginUsuario() {

  const usuario = document.getElementById("loginUsuario").value;
  const clave = document.getElementById("loginClave").value;

  const r = await api("loginUsuario", {
    usuario,
    clave
  });

  if (!r.ok) {
    alert(r.mensaje);
    return;
  }

  guardarSesion("Usuario", r.persona);

  renderPanelUsuario();
}


// =====================================================
// LOGIN COLABORADOR
// =====================================================

async function loginColaborador() {

  const usuario = document.getElementById("loginColUsuario").value;
  const clave = document.getElementById("loginColClave").value;

  const r = await api("loginColaborador", {
    usuario,
    clave
  });

  if (!r.ok) {
    alert(r.mensaje);
    return;
  }

  guardarSesion("Colaborador", r.persona);

  renderPanelColaborador();
}


// =====================================================
// LOGIN ADMIN
// =====================================================

async function loginAdmin() {

  const usuario = document.getElementById("adminUsuario").value;
  const clave = document.getElementById("adminClave").value;

  const r = await api("loginAdmin", {
    usuario,
    clave
  });

  if (!r.ok) {
    alert(r.mensaje);
    return;
  }

  guardarSesion("Administrador", {
    usuario
  });

  renderPanelAdmin();
}


// =====================================================
// REGISTRAR USUARIO
// =====================================================

async function registrarUsuario() {

  const r = await api("registrarUsuario", {

    nombre: document.getElementById("regNombre").value,
    apellido1: document.getElementById("regApellido1").value,
    apellido2: document.getElementById("regApellido2").value,
    telefono: document.getElementById("regTelefono").value,
    usuario: document.getElementById("regUsuario").value,
    clave: document.getElementById("regClave").value

  });

  if (!r.ok) {
    alert(r.mensaje);
    return;
  }

  alert("Usuario registrado correctamente.");

  guardarSesion("Usuario", r.persona);

  renderPanelUsuario();
}


// =====================================================
// REGISTRAR COLABORADOR
// =====================================================

async function registrarColaborador() {

  const r = await api("registrarColaborador", {

    nombre: document.getElementById("colNombre").value,
    apellido1: document.getElementById("colApellido1").value,
    apellido2: document.getElementById("colApellido2").value,
    telefono: document.getElementById("colTelefono").value,
    servicio: document.getElementById("colServicio").value,
    codigo: document.getElementById("colCodigo").value,
    usuario: document.getElementById("colUsuario").value,
    clave: document.getElementById("colClave").value

  });

  if (!r.ok) {
    alert(r.mensaje);
    return;
  }

  alert("Colaborador registrado correctamente.");

  guardarSesion("Colaborador", r.persona);

  renderPanelColaborador();
}
async function renderPanelUsuario() {
  const datos = await api("obtenerDatosIniciales");
  const usuario = sesion.persona;

  const misSolicitudes = datos.solicitudes.filter(
    s => s["Cliente ID"] === usuario.ID
  );

  document.getElementById("app").innerHTML = `
    <div class="topbar card">
      <div>
        <h2>Hola, ${usuario.Nombre} 👋</h2>
        <p>Seleccione el servicio que necesita.</p>
      </div>
      <button class="small-btn" onclick="cerrarSesion()">Salir</button>
    </div>

    <div class="grid">
      ${Object.keys(SERVICIOS_UI).map(servicio => `
        <div class="service" style="background:${SERVICIOS_UI[servicio].color}">
          <h2>${SERVICIOS_UI[servicio].icono}<br>${servicio}</h2>
          <p>${SERVICIOS_UI[servicio].texto}</p>
          <button onclick="renderCrearSolicitud('${servicio}')">Solicitar ${servicio}</button>
        </div>
      `).join("")}
    </div>

    <div class="card">
      <h2>📋 Mis solicitudes</h2>
      ${misSolicitudes.length === 0 ? "<p>No tiene solicitudes registradas.</p>" : ""}
      ${misSolicitudes.reverse().map(s => `
        <div class="card">
          <h3>${s.Servicio} · #${s.ID}</h3>
          <p><b>Fecha:</b> ${s.Fecha}</p>
          <p><b>Estado:</b> ${badge(s.Estado)}</p>
          <p><b>Detalle:</b> ${s.Detalle}</p>
          <p><b>Colaborador:</b> ${s.Colaborador || "Pendiente"}</p>
          ${
            s.Estado === "Aceptado" && s["Teléfono colaborador"]
              ? `<a href="${whatsapp(s["Teléfono colaborador"], "Hola, soy " + s.Cliente + ". Tengo la solicitud #" + s.ID)}" target="_blank">
                   <button>💬 Chatear con colaborador</button>
                 </a>`
              : ""
          }
        </div>
      `).join("")}
    </div>
  `;
}

async function renderCrearSolicitud(servicio) {
  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>Solicitar ${servicio}</h2>
      <textarea id="detalleSolicitud" placeholder="Detalle de la solicitud"></textarea>
      <button onclick="crearSolicitud('${servicio}')">Enviar solicitud</button>
      <button onclick="renderPanelUsuario()">Volver</button>
    </div>
  `;
}

async function crearSolicitud(servicio) {
  const usuario = sesion.persona;
  const detalle = document.getElementById("detalleSolicitud").value;

  if (!detalle.trim()) {
    alert("Debe escribir el detalle de la solicitud.");
    return;
  }

  const cliente = `${usuario.Nombre} ${usuario["Primer apellido"]} ${usuario["Segundo apellido"]}`;

  const r = await api("crearSolicitud", {
    servicio,
    clienteId: usuario.ID,
    cliente,
    telefono: usuario["Teléfono"],
    detalle
  });

  if (!r.ok) {
    alert("No se pudo crear la solicitud.");
    return;
  }

  alert("Solicitud enviada correctamente.");
  renderPanelUsuario();
}
