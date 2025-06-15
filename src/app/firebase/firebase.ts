import { initializeApp } from "firebase/app"
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "pokecolors.firebaseapp.com",
  projectId: "pokecolors",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Automatically sign in anonymously (one-time, silent)
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch(console.error)
  }
})
