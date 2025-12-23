import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var to the path of a service account JSON.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  console.error('Failed to read service account JSON:', err.message || err);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/set-admin-claim.js <uid>');
  process.exit(1);
}

async function run() {
  try {
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    console.log(`Set admin claim for UID: ${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Error setting admin claim:', err.message || err);
    process.exit(1);
  }
}

run();


