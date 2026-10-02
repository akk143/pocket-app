import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

function getAdminApp() {
  const existingApp = getApps()[0]
  if (existingApp) return existingApp

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment is not configured")
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    projectId,
  })
}

export function adminAuth() {
  return getAuth(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}
