// public/sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyAnJ3K3ZkbL9-z2WA0szn7J7QcTsEMz_SA",
  authDomain: "gen-lang-client-0609703464.firebaseapp.com",
  projectId: "gen-lang-client-0609703464",
  storageBucket: "gen-lang-client-0609703464.firebasestorage.app",
  messagingSenderId: "449246121753",
  appId: "1:449246121753:web:2782ecd47eebff0aeb7f88"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});