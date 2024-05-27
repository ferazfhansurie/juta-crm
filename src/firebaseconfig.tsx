import { initializeApp } from "firebase/app";
import { getToken, getMessaging, onMessage, isSupported } from "firebase/messaging";


const firebaseConfig = {
    apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
    authDomain: "onboarding-a5fcb.firebaseapp.com",
    databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "onboarding-a5fcb",
    storageBucket: "onboarding-a5fcb.appspot.com",
    messagingSenderId: "334607574757",
    appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
    measurementId: "G-2C9J1RY67L"
};

export const firebaseApp = initializeApp(firebaseConfig);

export const messaging = getMessaging(firebaseApp);

// getOrRegisterServiceWorker function is used to try and get the service worker if it exists, otherwise it will register a new one.
export const getOrRegisterServiceWorker = () => {
  if (
    "serviceWorker" in navigator &&
    typeof window.navigator.serviceWorker !== "undefined"
  ) {
    return window.navigator.serviceWorker
      .getRegistration("/firebase-push-notification-scope")
      .then((serviceWorker) => {
        if (serviceWorker) return serviceWorker;
        return window.navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          {
            scope: "/firebase-push-notification-scope",
          }
        );
      });
  }
  throw new Error("The browser doesn`t support service worker.");
};
 
// getFirebaseToken function generates the FCM token 
export const getFirebaseToken = async () => {
  try {
    const messagingResolve = await messaging;
    if (messagingResolve) {
      return getOrRegisterServiceWorker().then((serviceWorkerRegistration) => {
        return Promise.resolve(
          getToken(messagingResolve, {
            vapidKey: "BExR9jp0WyQdOriPh1DCcnECffpE_MNEeVUzrc_zJWDhF5UCsSc9AtywfDO7Pj3-ILW8tN3Fn4uJfcvEctcb23Y",
            serviceWorkerRegistration,
          })
        );
      });
    }
  } catch (error) {
    
  }
};
const UrlFirebaseConfig = new URLSearchParams(
    {
        apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
        authDomain: "onboarding-a5fcb.firebaseapp.com",
        databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "onboarding-a5fcb",
        storageBucket: "onboarding-a5fcb.appspot.com",
        messagingSenderId: "334607574757",
        appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
        measurementId: "G-2C9J1RY67L"
    }.toString()
  );
  
  const swUrl = `http://localhost:5173/firebase-messaging-sw.js?${UrlFirebaseConfig}`;