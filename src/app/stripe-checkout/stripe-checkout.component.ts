import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CheckoutService} from '../services/checkout.service';

@Component({
  selector: 'stripe-checkout',
  templateUrl: './stripe-checkout.component.html',
  styleUrls: ['./stripe-checkout.component.scss']
})
export class StripeCheckoutComponent implements OnInit {

  message = "Waiting for purchase to complete...";

  waiting = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private checkout: CheckoutService) {

  }

  ngOnInit() {

      const result = this.route.snapshot.queryParamMap.get("purchaseResult");

      if (result == "success") {

        // Only on successful purchase, the unique id of purchaseSession document comes in the URL as a query param:
        const ongoingPurchaseSessionId = this.route.snapshot.queryParamMap.get("ongoingPurchaseSessionId");

        /**
         * ONE TIME PURCHASE
         *
         * 6. StripeCheckout component subscribes a method exposed by Checkout service,
         *    waiting for purchase completion.
         *
         * NOTE:  Internally, Checkout service will open a websocket directly to purchaseSession
         *        collection. See waitForPurchaseCompleted(ongoingPurchaseSessionId) method.
         */
        this.checkout.waitForPurchaseCompleted(ongoingPurchaseSessionId)
            .subscribe(
                () => {
                    this.waiting = false;
                    this.message = "Purchase SUCCESSFUL, redirecting...";
                    setTimeout(() => this.router.navigateByUrl("/courses"), 3000);
                })

      }
      else {
          this.waiting = false;
          this.message =  "Purchase CANCELED or FAILED, redirecting...";
          setTimeout(() => this.router.navigateByUrl("/courses"), 3000);
      }


  }

}
