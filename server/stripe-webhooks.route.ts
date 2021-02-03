
import { Request, Response } from 'express';
import { db, getDocData } from './database';

// Remember, in order to initialize the Stripe node module, we must passed our STRIPE_SECRET_KEY:
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * ONE TIME PURCHASE / RECURRING CHARGE
 *
 * 5. Due to Stripe will send us the cancelation or confirmation as an Event types, we
 *    expose only one endpoint to Stripe ('/stripe-webhooks'). Inside the request
 *    handler we manage which type of event is sent.
 *
 * IMPORTANT:   This endpoint is invoked only by Stripe. Every request must be
 *              validated. That is why every request is signed with a sepecial
 *              secret stored in STRIPE_WEBHOOK_SECRET.
 */
export async function stripeWebhooks(req: Request, res:Response) {

    try {

        /**
         * Stripe sends us every request signed with the STRIPE_WEBHOOK_SECRET.
         *
         * The signature must be validated, then the signature is taken from
         * the request headers.
         */
        const signature = req.headers["stripe-signature"];

        console.log(`stripeWebhooks was called with the following signature: ${signature}`);

        /**
         * Signature validation is done via the Stripe node module. The method
         * stripe.webhooks.constructEvent will validate every request and returns
         * the corresponding event info.
         */
        const event = stripe.webhooks.constructEvent(
            req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

        /**
         * checkout.session.completed event type means that the user payment has
         * been successfully processed.
         */
        if (event.type == "checkout.session.completed") {
            // Stripe session is taken from the data of the sent event:
            const session = event.data.object;

            /**
             * ONE TIME PURCHASE / RECURRING CHARGE
             *
             * 5.1. Since Stripe has marked the session as complete, we must do
             *      the same in our Firestore database.
             */
            await onCheckoutSessionCompleted(session);

        }

        /**
         * ONE TIME PURCHASE / RECURRING CHARGE
         *
         * 5.2. Once purchaseSession collection was updated, an event
         *      acknowledment is sent to Stripe.
         *
         * IMPORTANT:   Stripe will invoke our successful URL only if Stripe
         *              has received the event acknowledgment from our backend
         *              server.
         *
         * 5.3. Stripe invoke our successful URL.
         */
        res.json({received:true});

    }
    catch(err) {
        console.log('Error processing webhook event, reason: ', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
}

// ONE TIME PURCHASE / RECURRING CHARGE
async function onCheckoutSessionCompleted(session) {

    // Take the unique id of our purchaseSession collection document from the client_reference_id:
    const purchaseSessionId = session.client_reference_id;

    // Get the corresponding ids from purchaseSessions collection:
    const {userId, courseId, pricingPlanId} =
        await getDocData(`purchaseSessions/${purchaseSessionId}`);

    /**
     * IMPORTANT:
     *
     * It does not matter what resource the customer is buying, the customer id, assigned by Stripe,
     * is taken in order to group all the payments done by the same user.
     *
     * The customer id assigned by Stripe is found in the session object in customer field.
     */

    // The customer is buying a course:
    if (courseId) {
        await fulfillCoursePurchase(userId, courseId, purchaseSessionId, session.customer);
    }
    else if (pricingPlanId) {
      // The customer is buying a subscription:
      await fulfillSubscriptionPurchase(purchaseSessionId, userId,
          session.customer, pricingPlanId);
    }
}

async function fulfillSubscriptionPurchase(purchaseSessionId:string, userId:string,
                                           stripeCustomerId:string, pricingPlanId:string) {

    /**
     * RECURRING CHARGE
     *
     * 5.1. To finish the purchase operation we must associate the user
     *      who bought the subscription with the pricingPlanId.
     *
     * REMEMBER:  The pricingPlanId was created in the Stripe platform an it represents
     *            the Price of the subscription. The subscription was created in
     *            Stripe platform as well, and is the Product associated with the
     *            giving pricingPlanId.
     *
     * IMPORTANT: All the database operations are done via a Firestore batch. It
     *            means all of them run in a single atomic transaction.
     */
    const batch = db.batch();

    /**
     * (a). The first operation to perform is marking our purchase session as 'completed':
     */
    // Retrieve the reference for the given purchase session doc path:
    const purchaseSessionRef = db.doc(`purchaseSessions/${purchaseSessionId}`);
    // Then update the doc ref with the status of "completed":
    batch.update(purchaseSessionRef, {status: "completed"});

    /**
     * (b). The second operation is granting access to all courses the user
     *      who is buying the subscription.
     *
     * NOTE:  When a user buys only one course, the courseId is stored in coursesOwned
     *        collection which is beneath the users collection.
     *
     *        coursesOwned collection is used exclusively to stored courses
     *        that was bougth separately. Therefore, when a subscription is bought
     *        the pricingPlanId will be stored in the users collection directly.
     */
    // Get a doc ref to the corresponding user doc path:
    const userRef = db.doc(`users/${userId}`);
    // Then add/update the Stripe customer id and the pricingPlanId. If the users collection does not exist, then it will be created.
    batch.set(userRef, {pricingPlanId, stripeCustomerId}, {merge: true} );

    return batch.commit();
}

async function fulfillCoursePurchase(userId:string, courseId:string,
                                     purchaseSessionId:string,
                                     stripeCustomerId:string) {

    /**
     * ONE TIME PURCHASE
     *
     * 5.1. To finish the purchase operation we must associate the user
     *      who bought the course with the course itself.
     *
     * IMPORTANT: All the database operations are done via a Firestore batch. It
     *            means all of them run in a single atomic transaction.
     */
    const batch = db.batch();

    /**
     * (a). The first operation to perform is marking our purchase session as 'completed':
     */

    // Retrieve the reference for the given purchase session doc path:
    const purchaseSessionRef = db.doc(`purchaseSessions/${purchaseSessionId}`);
    // Then update the doc ref with the status of "completed":
    batch.update(purchaseSessionRef, {status: "completed"});

    /**
     * (b). The second operation is creating the list of courses the user has access.
     *      This collection will be beneath the users collection.
     */

    // Get a doc ref to the desired path:
    const userCoursesOwnedRef = db.doc(`users/${userId}/coursesOwned/${courseId}`);
    // Since we only want to store the course id, we create an empty doc:
    batch.create(userCoursesOwnedRef, {});

    /**
     * (c). The last operation is taking the id assigned to the customer by Stripe.
     *      The Stripe customer id will be added to the users collection.
     */

    // Get a doc ref to the users path:
    const userRef = db.doc(`users/${userId}`);
    // Then add/update the Stripe customer id. If the users collection does not exist, then it will be created.
    batch.set(userRef, {stripeCustomerId}, {merge: true});

    return batch.commit();
}























