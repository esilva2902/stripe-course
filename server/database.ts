
/**
 * For accessing the Firestore database '@google-cloud/firestore' server client library is used.
 *
 * Remember that these server client libraries are used to set up privileged
 * server environments. It means that in this environment, requests are not
 * evaluated against your Cloud Firestore security rules. Privileged Cloud
 * Firestore servers are secured using Identity and Access Management (IAM).
 *
 * See the following:
 *
 *      1. https://firebase.google.com/docs/firestore/client/libraries
 *      2. https://cloud.google.com/firestore/docs/quickstart-servers#node.js
 *      3. https://googleapis.dev/nodejs/firestore/latest/index.html
 *
 */
const Firestore = require('@google-cloud/firestore');

const serviceAccountPath = `./service-accounts/${process.env.SERVICE_ACCOUNT_FILE_NAME}`;

/**
 * We have to pass in the following params:
 *
 *      1. Project Id. This is the Firebase project id.
 *      2. We have to provide the path where our json file is saved.
 */
export const db = new Firestore({
    projectId: process.env.PROJECT_ID,
    keyFilename: serviceAccountPath
});


export async function getDocData(docPath) {
    const snap = await db.doc(docPath).get();
    return snap.data();
}



