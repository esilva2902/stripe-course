import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {CheckoutSession} from '../model/checkout-session.model';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {filter, first} from 'rxjs/operators';
import {environment} from '../../environments/environment';

/**
 * This global object is filled in thanks to importing  the Stripe
 * javascript in our index.html file.
 *
 * <script src="https://js.stripe.com/v3"></script>
 *
 * Once the Stripe session is initialized the user must be redirected to
 * the Stripe website to provide its card information.
 *
 * The global object is used to initialized the Stripe frontend library.
 */
declare const Stripe;

/**
 * CheckoutService will be communicating with our backend which
 * in turn communicates with the Stripe API.
 */
@Injectable({
    providedIn: "root"
})
export class CheckoutService {

    private jwtAuth:string;

    constructor(private http:HttpClient,
                private afAuth: AngularFireAuth,
                private afs: AngularFirestore) {

        /**
         * USER AUTHENTICATION
         *
         * As we know the firebase npm module is an Observable-based library.
         *
         * AngularFireAuth module listens for an idToken changes. Therefore,
         * at Checkout service creation, we listen for idToken changes.
         *
         * Listening the idToken property help us to grab the corresponding JWT
         * of the logged in user.
         *
         * Once we have the JWT we could protect our backend service, sending the
         * JWT in each request.
         */
        afAuth.idToken.subscribe(jwt => this.jwtAuth = jwt);

    }

    startCourseCheckoutSession(courseId:string): Observable<CheckoutSession> {
      /**
       * ONE TIME PURCHASE
       *
       * 2. This service method is called by the UI when the user clicks on
       *    buy Course.
       *
       *    This method invokes our server endpoint '/api/checkout' sending
       *    the following payload params:
       *
       *      (a). courseId:    Firestore database id of the selected course.
       *      (b). callbackUrl: The URL which will be called by Stripe after the purchase operation.
       */

      const headers = new HttpHeaders().set("Authorization", this.jwtAuth);

      return this.http.post<CheckoutSession>(environment.api.baseUrl +  "/api/checkout", {
          courseId,
          callbackUrl: this.buildCallbackUrl()
      }, {headers})
    }

    startSubscriptionCheckoutSession(pricingPlanId: string): Observable<CheckoutSession> {
      /**
       * RECURRING CHARGE
       *
       * 2. This service method is called by the UI when the user clicks on
       *    Subscribe button.
       *
       *    This method invokes our server endpoint '/api/checkout' sending
       *    the following payload params:
       *
       *      (a). pricingPlanId: Identifier of our Stripe product (STRIPE_MONTHLY).
       *      (b). callbackUrl:   The URL which will be called by Stripe after the purchase operation.
       */

      const headers = new HttpHeaders().set("Authorization", this.jwtAuth);

      return this.http.post<CheckoutSession>(environment.api.baseUrl +  "/api/checkout", {
          pricingPlanId,
          callbackUrl: this.buildCallbackUrl()
      }, {headers})
    }

    buildCallbackUrl() {

        /**
         * To form the complete URL where the UI is running, take
         * the Protocol, HostName and Port from the Javascript
         * runtime environment.
         */

        // Development (http) or production (https) protocol:
        const protocol = window.location.protocol;
        // hostname which could be localhost or www.dikesoft.com:
        const hostName = window.location.hostname;
        // port:
        const port = window.location.port;

        let callBackUrl = `${protocol}//${hostName}`;

        if (port) {
            callBackUrl += ":" + port;
        }

        // Finally, add our route to receive stripe result:
        callBackUrl+= "/stripe-checkout";

        return callBackUrl;
    }

    redirectToCheckout(session: CheckoutSession) {

        /**
         * ONE TIME PURCHASE
         *
         * 4.1. Our server has sent back to us the Stripe session id and our public
         *      Stripe key.
         *
         *      With those fields we are ready to redirect the user to the checkout
         *      form Stripe UI.
         */

        // We call the public contructor providing our public key, identifying our website against Stripe:
        const stripe = Stripe(session.stripePublicKey);

        // When we make the redirection we identify the pending Stripe session:
        stripe.redirectToCheckout({
            sessionId: session.stripeCheckoutSessionId
        });
    }

    /**
     * ONE TIME PURCHASE
     *
     * 6.1. Checkout service will open a websocket connection (via AngularFirestoreModule) to Firestore,
     *      specifically to purchaseSession collection, waiting for any change in status field.
     *
     *      Once the purchase was completed, it takes the first change an closes the websocket connection.
     *      Therefore, the observable is completed as well.
     *
     */
    waitForPurchaseCompleted(ongoingPurchaseSessionId: string):Observable<any> {
        return this.afs.doc<any>(`purchaseSessions/${ongoingPurchaseSessionId}`)
            .valueChanges()
            .pipe(
                filter(purchase => purchase.status == "completed"),
                first()
            )
    }
}









