import {Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {Course} from '../model/course';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {CourseDialogComponent} from '../course-dialog/course-dialog.component';
import {AngularFireAuth} from '@angular/fire/auth';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {CheckoutService} from '../services/checkout.service';

@Component({
  selector: 'courses-card-list',
  templateUrl: './courses-card-list.component.html',
  styleUrls: ['./courses-card-list.component.css']
})
export class CoursesCardListComponent implements OnInit {

  @Input()
  courses: Course[];

  @Output()
  courseEdited = new EventEmitter();

  isLoggedIn: boolean;

  purchaseStarted = false;

  constructor(
    private dialog: MatDialog,
    private afAuth: AngularFireAuth,
    private checkout: CheckoutService) {
  }

  ngOnInit() {

    /**
     * ONE TIME PURCHASE
     *
     * 0. Once the user clicks on the BUY COURSE button, we have
     *    to ensure that the user has logged in:
     */
    this.afAuth.authState
      .pipe(
        map(user => !!user)
      )
      .subscribe(isLoggedIn => this.isLoggedIn = isLoggedIn);

  }

  purchaseCourse(course: Course, isLoggedIn: boolean) {

    if (!isLoggedIn) {
        alert("Please login first.");
    }

    this.purchaseStarted = true;

    /**
     * ONE TIME PURCHASE
     *
     * 1. Once the user is logged in, we are going to call our server endpoint
     *    in order to initialize (from our server) a checkout session with Stripe
     *    server.
     *
     * IMPORTANT: The reason why we can not start a checkout session from the client
     *            is that we have to prove that the checkout request comes from our website.
     *
     *            Stripe provide a unique token to every client to sign the specified
     *            request. The token must be secret, then the token CAN NOT be at
     *            client side.
     */
    this.checkout.startCourseCheckoutSession(course.id)
        .subscribe(

          /**
           * ONE TIME PURCHASE
           *
           * 4. Once an Stripe session was successfully created, our server is
           *    sending us back the following variables:
           *
           *    (a). Stripe session id.
           *    (b). Our public Stripe key.
           */
            session => {
                this.checkout.redirectToCheckout(session);
            },
            err => {
                console.log('Error creating checkout session', err);
                this.purchaseStarted = false;
            }
        );
  }

}









