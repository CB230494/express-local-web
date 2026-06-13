importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCQfbLIlHZ18BNBqKAxIRY7HHd_QcQbpxg",
  authDomain: "express-local-push-test.firebaseapp.com",
  projectId: "express-local-push-test",
  storageBucket: "express-local-push-test.firebasestorage.app",
  messagingSenderId: "895952227571",
  appId: "1:895952227571:web:53b7cbc65e2acc69993b86"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || "Express Local";
  const opciones = {
    body: payload.notification?.body || "Nueva notificación",
    icon: "./icon-192.png",
    badge: "./icon-192.png"
  };

  self.registration.showNotification(titulo, opciones);
});
