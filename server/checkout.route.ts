import { Request, Response } from 'express';
import { db, getDocData } from './database';
import { Timestamp } from '@google-cloud/firestore';

// According to Stripe documentation, the secret key must be provided at loading module phase:
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// The info comming from the UI client:
interface RequestInfo {
    courseId: string;
    callbackUrl: string;
    userId:string;
    pricingPlanId:string;
}

/**
 * ONE TIME PURCHASE / RECURRING CHARGE
 *
 *  2.1. This is the function which is called when the '/api/checkout'
 *       endpoint is invoked.
 */
export async function createCheckoutSession(req: Request, res: Response) {

    try {

        /**
         * courseId and pricingPlanId are mutually exclusive because the customer
         * could be purchasing only one course or a subscription, but not both of
         * them in one go.
         */
        const info: RequestInfo = {
            courseId: req.body.courseId,
            pricingPlanId: req.body.pricingPlanId,
            callbackUrl: req.body.callbackUrl,
            userId: req["uid"]
        };

        // Before executing the createCheckoutSession endpoint, ensure the user is logged in:
        if (!info.userId) {
            const message = 'User must be authenticated.';
            console.log(message);
            res.status(403).json({message});
            return;
        }

        /**
         * Creates an empty document in a purchaseSession collection. At this
         * point only the unique id of the document is needed.
         */
        const purchaseSession = await db.collection('purchaseSessions').doc();

        // Fill the field that conforms the info of purchaseSession collection:
        const checkoutSessionData: any = {
            status: 'ongoing',
            created: Timestamp.now(),
            userId: info.userId
        };

        // The customer is purchasing only one course:
        if (info.courseId) {
            checkoutSessionData.courseId = info.courseId;

        } else {
          // The customer is purchasing a subscription:
          checkoutSessionData.pricingPlanId = info.pricingPlanId;
        }

        // Save the fields in the purchaseSession collection:
        await purchaseSession.set(checkoutSessionData);

        // Retrieve the corresponding doc from users collection:
        const user = await getDocData(`users/${info.userId}`);

        /**
         * If the user has done a purchase, the user exists in users collection,
         * then take the id assigned by Stripe.
         *
         * Remember that the Stripe customer id is taken when Stripe invokes the
         * webhook, confirming a successful payment.
         *
         * NOTE: See the method onCheckoutSessionCompleted(session) from
         *       stripe-webhook.route.ts file.
         */
        let stripeCustomerId = user ? user.stripeCustomerId : undefined;

        let sessionConfig;

        if (info.courseId) {
            const course = await getDocData(`courses/${info.courseId}`);
            sessionConfig = setupPurchaseCourseSession(info, course,
                purchaseSession.id, stripeCustomerId);
        }
        else if (info.pricingPlanId) {
            sessionConfig = setupSubscriptionSession(info, purchaseSession.id,
                stripeCustomerId, info.pricingPlanId);
        }

        console.log(`createCheckoutSession was called. The session object is: `, sessionConfig);

        /**
         * ONE TIME PURCHASE / RECURRING CHARGE
         *
         * 3. After the session configuration object, requested by Stripe API, is configured,
         *    a new session in Stripe API is created.
         */
        const session = await stripe.checkout.sessions.create(sessionConfig);

        /**
         * ONE TIME PURCHASE
         *
         * 3.1. We have to send back to our UI the Stripe session id and our public key
         *      which is our unique identifier in Stripe systems.
         */
        res.status(200).json({
            stripeCheckoutSessionId: session.id,
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY
        });

    } catch (error) {
        console.log('Unexpected error occurred while purchasing course: ', error);
        res.status(500).json({error: 'Could not initiate Stripe checkout session'});
    }

}

/**
 * RECURRING CHARGE
 *
 * In the new Stripe API Plan API is replaced by Prices API. That is why
 * instead of passing the product ID, the Price Id must be passed and the mode
 * which value will be 'subscription'.
 *
 * Remember, before charging recurring plans, the Product and its corresponding
 * price or prices must be previously created in the Stripe platform.
 *
 */
function setupSubscriptionSession(info: RequestInfo, sessionId: string,stripeCustomerId,
                                  pricingPlanId) {

    const config = setupBaseSessionConfig(info, sessionId, stripeCustomerId);

    // config.subscription_data = {
    //   items: [{plan: pricingPlanId}]
    // };

    config.line_items = [{
      price: pricingPlanId,
      quantity: 1,
    }];

    config.mode = 'subscription';

    return config;
}

/**
 * ONE TIME PURCHASE
 *
 * This method adds line_items for one time purchase.
 */
function setupPurchaseCourseSession(info: RequestInfo, course, ownSessionId: string, stripeCustomerId: string) {

  const config = setupBaseSessionConfig(info, ownSessionId, stripeCustomerId);

  config.line_items = [
    {
      name:         course.titles.description,
      description:  course.titles.longDescription,
      amount:       course.price * 100,
      currency:     'usd',
      quantity:     1
    }
  ];

  return config;
}

/**
 * setupBaseSessionConfig(info: RequestInfo, ownSessionId: string, stripeCustomerId:string): config
 *
 * This method establishes a common properties for initializing a Stripe checkout session.
 *
 * According to the Stripe docs:
 *
   	var stripe = require('stripe')('sk_test_51H1dVPJfjaQkS62EKZJQvnF8yLtEAQZVknMoMqAErbn7SqUMPn6R6qNGcBQOoHcqpN504P1eoteaU6OrTahuP8tB00aKxNPgPU');

    stripe.checkout.sessions.create(
 			{
				success_url: 'https://example.com/success',
				cancel_url: 'https://example.com/cancel',
				payment_method_types: ['card'],

				line_items: [
					{
						price: 'price_H5ggYwtDq4fbrJ',
						quantity: 2,
					},
				],

				mode: 'payment',
			},

			function(err, session) {
				// asynchronously called
			}
		);

 */
function setupBaseSessionConfig(info: RequestInfo, ownSessionId: string, stripeCustomerId: string) {
  const config: any = {
    payment_method_types: ['card'],
    success_url: `${info.callbackUrl}/?purchaseResult=success&ongoingPurchaseSessionId=${ownSessionId}`,
    cancel_url: `${info.callbackUrl}/?purchaseResult=failed`,
    client_reference_id: ownSessionId
  };

  if (stripeCustomerId) {
    config.customer = stripeCustomerId;
  }

  return config;
}





