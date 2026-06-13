import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQfbLIlHZ18BNBqKAxIRY7HHd_QcQbpxg",
  authDomain: "express-local-push-test.firebaseapp.com",
  projectId: "express-local-push-test",
  storageBucket: "express-local-push-test.firebasestorage.app",
  messagingSenderId: "895952227571",
  appId: "1:895952227571:web:53b7cbc65e2acc69993b86"
};

const vapidKey = "BDAeUsGr4l__q54Crj0gZpmhIrGex_Yr3bBZljhB1JB7zFvFIR-V0IzwRCZNo3OifsvRNCF0lWyuW9gY-9AK_c8";
const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

const API_URL = "https://script.google.com/macros/s/AKfycbz7NTgUWeC9-0FydoQzW1sCYJqhru4bOydL7itqGzEIAnd3RDSfF2y5ZTkLBQN45iCh/exec";

let sesion = { tipo: null, persona: null };
let refrescoActivo = null;
let vistaActual = "login";
let idsPendientesVistos = new Set();
let idsUsuarioAceptadasVistas = new Set();

async function api(accion, datos = {}) {
  const respuesta = await fetch(API_URL, {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({ accion, ...datos })
  });
  return await respuesta.json();
}

function iniciarRefrescoAutomatico() {
  if (refrescoActivo) clearInterval(refrescoActivo);

  refrescoActivo = setInterval(() => {
    if (!sesion.tipo) return;

    if (sesion.tipo === "Usuario" && vistaActual === "panelUsuario") renderPanelUsuario(true);
    if (sesion.tipo === "Colaborador" && vistaActual === "panelColaborador") renderPanelColaborador(true);
    if (sesion.tipo === "Administrador" && vistaActual === "panelAdmin") renderPanelAdmin(true);
  }, 3000);
}

function detenerRefrescoAutomatico() {
  if (refrescoActivo) clearInterval(refrescoActivo);
  refrescoActivo = null;
}

function guardarSesion(tipo, persona) {
  sesion.tipo = tipo;
  sesion.persona = persona;
  localStorage.setItem("express_sesion", JSON.stringify(sesion));
}

function cargarSesion() {
  const guardada = localStorage.getItem("express_sesion");
  if (guardada) sesion = JSON.parse(guardada);
}

function cerrarSesion() {
  detenerRefrescoAutomatico();
  localStorage.removeItem("express_sesion");
  sesion = { tipo: null, persona: null };
  idsPendientesVistos = new Set();
  idsUsuarioAceptadasVistas = new Set();
  renderLogin();
}

const SERVICIOS_UI = {
  Taxi: { icono: "🚕", color: "linear-gradient(135deg,#facc15,#f97316)", texto: "Viajes locales y traslados rápidos." },
  Express: { icono: "🛵", color: "linear-gradient(135deg,#ef4444,#fb7185)", texto: "Mandados, compras y entregas rápidas." },
  Carga: { icono: "📦", color: "linear-gradient(135deg,#2563eb,#06b6d4)", texto: "Paquetes, compras grandes o artículos medianos." },
  Camión: { icono: "🚚", color: "linear-gradient(135deg,#16a34a,#22c55e)", texto: "Mudanzas, materiales y carga pesada." }
};

function badge(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "pendiente") return `<span class="badge pendiente">⏳ Pendiente</span>`;
  if (e === "aceptado") return `<span class="badge aceptado">✅ Aceptado</span>`;
  if (e === "finalizado") return `<span class="badge finalizado">🏁 Finalizado</span>`;
  if (e === "disponible") return `<span class="badge disponible">🟢 Disponible</span>`;
  if (e === "ocupado") return `<span class="badge ocupado">🔴 Ocupado</span>`;
  if (e === "fuera de servicio") return `<span class="badge fuera">⚫ Fuera de servicio</span>`;
  return `<span class="badge fuera">${estado || ""}</span>`;
}

function whatsapp(numero, mensaje) {
  const limpio = String(numero || "").replace(/\D/g, "");
  const n = limpio.startsWith("506") ? limpio : "506" + limpio;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}

function formatearFechaHora(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  if (isNaN(f.getTime())) return fecha;

  return f.toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function notificacionLocal(titulo, cuerpo) {
  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: cuerpo,
      requireInteraction: true
    });
  }
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
  vistaActual = "login";

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

async function loginUsuario() {
  const r = await api("loginUsuario", {
    usuario: document.getElementById("loginUsuario").value,
    clave: document.getElementById("loginClave").value
  });

  if (!r.ok) return alert(r.mensaje);

  guardarSesion("Usuario", r.persona);
  iniciarRefrescoAutomatico();
  renderPanelUsuario();
}

async function loginColaborador() {
  const r = await api("loginColaborador", {
    usuario: document.getElementById("loginColUsuario").value,
    clave: document.getElementById("loginColClave").value
  });

  if (!r.ok) return alert(r.mensaje);

  guardarSesion("Colaborador", r.persona);
  iniciarRefrescoAutomatico();
  renderPanelColaborador();
}

async function loginAdmin() {
  const r = await api("loginAdmin", {
    usuario: document.getElementById("adminUsuario").value,
    clave: document.getElementById("adminClave").value
  });

  if (!r.ok) return alert(r.mensaje);

  guardarSesion("Administrador", { usuario: document.getElementById("adminUsuario").value });
  iniciarRefrescoAutomatico();
  renderPanelAdmin();
}

async function registrarUsuario() {
  const r = await api("registrarUsuario", {
    nombre: document.getElementById("regNombre").value,
    apellido1: document.getElementById("regApellido1").value,
    apellido2: document.getElementById("regApellido2").value,
    telefono: document.getElementById("regTelefono").value,
    usuario: document.getElementById("regUsuario").value,
    clave: document.getElementById("regClave").value
  });

  if (!r.ok) return alert(r.mensaje);

  alert("Usuario registrado correctamente.");
  guardarSesion("Usuario", r.persona);
  iniciarRefrescoAutomatico();
  renderPanelUsuario();
}

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

  if (!r.ok) return alert(r.mensaje);

  alert("Colaborador registrado correctamente.");
  guardarSesion("Colaborador", r.persona);
  iniciarRefrescoAutomatico();
  renderPanelColaborador();
}

async function activarNotificaciones() {
  try {
    if (!sesion.tipo || !sesion.persona) return alert("Debe iniciar sesión primero.");

    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return alert("Permiso de notificaciones denegado.");

    const registration = await navigator.serviceWorker.register("firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) return alert("No se pudo generar token de notificaciones.");

    const r = await api("guardarPushToken", {
      tipo: sesion.tipo,
      id: sesion.persona.ID,
      token
    });

    if (!r.ok) return alert("No se pudo guardar el token.");

    sesion.persona["Push Token"] = token;
    guardarSesion(sesion.tipo, sesion.persona);

    alert("Notificaciones activadas correctamente.");
  } catch (error) {
    console.error(error);
    alert("Error activando notificaciones: " + error.message);
  }
}

onMessage(messaging, (payload) => {
  const titulo = payload.notification?.title || "Express Local";
  const cuerpo = payload.notification?.body || "Nueva notificación";
  notificacionLocal(titulo, cuerpo);
});

async function renderPanelUsuario(silencioso = false) {
  vistaActual = "panelUsuario";

  const datos = await api("obtenerDatosIniciales");
  const usuario = sesion.persona;

  const misSolicitudes = (datos.solicitudes || []).filter(
    s => s["Cliente ID"] === usuario.ID
  );

  const aceptadasActuales = misSolicitudes.filter(s => s.Estado === "Aceptado" || s.Estado === "Finalizado");

  if (silencioso) {
    aceptadasActuales.forEach(s => {
      const llave = `${s.ID}-${s.Estado}`;
      if (!idsUsuarioAceptadasVistas.has(llave)) {
        idsUsuarioAceptadasVistas.add(llave);

        if (s.Estado === "Aceptado") {
          notificacionLocal("✅ Solicitud aceptada", `${s.Colaborador || "Un colaborador"} aceptó su solicitud ${s.Servicio}.`);
        }

        if (s.Estado === "Finalizado") {
          notificacionLocal("🏁 Servicio finalizado", `Su servicio ${s.Servicio} fue finalizado.`);
        }
      }
    });
  } else {
    aceptadasActuales.forEach(s => idsUsuarioAceptadasVistas.add(`${s.ID}-${s.Estado}`));
  }

  document.getElementById("app").innerHTML = `
    <div class="topbar card">
      <div>
        <h2>Hola, ${usuario.Nombre} 👋</h2>
        <p>Seleccione el servicio que necesita.</p>
      </div>
      <button class="small-btn" onclick="cerrarSesion()">Salir</button>
    </div>

    <div class="card">
      <h2>🔔 Notificaciones</h2>
      <p>Active las notificaciones para recibir avisos aunque la app esté en segundo plano.</p>
      <button onclick="activarNotificaciones()">Activar notificaciones</button>
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
      ${misSolicitudes.slice().reverse().map(s => `
        <div class="card">
          <h3>${s.Servicio} · #${s.ID}</h3>
          <p><b>Fecha:</b> ${formatearFechaHora(s.Fecha)}</p>
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

function renderCrearSolicitud(servicio) {
  vistaActual = "crearSolicitud";

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

  if (!detalle.trim()) return alert("Debe escribir el detalle de la solicitud.");

  const cliente = `${usuario.Nombre} ${usuario["Primer apellido"]} ${usuario["Segundo apellido"]}`;

  const r = await api("crearSolicitud", {
    servicio,
    clienteId: usuario.ID,
    cliente,
    telefono: usuario["Teléfono"],
    detalle
  });

  if (!r.ok) return alert("No se pudo crear la solicitud.");

  alert("Solicitud enviada correctamente.");
  renderPanelUsuario();
}

async function renderPanelColaborador(silencioso = false) {
  vistaActual = "panelColaborador";

  const datos = await api("obtenerDatosIniciales");
  const c = sesion.persona;

  const pendientes = (datos.solicitudes || []).filter(
    s => s.Servicio === c.Servicio && s.Estado === "Pendiente"
  );

  if (silencioso) {
    pendientes.forEach(s => {
      if (!idsPendientesVistos.has(s.ID)) {
        idsPendientesVistos.add(s.ID);
        notificacionLocal("🚨 Nueva solicitud " + s.Servicio, `${s.Cliente}: ${s.Detalle}`);
      }
    });
  } else {
    pendientes.forEach(s => idsPendientesVistos.add(s.ID));
  }

  const mias = (datos.solicitudes || []).filter(
    s => s["Colaborador ID"] === c.ID
  );

  document.getElementById("app").innerHTML = `
    <div class="topbar card">
      <div>
        <h2>${c.Servicio} · ${c.Nombre}</h2>
        <p>Estado actual: ${badge(c.Estado)}</p>
      </div>
      <button class="small-btn" onclick="cerrarSesion()">Salir</button>
    </div>

    <div class="card">
      <h2>🔔 Notificaciones</h2>
      <p>Active las notificaciones para recibir nuevas solicitudes.</p>
      <button onclick="activarNotificaciones()">Activar notificaciones</button>
    </div>

    <div class="card">
      <h2>🚦 Cambiar estado</h2>
      <select id="nuevoEstado">
        <option ${c.Estado === "Disponible" ? "selected" : ""}>Disponible</option>
        <option ${c.Estado === "Ocupado" ? "selected" : ""}>Ocupado</option>
        <option ${c.Estado === "Fuera de servicio" ? "selected" : ""}>Fuera de servicio</option>
      </select>
      <button onclick="cambiarEstadoColaborador()">Actualizar estado</button>
    </div>

    <div class="card">
      <h2>🔔 Solicitudes pendientes</h2>
      ${pendientes.length === 0 ? "<p>No hay solicitudes pendientes.</p>" : ""}
      ${pendientes.slice().reverse().map(s => `
        <div class="card">
          <h3>${s.Servicio} · #${s.ID}</h3>
          <p><b>Cliente:</b> ${s.Cliente}</p>
          <p><b>Fecha:</b> ${formatearFechaHora(s.Fecha)}</p>
          <p><b>Detalle:</b> ${s.Detalle}</p>
          <button onclick="aceptarSolicitud('${s.ID}')">✅ Aceptar solicitud</button>
        </div>
      `).join("")}
    </div>

    <div class="card">
      <h2>📌 Mis servicios</h2>
      ${mias.length === 0 ? "<p>No tiene servicios aceptados.</p>" : ""}
      ${mias.slice().reverse().map(s => `
        <div class="card">
          <h3>${s.Servicio} · #${s.ID}</h3>
          <p><b>Cliente:</b> ${s.Cliente}</p>
          <p><b>Estado:</b> ${badge(s.Estado)}</p>
          <p><b>Detalle:</b> ${s.Detalle}</p>

          <a href="${whatsapp(s["Teléfono cliente"], "Hola, soy " + s.Colaborador + ". Acepté su solicitud #" + s.ID)}" target="_blank">
            <button>💬 Chatear con cliente</button>
          </a>

          ${s.Estado !== "Finalizado"
            ? `<button onclick="finalizarSolicitud('${s.ID}')">🏁 Finalizar solicitud</button>`
            : ""}
        </div>
      `).join("")}
    </div>
  `;
}

async function cambiarEstadoColaborador() {
  const estado = document.getElementById("nuevoEstado").value;
  const c = sesion.persona;

  const r = await api("cambiarEstadoColaborador", {
    colaboradorId: c.ID,
    estado
  });

  if (!r.ok) return alert("No se pudo actualizar el estado.");

  c.Estado = estado;
  guardarSesion("Colaborador", c);
  renderPanelColaborador();
}

async function aceptarSolicitud(id) {
  const c = sesion.persona;
  const nombre = `${c.Nombre} ${c["Primer apellido"]} ${c["Segundo apellido"]}`;

  const r = await api("aceptarSolicitud", {
    solicitudId: id,
    colaboradorId: c.ID,
    colaboradorNombre: nombre,
    telefonoColaborador: c["Teléfono"]
  });

  if (!r.ok) return alert(r.mensaje || "No se pudo aceptar.");

  alert("Solicitud aceptada.");
  renderPanelColaborador();
}

async function finalizarSolicitud(id) {
  const r = await api("finalizarSolicitud", { solicitudId: id });
  if (!r.ok) return alert("No se pudo finalizar.");

  alert("Solicitud finalizada.");
  renderPanelColaborador();
}

async function renderPanelAdmin(silencioso = false) {
  vistaActual = "panelAdmin";

  const datos = await api("obtenerDatosIniciales");

  const usuarios = datos.usuarios || [];
  const colaboradores = datos.colaboradores || [];
  const solicitudes = datos.solicitudes || [];

  const pendientes = solicitudes.filter(s => s.Estado === "Pendiente");
  const aceptadas = solicitudes.filter(s => s.Estado === "Aceptado");
  const finalizadas = solicitudes.filter(s => s.Estado === "Finalizado");

  document.getElementById("app").innerHTML = `
    <div class="topbar card">
      <div>
        <h2>🛡️ Panel Administrador</h2>
        <p>Control general de Express Local.</p>
      </div>
      <button class="small-btn" onclick="cerrarSesion()">Salir</button>
    </div>

    <div class="grid">
      <div class="card"><h2>${usuarios.length}</h2><p>Usuarios</p></div>
      <div class="card"><h2>${colaboradores.length}</h2><p>Colaboradores</p></div>
      <div class="card"><h2>${solicitudes.length}</h2><p>Solicitudes totales</p></div>
      <div class="card"><h2>${pendientes.length}</h2><p>Pendientes</p></div>
      <div class="card"><h2>${aceptadas.length}</h2><p>Aceptadas</p></div>
      <div class="card"><h2>${finalizadas.length}</h2><p>Finalizadas</p></div>
    </div>

    <div class="card">
      <h2>📋 Solicitudes registradas</h2>
      ${solicitudes.slice().reverse().map(s => `
        <div class="card">
          <h3>${s.Servicio} · #${s.ID}</h3>
          <p><b>Fecha:</b> ${formatearFechaHora(s.Fecha)}</p>
          <p><b>Cliente:</b> ${s.Cliente}</p>
          <p><b>Detalle:</b> ${s.Detalle}</p>
          <p><b>Estado:</b> ${badge(s.Estado)}</p>
          <p><b>Colaborador:</b> ${s.Colaborador || "Sin asignar"}</p>
        </div>
      `).join("")}
    </div>
  `;
}

window.loginUsuario = loginUsuario;
window.loginColaborador = loginColaborador;
window.loginAdmin = loginAdmin;
window.registrarUsuario = registrarUsuario;
window.registrarColaborador = registrarColaborador;
window.renderPanelUsuario = renderPanelUsuario;
window.renderPanelColaborador = renderPanelColaborador;
window.renderPanelAdmin = renderPanelAdmin;
window.renderCrearSolicitud = renderCrearSolicitud;
window.crearSolicitud = crearSolicitud;
window.cambiarEstadoColaborador = cambiarEstadoColaborador;
window.aceptarSolicitud = aceptarSolicitud;
window.finalizarSolicitud = finalizarSolicitud;
window.cerrarSesion = cerrarSesion;
window.activarNotificaciones = activarNotificaciones;

document.addEventListener("DOMContentLoaded", () => {
  cargarSesion();

  if (sesion.tipo === "Usuario") {
    iniciarRefrescoAutomatico();
    renderPanelUsuario();
    return;
  }

  if (sesion.tipo === "Colaborador") {
    iniciarRefrescoAutomatico();
    renderPanelColaborador();
    return;
  }

  if (sesion.tipo === "Administrador") {
    iniciarRefrescoAutomatico();
    renderPanelAdmin();
    return;
  }

  renderLogin();
});
