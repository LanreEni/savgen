// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAawmwfttisfFCn69PzcNex92MrEQFJKGY",
  authDomain: "savenextgen-82dd9.firebaseapp.com",
  projectId: "savenextgen-82dd9",
  storageBucket: "savenextgen-82dd9.firebasestorage.app",
  messagingSenderId: "477588752231",
  appId: "1:477588752231:web:957eeb87655319dab251c2",
  measurementId: "G-RCG02K3GVN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
