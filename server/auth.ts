
/**
 * For validating every incoming request, we are using Firebase Admin SDK.
 *
 * Remember that these server client libraries are used to set up privileged
 * server environments. It means that in this environment, requests are not
 * evaluated against your Cloud Firestore security rules. Privileged Cloud
 * Firestore servers are secured using Identity and Access Management (IAM).
 *
 * See:
 *
 *    1. https://firebase.google.com/docs/firestore/client/libraries
 *    2. https://firebase.google.com/docs/admin/setup
 *
 */


const admin = require('firebase-admin');

const serviceAccountPath = `./service-accounts/${process.env.SERVICE_ACCOUNT_FILE_NAME}`;

admin.initializeApp({
   credential: admin.credential.cert(serviceAccountPath),
   databaseURL:process.env.FIRESTORE_DATABASE_URL
});


export const auth = admin.auth();
