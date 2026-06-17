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
let idsUsuarioEstadosVistos = new Set();
let adminVistaActual = "resumen";
let eventoInstalacionPWA = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  eventoInstalacionPWA = e;
  mostrarBotonInstalarPWA();
});

function mostrarBotonInstalarPWA() {
  if (document.getElementById("btnInstalarPWA")) return;

  const boton = document.createElement("button");
  boton.id = "btnInstalarPWA";
  boton.className = "install-pwa-btn";
  boton.innerHTML = "📲 Instalar App";

  boton.onclick = async () => {
    if (!eventoInstalacionPWA) return;

    eventoInstalacionPWA.prompt();
    await eventoInstalacionPWA.userChoice;

    eventoInstalacionPWA = null;
    boton.remove();
  };

  document.body.appendChild(boton);
}

window.addEventListener("appinstalled", () => {
  eventoInstalacionPWA = null;

  const boton = document.getElementById("btnInstalarPWA");
  if (boton) boton.remove();
});

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

async function api(accion, datos = {}) {
  const respuesta = await fetch(API_URL, {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({ accion, ...datos })
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
    try {
      sesion = JSON.parse(guardada);
    } catch (error) {
      localStorage.removeItem("express_sesion");
      sesion = { tipo: null, persona: null };
    }
  }
}

function iniciarRefrescoAutomatico() {
  if (refrescoActivo) clearInterval(refrescoActivo);

  refrescoActivo = setInterval(() => {
    if (!sesion.tipo) return;

    if (sesion.tipo === "Usuario" && vistaActual === "panelUsuario") {
      renderPanelUsuario(true);
    }

    if (sesion.tipo === "Colaborador" && vistaActual === "panelColaborador") {
      renderPanelColaborador(true);
    }

    if (sesion.tipo === "Administrador" && vistaActual === "panelAdmin") {
      if (adminVistaActual === "resumen") renderAdminResumen(true);
      if (adminVistaActual === "solicitudes24h") renderAdminSolicitudes24h(true);
    }
  }, 6000);
}

function detenerRefrescoAutomatico() {
  if (refrescoActivo) clearInterval(refrescoActivo);
  refrescoActivo = null;
}

function cerrarSesion() {
  detenerRefrescoAutomatico();
  localStorage.removeItem("express_sesion");
  sesion = { tipo: null, persona: null };
  idsPendientesVistos = new Set();
  idsUsuarioEstadosVistos = new Set();
  adminVistaActual = "resumen";
  renderLogin();
}
function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badge(estado) {
  const e = String(estado || "").toLowerCase();

  if (e === "pendiente") return `<span class="badge pendiente">⏳ Pendiente</span>`;
  if (e === "aceptado") return `<span class="badge aceptado">✅ Aceptado</span>`;
  if (e === "finalizado") return `<span class="badge finalizado">🏁 Finalizado</span>`;
  if (e === "disponible") return `<span class="badge disponible">🟢 Disponible</span>`;
  if (e === "ocupado") return `<span class="badge ocupado">🔴 Ocupado</span>`;
  if (e === "fuera de servicio") return `<span class="badge fuera">⚫ Fuera de servicio</span>`;

  return `<span class="badge fuera">${escaparHTML(estado || "")}</span>`;
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

function fechaInputHoy() {
  const f = new Date();
  const y = f.getFullYear();
  const m = String(f.getMonth() + 1).padStart(2, "0");
  const d = String(f.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function cargando(texto = "Cargando información...") {
  return `
    <div class="card loading-card">
      <p>${escaparHTML(texto)}</p>
    </div>
  `;
}

function notificacionLocal(titulo, cuerpo) {
  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: cuerpo,
      requireInteraction: true
    });
  }
}

function leerImagenComoBase64(input) {
  return new Promise((resolve, reject) => {
    const archivo = input.files && input.files[0];

    if (!archivo) {
      resolve("");
      return;
    }

    const permitidos = ["image/png", "image/jpeg", "image/webp", "image/gif"];

    if (!permitidos.includes(archivo.type)) {
      reject(new Error("Formato no permitido. Use PNG, JPG, JPEG, WEBP o GIF."));
      return;
    }

    const maxMB = 2;
    const maxBytes = maxMB * 1024 * 1024;

    if (archivo.size > maxBytes) {
      reject(new Error("La imagen es muy pesada. Use una imagen menor a 2 MB."));
      return;
    }

    const lector = new FileReader();

    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
    lector.readAsDataURL(archivo);
  });
}

function hero() {
  return `
    <div class="card hero-card">
      <div>
        <h1>Express <span>Local</span></h1>
        <p>Transporte, mandados, carga y camión cuando lo necesite.</p>
      </div>
    </div>
  `;
}

function menuUsuario(contenido = "") {
  return `
    <div class="app-layout">
      <aside class="side-menu">
        <div class="side-brand">
          <div class="side-logo">🛵</div>
          <div>
            <b>Express Local</b>
            <small>Panel usuario</small>
          </div>
        </div>

        <button onclick="renderPanelUsuario()" class="side-link">🏠 Inicio</button>
        <button onclick="renderPanelUsuarioAnuncios()" class="side-link">📢 Anuncios</button>
        <button onclick="activarNotificaciones()" class="side-link">🔔 Notificaciones</button>
        <button onclick="cerrarSesion()" class="side-link danger">🚪 Cerrar sesión</button>
      </aside>

      <main class="app-content" id="panelContenido">
        ${contenido || cargando()}
      </main>
    </div>
  `;
}

function menuColaborador(contenido = "") {
  return `
    <div class="app-layout">
      <aside class="side-menu">
        <div class="side-brand">
          <div class="side-logo">🛠️</div>
          <div>
            <b>Express Local</b>
            <small>Panel colaborador</small>
          </div>
        </div>

        <button onclick="renderPanelColaborador()" class="side-link">🏠 Inicio</button>
        <button onclick="activarNotificaciones()" class="side-link">🔔 Notificaciones</button>
        <button onclick="cerrarSesion()" class="side-link danger">🚪 Cerrar sesión</button>
      </aside>

      <main class="app-content" id="panelContenido">
        ${contenido || cargando()}
      </main>
    </div>
  `;
}

function menuAdmin(contenido = "") {
  return `
    <div class="app-layout">
      <aside class="side-menu admin-menu">
        <div class="side-brand">
          <div class="side-logo">🛡️</div>
          <div>
            <b>Administrador</b>
            <small>Control Express Local</small>
          </div>
        </div>

        <button onclick="renderAdminResumen()" class="side-link">📊 Resumen</button>
        <button onclick="renderAdminBuscarPersonas('Usuario')" class="side-link">👤 Buscar usuarios</button>
        <button onclick="renderAdminBuscarPersonas('Colaborador')" class="side-link">🛠️ Buscar colaboradores</button>
        <button onclick="renderAdminSolicitudes24h()" class="side-link">🕒 Últimas 24 horas</button>
        <button onclick="renderAdminHistorialFiltrado()" class="side-link">📋 Historial filtrado</button>
        <button onclick="renderAdminAnuncios()" class="side-link">📢 Anuncios</button>
        <button onclick="cerrarSesion()" class="side-link danger">🚪 Cerrar sesión</button>
      </aside>

      <main class="app-content" id="panelContenido">
        ${contenido || cargando()}
      </main>
    </div>
  `;
}
function renderLogin() {
  vistaActual = "login";

  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="login-options two-options">
      <div class="card option-card" onclick="renderIngresoUsuario()">
        <div class="option-icon">👤</div>
        <h2>Soy usuario</h2>
        <p>Solicitar taxi, express, carga o camión.</p>
        <button>Ingresar</button>
      </div>

      <div class="card option-card" onclick="renderIngresoColaborador()">
        <div class="option-icon">🛠️</div>
        <h2>Soy colaborador</h2>
        <p>Recibir y aceptar solicitudes disponibles.</p>
        <button>Ingresar</button>
      </div>
    </div>

    <button class="admin-floating-btn" onclick="renderIngresoAdmin()">
      🔐 Admin
    </button>
  `;
}

function renderIngresoUsuario() {
  vistaActual = "loginUsuario";

  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="card auth-card">
      <h2>👤 Ingreso usuario</h2>
      <input id="loginUsuario" placeholder="Usuario">
      <input id="loginClave" type="password" placeholder="Clave">
      <button onclick="loginUsuario()">Ingresar como usuario</button>
      <button class="ghost-btn" onclick="renderRegistroUsuario()">Crear cuenta nueva</button>
      <button class="ghost-btn" onclick="renderLogin()">Volver</button>
    </div>
  `;
}

function renderRegistroUsuario() {
  vistaActual = "registroUsuario";

  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="card auth-card">
      <h2>👤 Registro usuario</h2>

      <div class="form-grid">
        <input id="regNombre" placeholder="Nombre">
        <input id="regApellido1" placeholder="Primer apellido">
        <input id="regApellido2" placeholder="Segundo apellido">
        <input id="regTelefono" placeholder="Teléfono">
        <input id="regUsuario" placeholder="Usuario">
        <input id="regClave" type="password" placeholder="Clave">
      </div>

      <button onclick="registrarUsuario()">Registrarme</button>
      <button class="ghost-btn" onclick="renderIngresoUsuario()">Ya tengo cuenta</button>
      <button class="ghost-btn" onclick="renderLogin()">Volver</button>
    </div>
  `;
}

function renderIngresoColaborador() {
  vistaActual = "loginColaborador";

  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="card auth-card">
      <h2>🛠️ Ingreso colaborador</h2>
      <input id="loginColUsuario" placeholder="Usuario">
      <input id="loginColClave" type="password" placeholder="Clave">
      <button onclick="loginColaborador()">Ingresar como colaborador</button>
      <button class="ghost-btn" onclick="renderRegistroColaborador()">Registrarme como colaborador</button>
      <button class="ghost-btn" onclick="renderLogin()">Volver</button>
    </div>
  `;
}

function renderRegistroColaborador() {
  vistaActual = "registroColaborador";

  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="card auth-card">
      <h2>🧰 Registro colaborador</h2>

      <div class="form-grid">
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
      </div>

      <button onclick="registrarColaborador()">Registrarme como colaborador</button>
      <button class="ghost-btn" onclick="renderIngresoColaborador()">Ya tengo cuenta</button>
      <button class="ghost-btn" onclick="renderLogin()">Volver</button>
    </div>
  `;
}

function renderIngresoAdmin() {
  vistaActual = "loginAdmin";

  document.getElementById("app").innerHTML = `
    ${hero()}

    <div class="card auth-card">
      <h2>🔐 Administrador</h2>
      <input id="adminUsuario" placeholder="Usuario administrador">
      <input id="adminClave" type="password" placeholder="Clave administrador">
      <button onclick="loginAdmin()">Ingresar administrador</button>
      <button class="ghost-btn" onclick="renderLogin()">Volver</button>
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

  guardarSesion("Administrador", {
    usuario: document.getElementById("adminUsuario").value
  });

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
    if (!sesion.tipo || !sesion.persona) {
      return alert("Debe iniciar sesión primero.");
    }

    const permiso = await Notification.requestPermission();

    if (permiso !== "granted") {
      return alert("Permiso de notificaciones denegado.");
    }

    const registration = await navigator.serviceWorker.register("firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      return alert("No se pudo generar token de notificaciones.");
    }

    const r = await api("guardarPushToken", {
      tipo: sesion.tipo,
      id: sesion.persona.ID,
      token
    });

    if (!r.ok) {
      return alert("No se pudo guardar el token.");
    }

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

  if (!sesion.persona || !sesion.persona.ID) {
    cerrarSesion();
    return;
  }

  if (!silencioso) {
    document.getElementById("app").innerHTML = menuUsuario(cargando("Cargando panel de usuario..."));
  }

  const contenedor = document.getElementById("panelContenido") || document.getElementById("app");

  const datos = await api("obtenerPanelUsuario", {
    usuarioId: sesion.persona.ID
  });

  if (!datos.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(datos.mensaje || "No se pudo cargar el panel.")}</p></div>`;
    return;
  }

  const usuario = sesion.persona;
  const activa = datos.solicitudActiva;
  const anuncios = datos.anuncios || [];
  const disponibles = datos.disponibles || {};

  if (silencioso && activa) {
    const llave = `${activa.ID}-${activa.Estado}`;

    if (!idsUsuarioEstadosVistos.has(llave)) {
      idsUsuarioEstadosVistos.add(llave);

      if (activa.Estado === "Aceptado") {
        notificacionLocal(
          "✅ Solicitud aceptada",
          `${activa.Colaborador || "Un colaborador"} aceptó su solicitud ${activa.Servicio}.`
        );
      }
    }
  }

  if (!silencioso && activa) {
    idsUsuarioEstadosVistos.add(`${activa.ID}-${activa.Estado}`);
  }

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>Hola, ${escaparHTML(usuario.Nombre)} 👋</h2>
        <p>${activa ? "Servicio activo en seguimiento." : "Seleccione el servicio que necesita."}</p>
      </div>
      <button class="small-btn" onclick="cerrarSesion()">Salir</button>
    </div>

    ${renderDisponiblesUsuario(disponibles)}

    ${
      anuncios.length
        ? `<div class="card">
             <h2>📢 Anuncios</h2>
             <div class="ad-strip">
               ${anuncios.slice(0, 3).map(renderAnuncio).join("")}
             </div>
           </div>`
        : ""
    }

    <div class="card">
      <h2>🔔 Notificaciones</h2>
      <p>Active las notificaciones para recibir avisos aunque la app esté en segundo plano.</p>
      <button onclick="activarNotificaciones()">Activar notificaciones</button>
    </div>

    ${activa ? renderSolicitudActivaUsuario(activa) : renderSelectorServicios(disponibles)}
  `;

  if (silencioso) {
    contenedor.innerHTML = contenido;
  } else {
    document.getElementById("app").innerHTML = menuUsuario(contenido);
  }
}

function renderDisponiblesUsuario(disponibles = {}) {
  return `
    <div class="card">
      <h2>🚦 Colaboradores disponibles</h2>
      <p>Puede ver cuántos colaboradores hay disponibles por servicio, sin mostrar datos personales.</p>

      <div class="grid availability-grid">
        ${Object.keys(SERVICIOS_UI).map(servicio => `
          <div class="availability-card">
            <div class="availability-icon">${SERVICIOS_UI[servicio].icono}</div>
            <h3>${servicio}</h3>
            <strong>${disponibles[servicio] || 0}</strong>
            <p>disponibles</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
async function renderPanelUsuarioAnuncios() {
  vistaActual = "panelUsuario";

  document.getElementById("app").innerHTML = menuUsuario(cargando("Cargando anuncios..."));

  const contenedor = document.getElementById("panelContenido");
  const r = await api("listarAnuncios");
  const anuncios = r.anuncios || [];

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>📢 Anuncios publicitarios</h2>
        <p>Promociones y avisos disponibles.</p>
      </div>
      <button class="small-btn" onclick="renderPanelUsuario()">Volver</button>
    </div>

    ${
      anuncios.length === 0
        ? `<div class="card"><p>No hay anuncios activos.</p></div>`
        : `<div class="ad-grid">${anuncios.map(renderAnuncio).join("")}</div>`
    }
  `;

  contenedor.innerHTML = contenido;
}

function renderAnuncio(a) {
  return `
    <div class="ad-card">
      <img src="${escaparHTML(a.Imagen)}" alt="${escaparHTML(a.Titulo)}" loading="lazy">
      <div class="ad-body">
        <h3>${escaparHTML(a.Titulo || "Anuncio")}</h3>
        <p>${escaparHTML(a.Descripcion || "")}</p>
      </div>
    </div>
  `;
}

function renderSelectorServicios(disponibles = {}) {
  return `
    <div class="grid">
      ${Object.keys(SERVICIOS_UI).map(servicio => `
        <div class="service" style="background:${SERVICIOS_UI[servicio].color}">
          <h2>${SERVICIOS_UI[servicio].icono}<br>${servicio}</h2>
          <p>${SERVICIOS_UI[servicio].texto}</p>
          <p><b>Disponibles:</b> ${disponibles[servicio] || 0}</p>
          <button onclick="renderCrearSolicitud('${servicio}')">Solicitar ${servicio}</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSolicitudActivaUsuario(s) {
  return `
    <div class="card request-card">
      <h2>📍 Solicitud activa</h2>
      <h3>${escaparHTML(s.Servicio)} · #${escaparHTML(s.ID)}</h3>
      <p><b>Fecha:</b> ${formatearFechaHora(s.Fecha)}</p>
      <p><b>Estado:</b> ${badge(s.Estado)}</p>
      <p><b>Detalle:</b> ${escaparHTML(s.Detalle)}</p>
      <p><b>Colaborador:</b> ${escaparHTML(s.Colaborador || "Buscando colaborador disponible...")}</p>

      ${
        s.Estado === "Aceptado" && s["Teléfono colaborador"]
          ? `<a href="${whatsapp(s["Teléfono colaborador"], "Hola, soy " + s.Cliente + ". Tengo la solicitud #" + s.ID)}" target="_blank">
               <button>💬 Chatear con colaborador</button>
             </a>`
          : ""
      }
    </div>
  `;
}

function renderCrearSolicitud(servicio) {
  vistaActual = "crearSolicitud";

  const contenido = `
    <div class="card">
      <h2>Solicitar ${escaparHTML(servicio)}</h2>
      <textarea id="detalleSolicitud" placeholder="Detalle de la solicitud"></textarea>
      <button onclick="crearSolicitud('${servicio}')">Enviar solicitud</button>
      <button class="ghost-btn" onclick="renderPanelUsuario()">Volver</button>
    </div>
  `;

  document.getElementById("app").innerHTML = menuUsuario(contenido);
}

async function crearSolicitud(servicio) {
  const usuario = sesion.persona;
  const detalle = document.getElementById("detalleSolicitud").value;

  if (!detalle.trim()) {
    return alert("Debe escribir el detalle de la solicitud.");
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
    return alert("No se pudo crear la solicitud.");
  }

  alert("Solicitud enviada correctamente.");
  vistaActual = "panelUsuario";
  renderPanelUsuario();
}

async function renderPanelColaborador(silencioso = false) {
  vistaActual = "panelColaborador";

  if (!sesion.persona || !sesion.persona.ID) {
    cerrarSesion();
    return;
  }

  if (!silencioso) {
    document.getElementById("app").innerHTML = menuColaborador(cargando("Cargando panel de colaborador..."));
  }

  const contenedor = document.getElementById("panelContenido") || document.getElementById("app");

  const datos = await api("obtenerPanelColaborador", {
    colaboradorId: sesion.persona.ID
  });

  if (!datos.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(datos.mensaje || "No se pudo cargar el panel.")}</p></div>`;
    return;
  }

  const colaborador = datos.colaborador;
  const trabajoActivo = datos.trabajoActivo;
  const pendientes = datos.pendientes || [];

  sesion.persona = colaborador;
  guardarSesion("Colaborador", colaborador);

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

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>${escaparHTML(colaborador.Servicio)} · ${escaparHTML(colaborador.Nombre)}</h2>
        <p>Estado actual: ${badge(colaborador.Estado)}</p>
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
      <p>Si acepta un servicio, el sistema lo cambia automáticamente a Ocupado. Al finalizar, vuelve a Disponible.</p>
      <select id="nuevoEstado">
        <option ${colaborador.Estado === "Disponible" ? "selected" : ""}>Disponible</option>
        <option ${colaborador.Estado === "Ocupado" ? "selected" : ""}>Ocupado</option>
        <option ${colaborador.Estado === "Fuera de servicio" ? "selected" : ""}>Fuera de servicio</option>
      </select>
      <button onclick="cambiarEstadoColaborador()">Actualizar estado</button>
    </div>

    ${trabajoActivo ? renderTrabajoActivoColaborador(trabajoActivo) : renderPendientesColaborador(pendientes)}
  `;

  if (silencioso) {
    contenedor.innerHTML = contenido;
  } else {
    document.getElementById("app").innerHTML = menuColaborador(contenido);
  }
}
function renderPendientesColaborador(pendientes) {
  return `
    <div class="card">
      <h2>🔔 Solicitudes disponibles</h2>
      ${pendientes.length === 0 ? "<p>No hay solicitudes disponibles en este momento.</p>" : ""}

      ${pendientes.map(s => `
        <div class="card request-card">
          <h3>${escaparHTML(s.Servicio)} · #${escaparHTML(s.ID)}</h3>
          <p><b>Cliente:</b> ${escaparHTML(s.Cliente)}</p>
          <p><b>Fecha:</b> ${formatearFechaHora(s.Fecha)}</p>
          <p><b>Detalle:</b> ${escaparHTML(s.Detalle)}</p>
          <button onclick="aceptarSolicitud('${s.ID}')">✅ Aceptar solicitud</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTrabajoActivoColaborador(s) {
  return `
    <div class="card request-card">
      <h2>📌 Servicio activo</h2>
      <h3>${escaparHTML(s.Servicio)} · #${escaparHTML(s.ID)}</h3>
      <p><b>Cliente:</b> ${escaparHTML(s.Cliente)}</p>
      <p><b>Estado:</b> ${badge(s.Estado)}</p>
      <p><b>Detalle:</b> ${escaparHTML(s.Detalle)}</p>

      <a href="${whatsapp(s["Teléfono cliente"], "Hola, soy " + s.Colaborador + ". Acepté su solicitud #" + s.ID)}" target="_blank">
        <button>💬 Chatear con cliente</button>
      </a>

      <button onclick="finalizarSolicitud('${s.ID}')">🏁 Finalizar solicitud</button>
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

  if (!r.ok) {
    return alert("No se pudo actualizar el estado.");
  }

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

  if (!r.ok) {
    return alert(r.mensaje || "No se pudo aceptar.");
  }

  c.Estado = "Ocupado";
  guardarSesion("Colaborador", c);

  alert("Solicitud aceptada.");
  renderPanelColaborador();
}

async function finalizarSolicitud(id) {
  const r = await api("finalizarSolicitud", {
    solicitudId: id
  });

  if (!r.ok) {
    return alert("No se pudo finalizar.");
  }

  sesion.persona.Estado = "Disponible";
  guardarSesion("Colaborador", sesion.persona);

  alert("Solicitud finalizada.");
  renderPanelColaborador();
}

function renderPanelAdmin() {
  vistaActual = "panelAdmin";
  adminVistaActual = "resumen";

  document.getElementById("app").innerHTML = menuAdmin(cargando("Cargando resumen administrativo..."));
  renderAdminResumen();
}

async function renderAdminResumen(silencioso = false) {
  vistaActual = "panelAdmin";
  adminVistaActual = "resumen";

  if (!silencioso) {
    document.getElementById("app").innerHTML = menuAdmin(cargando("Cargando resumen administrativo..."));
  }

  const contenedor = document.getElementById("panelContenido") || document.getElementById("app");
  const r = await api("resumenAdmin");

  if (!r.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(r.mensaje || "No se pudo cargar el resumen.")}</p></div>`;
    return;
  }

  const d = r.resumen || {};
  const disponibles = d.disponibles || {};

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>📊 Resumen administrativo</h2>
        <p>Vista rápida sin cargar todo el historial.</p>
      </div>
      <button class="small-btn" onclick="renderAdminResumen()">Actualizar</button>
    </div>

    <div class="grid admin-stats">
      <div class="card stat-card"><h2>${d.usuarios || 0}</h2><p>Usuarios</p></div>
      <div class="card stat-card"><h2>${d.colaboradores || 0}</h2><p>Colaboradores</p></div>
      <div class="card stat-card"><h2>${d.solicitudes || 0}</h2><p>Solicitudes totales</p></div>
      <div class="card stat-card"><h2>${d.ultimas24h || 0}</h2><p>Últimas 24 horas</p></div>
      <div class="card stat-card"><h2>${d.pendientes || 0}</h2><p>Pendientes</p></div>
      <div class="card stat-card"><h2>${d.aceptadas || 0}</h2><p>Aceptadas</p></div>
      <div class="card stat-card"><h2>${d.finalizadas || 0}</h2><p>Finalizadas</p></div>
    </div>

    <div class="card">
      <h2>🚦 Disponibilidad por servicio</h2>
      <div class="grid availability-grid">
        ${Object.keys(SERVICIOS_UI).map(servicio => `
          <div class="availability-card">
            <div class="availability-icon">${SERVICIOS_UI[servicio].icono}</div>
            <h3>${servicio}</h3>
            <strong>${disponibles[servicio] || 0}</strong>
            <p>disponibles</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="card">
      <h2>⚙️ Gestión rápida</h2>
      <div class="quick-actions">
        <button onclick="renderAdminBuscarPersonas('Usuario')">Buscar usuarios</button>
        <button onclick="renderAdminBuscarPersonas('Colaborador')">Buscar colaboradores</button>
        <button onclick="renderAdminSolicitudes24h()">Ver últimas 24 horas</button>
        <button onclick="renderAdminHistorialFiltrado()">Historial filtrado</button>
      </div>
    </div>
  `;

  contenedor.innerHTML = contenido;
}
function renderAdminBuscarPersonas(tipo) {
  vistaActual = "panelAdmin";
  adminVistaActual = tipo === "Usuario" ? "buscarUsuarios" : "buscarColaboradores";

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>${tipo === "Usuario" ? "👤 Buscar usuarios" : "🛠️ Buscar colaboradores"}</h2>
        <p>Busque por nombre, usuario o teléfono. No se carga toda la lista.</p>
      </div>
      <button class="small-btn" onclick="renderAdminResumen()">Resumen</button>
    </div>

    <div class="card">
      <div class="search-row">
        <input id="adminBusquedaPersona" placeholder="Escriba nombre, usuario o teléfono">
        <button onclick="buscarPersonasAdmin('${tipo}')">Buscar</button>
      </div>
      <p class="helper-text">Debe escribir al menos 2 letras.</p>
    </div>

    <div id="adminResultadosPersonas"></div>
  `;

  document.getElementById("app").innerHTML = menuAdmin(contenido);
}

async function buscarPersonasAdmin(tipo) {
  const busqueda = document.getElementById("adminBusquedaPersona").value;
  const contenedor = document.getElementById("adminResultadosPersonas");

  contenedor.innerHTML = cargando("Buscando registros...");

  const r = await api("buscarPersonasAdmin", {
    tipo,
    busqueda,
    limite: 20
  });

  if (!r.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(r.mensaje)}</p></div>`;
    return;
  }

  const personas = r.personas || [];

  contenedor.innerHTML = `
    <div class="card">
      <h2>Resultados</h2>
      ${personas.length === 0 ? "<p>No se encontraron registros.</p>" : ""}
      ${personas.map(p => renderPersonaAdmin(tipo, p)).join("")}
    </div>
  `;
}

function renderPersonaAdmin(tipo, p) {
  const esCol = tipo === "Colaborador";

  return `
    <div class="admin-item">
      <h3>${escaparHTML(p.Nombre)} ${escaparHTML(p["Primer apellido"])} ${escaparHTML(p["Segundo apellido"])}</h3>

      <div class="form-grid">
        <input id="editNombre_${p.ID}" value="${escaparHTML(p.Nombre)}" placeholder="Nombre">
        <input id="editApellido1_${p.ID}" value="${escaparHTML(p["Primer apellido"])}" placeholder="Primer apellido">
        <input id="editApellido2_${p.ID}" value="${escaparHTML(p["Segundo apellido"])}" placeholder="Segundo apellido">
        <input id="editTelefono_${p.ID}" value="${escaparHTML(p["Teléfono"])}" placeholder="Teléfono">
        <input id="editUsuario_${p.ID}" value="${escaparHTML(p.Usuario)}" placeholder="Usuario">
        <input id="editClave_${p.ID}" value="${escaparHTML(p.Clave)}" placeholder="Clave">

        ${
          esCol
            ? `
              <select id="editServicio_${p.ID}">
                <option ${p.Servicio === "Taxi" ? "selected" : ""}>Taxi</option>
                <option ${p.Servicio === "Express" ? "selected" : ""}>Express</option>
                <option ${p.Servicio === "Carga" ? "selected" : ""}>Carga</option>
                <option ${p.Servicio === "Camión" ? "selected" : ""}>Camión</option>
              </select>

              <select id="editEstado_${p.ID}">
                <option ${p.Estado === "Disponible" ? "selected" : ""}>Disponible</option>
                <option ${p.Estado === "Ocupado" ? "selected" : ""}>Ocupado</option>
                <option ${p.Estado === "Fuera de servicio" ? "selected" : ""}>Fuera de servicio</option>
              </select>
            `
            : ""
        }
      </div>

      <p><b>ID:</b> ${escaparHTML(p.ID)}</p>
      <p><b>Fecha:</b> ${formatearFechaHora(p.Fecha)}</p>
      <p><b>Push Token:</b> ${p["Push Token"] ? "Sí" : "No"}</p>

      <div class="admin-actions">
        <button onclick="editarPersonaAdmin('${tipo}', '${p.ID}')">Guardar cambios</button>
        <button class="danger-btn" onclick="eliminarPersonaAdmin('${tipo}', '${p.ID}')">Eliminar</button>
        <button class="ghost-btn" onclick="buscarHistorialPersona('${tipo}', '${p.ID}', '${escaparHTML(p.Nombre)}')">Ver historial</button>
      </div>
    </div>
  `;
}

async function editarPersonaAdmin(tipo, id) {
  const datos = {
    tipo,
    id,
    nombre: document.getElementById(`editNombre_${id}`).value,
    apellido1: document.getElementById(`editApellido1_${id}`).value,
    apellido2: document.getElementById(`editApellido2_${id}`).value,
    telefono: document.getElementById(`editTelefono_${id}`).value,
    usuario: document.getElementById(`editUsuario_${id}`).value,
    clave: document.getElementById(`editClave_${id}`).value
  };

  if (tipo === "Colaborador") {
    datos.servicio = document.getElementById(`editServicio_${id}`).value;
    datos.estado = document.getElementById(`editEstado_${id}`).value;
  }

  const r = await api("editarPersonaAdmin", datos);

  if (!r.ok) return alert(r.mensaje || "No se pudo actualizar.");

  alert("Registro actualizado correctamente.");
  buscarPersonasAdmin(tipo);
}

async function eliminarPersonaAdmin(tipo, id) {
  const confirmar = confirm("¿Seguro que desea eliminar este registro?");
  if (!confirmar) return;

  const r = await api("eliminarPersonaAdmin", { tipo, id });

  if (!r.ok) return alert(r.mensaje || "No se pudo eliminar.");

  alert("Registro eliminado correctamente.");
  buscarPersonasAdmin(tipo);
}

async function buscarHistorialPersona(tipo, id, nombre) {
  const contenedor = document.getElementById("adminResultadosPersonas");

  contenedor.innerHTML = cargando("Cargando historial...");

  const datos = tipo === "Usuario"
    ? { clienteId: id, limite: 50 }
    : { colaboradorId: id, limite: 50 };

  const r = await api("buscarSolicitudesAdmin", datos);

  if (!r.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(r.mensaje)}</p></div>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="card">
      <h2>📋 Historial de ${escaparHTML(nombre)}</h2>
      <button class="ghost-btn" onclick="renderAdminBuscarPersonas('${tipo}')">Volver a búsqueda</button>
      ${renderListaSolicitudes(r.solicitudes || [])}
    </div>
  `;
}
async function renderAdminSolicitudes24h(silencioso = false) {
  vistaActual = "panelAdmin";
  adminVistaActual = "solicitudes24h";

  if (!silencioso) {
    document.getElementById("app").innerHTML = menuAdmin(cargando("Cargando solicitudes de las últimas 24 horas..."));
  }

  const contenedor = document.getElementById("panelContenido") || document.getElementById("app");

  const r = await api("buscarSolicitudesAdmin", {
    modo: "24h",
    limite: 80
  });

  if (!r.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(r.mensaje)}</p></div>`;
    return;
  }

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>🕒 Solicitudes últimas 24 horas</h2>
        <p>Solo se cargan pedidos recientes para evitar saturar la página.</p>
      </div>
      <button class="small-btn" onclick="renderAdminSolicitudes24h()">Actualizar</button>
    </div>

    ${renderListaSolicitudes(r.solicitudes || [])}
  `;

  contenedor.innerHTML = contenido;
}

function renderAdminHistorialFiltrado() {
  vistaActual = "panelAdmin";
  adminVistaActual = "historialFiltrado";

  const hoy = fechaInputHoy();

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>📋 Historial filtrado</h2>
        <p>Busque por fechas, cliente, colaborador, servicio o estado.</p>
      </div>
      <button class="small-btn" onclick="renderAdminResumen()">Resumen</button>
    </div>

    <div class="card">
      <div class="form-grid">
        <input id="histFechaInicio" type="date" value="${hoy}">
        <input id="histFechaFin" type="date" value="${hoy}">

        <select id="histServicio">
          <option value="">Todos los servicios</option>
          <option>Taxi</option>
          <option>Express</option>
          <option>Carga</option>
          <option>Camión</option>
        </select>

        <select id="histEstado">
          <option value="">Todos los estados</option>
          <option>Pendiente</option>
          <option>Aceptado</option>
          <option>Finalizado</option>
        </select>

        <input id="histCliente" placeholder="Buscar cliente o teléfono">
        <input id="histColaborador" placeholder="Buscar colaborador o teléfono">
      </div>

      <button onclick="buscarHistorialFiltrado()">Buscar historial</button>
    </div>

    <div id="adminHistorialResultado"></div>
  `;

  document.getElementById("app").innerHTML = menuAdmin(contenido);
}

async function buscarHistorialFiltrado() {
  const contenedor = document.getElementById("adminHistorialResultado");

  contenedor.innerHTML = cargando("Buscando solicitudes...");

  const r = await api("buscarSolicitudesAdmin", {
    fechaInicio: document.getElementById("histFechaInicio").value,
    fechaFin: document.getElementById("histFechaFin").value,
    servicio: document.getElementById("histServicio").value,
    estado: document.getElementById("histEstado").value,
    cliente: document.getElementById("histCliente").value,
    colaborador: document.getElementById("histColaborador").value,
    limite: 80
  });

  if (!r.ok) {
    contenedor.innerHTML = `<div class="card"><p>${escaparHTML(r.mensaje)}</p></div>`;
    return;
  }

  contenedor.innerHTML = renderListaSolicitudes(r.solicitudes || []);
}

function renderListaSolicitudes(solicitudes) {
  if (!solicitudes.length) {
    return `<div class="card"><p>No hay solicitudes para mostrar.</p></div>`;
  }

  return `
    <div class="card">
      <h2>Resultados: ${solicitudes.length}</h2>

      ${solicitudes.map(s => `
        <div class="admin-request">
          <div>
            <h3>${escaparHTML(s.Servicio)} · #${escaparHTML(s.ID)}</h3>
            <p><b>Fecha:</b> ${formatearFechaHora(s.Fecha)}</p>
            <p><b>Estado:</b> ${badge(s.Estado)}</p>
            <p><b>Cliente:</b> ${escaparHTML(s.Cliente)}</p>
            <p><b>Teléfono cliente:</b> ${escaparHTML(s["Teléfono cliente"])}</p>
            <p><b>Detalle:</b> ${escaparHTML(s.Detalle)}</p>
            <p><b>Colaborador:</b> ${escaparHTML(s.Colaborador || "Sin asignar")}</p>
            <p><b>Teléfono colaborador:</b> ${escaparHTML(s["Teléfono colaborador"] || "Sin asignar")}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}
async function renderAdminAnuncios() {
  vistaActual = "panelAdmin";
  adminVistaActual = "anuncios";

  const contenido = `
    <div class="topbar card">
      <div>
        <h2>📢 Anuncios publicitarios</h2>
        <p>Cargue imágenes desde el dispositivo. Formatos: PNG, JPG, JPEG, WEBP o GIF.</p>
      </div>
      <button class="small-btn" onclick="renderAdminResumen()">Resumen</button>
    </div>

    <div class="card">
      <h2>Nuevo anuncio</h2>
      <input id="anuncioTitulo" placeholder="Título del anuncio">
      <input id="anuncioImagenArchivo" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
      <textarea id="anuncioDescripcion" placeholder="Descripción breve"></textarea>
      <button onclick="guardarAnuncioAdmin()">Guardar anuncio</button>
    </div>

    <div id="adminListaAnuncios">
      ${cargando("Cargando anuncios...")}
    </div>
  `;

  document.getElementById("app").innerHTML = menuAdmin(contenido);
  await cargarAnunciosAdmin();
}

async function guardarAnuncioAdmin() {
  try {
    const imagenBase64 = await leerImagenComoBase64(
      document.getElementById("anuncioImagenArchivo")
    );

    const r = await api("guardarAnuncioAdmin", {
      titulo: document.getElementById("anuncioTitulo").value,
      imagen: imagenBase64,
      descripcion: document.getElementById("anuncioDescripcion").value
    });

    if (!r.ok) return alert(r.mensaje || "No se pudo guardar.");

    alert("Anuncio guardado correctamente.");

    document.getElementById("anuncioTitulo").value = "";
    document.getElementById("anuncioImagenArchivo").value = "";
    document.getElementById("anuncioDescripcion").value = "";

    cargarAnunciosAdmin();

  } catch (error) {
    alert(error.message);
  }
}

async function cargarAnunciosAdmin() {
  const contenedor = document.getElementById("adminListaAnuncios");
  const r = await api("listarAnuncios");

  const anuncios = r.anuncios || [];

  contenedor.innerHTML = `
    <div class="card">
      <h2>Anuncios activos</h2>
      ${
        anuncios.length === 0
          ? "<p>No hay anuncios activos.</p>"
          : `<div class="ad-grid">
              ${anuncios.map(a => `
                <div class="ad-card">
                  <img src="${escaparHTML(a.Imagen)}" alt="${escaparHTML(a.Titulo)}" loading="lazy">
                  <div class="ad-body">
                    <h3>${escaparHTML(a.Titulo)}</h3>
                    <p>${escaparHTML(a.Descripcion)}</p>
                    <button class="danger-btn" onclick="eliminarAnuncioAdmin('${a.ID}')">Eliminar anuncio</button>
                  </div>
                </div>
              `).join("")}
            </div>`
      }
    </div>
  `;
}

async function eliminarAnuncioAdmin(id) {
  const confirmar = confirm("¿Eliminar este anuncio?");
  if (!confirmar) return;

  const r = await api("eliminarAnuncioAdmin", { id });

  if (!r.ok) return alert(r.mensaje || "No se pudo eliminar.");

  alert("Anuncio eliminado.");
  cargarAnunciosAdmin();
}

window.loginUsuario = loginUsuario;
window.loginColaborador = loginColaborador;
window.loginAdmin = loginAdmin;
window.registrarUsuario = registrarUsuario;
window.registrarColaborador = registrarColaborador;

window.renderPanelUsuario = renderPanelUsuario;
window.renderPanelUsuarioAnuncios = renderPanelUsuarioAnuncios;
window.renderPanelColaborador = renderPanelColaborador;
window.renderPanelAdmin = renderPanelAdmin;

window.renderCrearSolicitud = renderCrearSolicitud;
window.crearSolicitud = crearSolicitud;
window.cambiarEstadoColaborador = cambiarEstadoColaborador;
window.aceptarSolicitud = aceptarSolicitud;
window.finalizarSolicitud = finalizarSolicitud;

window.cerrarSesion = cerrarSesion;
window.activarNotificaciones = activarNotificaciones;

window.renderIngresoUsuario = renderIngresoUsuario;
window.renderRegistroUsuario = renderRegistroUsuario;
window.renderIngresoColaborador = renderIngresoColaborador;
window.renderRegistroColaborador = renderRegistroColaborador;
window.renderIngresoAdmin = renderIngresoAdmin;
window.renderLogin = renderLogin;

window.renderAdminResumen = renderAdminResumen;
window.renderAdminBuscarPersonas = renderAdminBuscarPersonas;
window.buscarPersonasAdmin = buscarPersonasAdmin;
window.editarPersonaAdmin = editarPersonaAdmin;
window.eliminarPersonaAdmin = eliminarPersonaAdmin;
window.buscarHistorialPersona = buscarHistorialPersona;
window.renderAdminSolicitudes24h = renderAdminSolicitudes24h;
window.renderAdminHistorialFiltrado = renderAdminHistorialFiltrado;
window.buscarHistorialFiltrado = buscarHistorialFiltrado;
window.renderAdminAnuncios = renderAdminAnuncios;
window.guardarAnuncioAdmin = guardarAnuncioAdmin;
window.eliminarAnuncioAdmin = eliminarAnuncioAdmin;

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
