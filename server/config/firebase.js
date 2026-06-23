const admin = require('firebase-admin');

const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error(
    `⚠️ Firebase Admin SDK is NOT configured. Missing env variables:\n${missingVars
      .map((v) => `  - ${v}`)
      .join('\n')}\n\nAdd these to your server/.env file. Get them from Firebase Console → Project Settings → Service Accounts → Generate New Private Key.`
  );
} else {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error.message);
  }
}

module.exports = admin;
