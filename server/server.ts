
import * as express from 'express';
import {Application} from "express";
// import {createCheckoutSession} from './checkout.route';
// import {getUserMiddleware} from './get-user.middleware';
// import {stripeWebhooks} from './stripe-webhooks.route';
// import * as cors from "cors";

export function initServer() {

    // const bodyParser = require('body-parser');

    const app:Application = express();

    // app.use(cors());

    app.route("/").get((req, res) => {
        let key = process.env.STRIPE_SECRET_KEY;

        res.status(200).send(`<h1>API is up and running! The Stripe key is: ${key}</h1>`);
    });

    // app.route("/api/checkout").post(
    //     bodyParser.json(), getUserMiddleware, createCheckoutSession);

    // app.route("/stripe-webhooks").post(
    //     bodyParser.raw({type:'application/json'}), stripeWebhooks);

    const PORT = process.env.PORT || 9000;

    app.listen(PORT, () => {
        console.log("HTTP REST API Server running at port " + PORT);
    });

}

/**
 * (a). Before running our server we have to built it because
 *      we are using Typescript.
 * 
 *      Run the following command: $npm run build
 * 
 *      The above command will call the Typescript compiler: $tsc -P ./server.tsconfig.json passing the
 *      Typescript configuration.
 * 
 *      After building the server the output files will be placed in /server/dist according to server.tsconfig.js file.
 * 
 *      Before running the build command ensure you have installed the following dependencies:
 * 
 *          (a.1). npm install -D typescript
 *          (a.2). npm install -D ts-node
 * 
 * (b). Finally run the following command: $npm run start
 * 
 *      The above command will call: $node dist/main.js
 * 
 * (c). Then our development server will be running at 9000 port.
 * 
 * NOTE: For building and running the server be sure to be at server folder.
 */