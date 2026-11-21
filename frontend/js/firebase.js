import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB60_4KkrX4Y-O6Wjn4cMmAeAYi1gRyrpg",
  authDomain: "taskflow-grp7.firebaseapp.com",
  projectId: "taskflow-grp7",
  storageBucket: "taskflow-grp7.firebasestorage.app",
  messagingSenderId: "220849804002",
  appId: "1:220849804002:web:fb127e7c780657e36044bb"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);