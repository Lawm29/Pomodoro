const firebaseConfig = {
  apiKey: "AIzaSyD0FuqEMOEq0usI8KqIGysJ9BesKR40On0",
  authDomain: "pomodoro-a9cbf.firebaseapp.com",
  projectId: "pomodoro-a9cbf",
  storageBucket: "pomodoro-a9cbf.firebasestorage.app",
  messagingSenderId: "1094840956136",
  appId: "1:1094840956136:web:6da6466e95b42a4165455d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();