const admin = require('firebase-admin');

let serviceAccount;

try {
  // Try local file first (for development)
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  // If file is missing, try environment variable (for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.warn('⚠️ Firebase service account key not found. Google Auth will not work.');
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;
