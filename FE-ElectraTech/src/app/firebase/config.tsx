import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBT6Dh8VP_muwmwE_F3RoB07dTWoJEtThg",
  authDomain: "electratech-87423.firebaseapp.com",
  databaseURL:
    "https://electratech-87423-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "electratech-87423",
  storageBucket: "electratech-87423.appspot.com",
  messagingSenderId: "355147874053",
  appId: "1:355147874053:web:211fbacd01e84050cb016c",
  measurementId: "G-W7DVL5YC0C",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

export { app, auth };
