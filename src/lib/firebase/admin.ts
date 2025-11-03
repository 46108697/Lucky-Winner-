import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize app only once
if (!admin.apps.length) {
  // This check is to prevent client-side execution.
  if (typeof window === 'undefined') {
    // Replace \n characters with actual newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error('Missing Firebase admin env vars (PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, FieldValue };
export default admin;
