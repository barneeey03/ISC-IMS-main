import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyABOGvtONoMVqwFdiWhYjioNoQKDjJsAU4",
  authDomain: "ims-with-purchasing---isc.firebaseapp.com",
  projectId: "ims-with-purchasing---isc",
  storageBucket: "ims-with-purchasing---isc.firebasestorage.app",
  messagingSenderId: "641690217856",
  appId: "1:641690217856:web:2e229b7c55b5a374b12565",
  measurementId: "G-38KT8SVCFS"
}

const app = initializeApp(firebaseConfig)

let analytics
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app)
}

export const db = getFirestore(app)
export const auth = getAuth(app)

export { app, analytics }
