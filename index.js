const express = require("express");
const path = require("path");
const hbs = require("express-handlebars");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { uuid } = require("uuidv4");

const { hmacValidator } = require('@adyen/api-library');
const { Client, Config, CheckoutAPI } = require("@adyen/api-library");

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));

dotenv.config({
  path: "./.env",
});

const config = new Config();
config.apiKey = process.env.ADYEN_API_KEY;
const client = new Client({ config });
client.setEnvironment("TEST");
const checkout = new CheckoutAPI(client);

app.engine(
  "handlebars",
  hbs.engine({
    defaultLayout: "main",
    layoutsDir: __dirname + "/views/layouts",
    helpers: require("./util/helpers"),
  })
);

app.set("view engine", "handlebars");

app.post("/api/sessions", async (req, res) => {

  try {
    const orderRef = uuid();
    const localhost = req.get('host');
    const protocol = req.socket.encrypted? 'https' : 'http';
    const response = await checkout.sessions({
       "amount":{"value":455000,"currency":"IDR"},
      /*
      "billingAddress":
      {"city":"Acheson","country":"CA","houseNumberOrName":"test","postalCode":"11285","stateOrProvince":"AB","street":"274 St"},"countryCode":"CA","deliveryAddress":{"city":"Acheson","country":"CA","houseNumberOrName":"test","postalCode":"11285","stateOrProvince":"AB","street":"274 St"},"lineItems":[{"amountExcludingTax":null,"amountIncludingTax":1,"description":"Navy style moccasins_8G9MU7219615","id":"1395873","quantity":1,"taxAmount":null,"taxPercentage":0,"productUrl":null,"imageUrl":"https://www.dev.musinsa.com/app/goods/1395873"}],"merchantAccount":"MUSINSAECOM","reference":"LP3QdsJQr0wnxJA1bI4Tvm1X3cXLV8","returnUrl":"https://pay-gw.dev.musinsa.com/payment/v3/webhook/adyen","shopperEmail":"jenny.lee@musinsa.com","shopperName":{"infix":null,"gender":"UNKNOWN","lastName":"lee","firstName":"jenny"},"shopperReference":"LP3QdsJQr0wnxJA1bI4Tvm1X3cXLV8",
      */
      "additionalData":{
        "authorisationType":"PreAuth"
      },
      
      
      
      
      
      shopperReference: "kenji03",
      storePaymentMethod: "true",
      shopperInteraction: "Ecommerce",
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      reference: orderRef,
      returnUrl: `${protocol}://${localhost}/api/handleShopperRedirect?orderRef=${orderRef}` // local payment methods
    });
    //console(response.sessionData);
    res.json(response);
    

  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});



// redirects handling
app.all("/api/handleShopperRedirect", async (req, res) => {  
  const redirect = req.method === "GET" ? req.query : req.body;
  const details = {};
  if (redirect.redirectResult) {
    details.redirectResult = redirect.redirectResult;
  } else if (redirect.payload) {
    details.payload = redirect.payload;
  }

  try {
    const response = await checkout.paymentsDetails({ details });
    // Conditionally handle different result codes for the shopper
    switch (response.resultCode) {
      case "Authorised":
        res.redirect("/result/success");
        break;
      case "Pending":
      case "Received":
        res.redirect("/result/pending");
        break;
      case "Refused":
        res.redirect("/result/failed");
        break;
      default:
        res.redirect("/result/error");
        break;
    }
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.redirect("/result/error");
  }
});

app.get("/", (req, res) => res.render("index"));
//app.get("/", (req, res) => res.render("test"));

app.get("/preview", (req, res) =>
  res.render("preview", {
    type: req.query.type,
  })
);

// Checkout
app.get("/checkout", (req, res) =>
  res.render("checkout", {
    type: req.query.type,
    clientKey: process.env.ADYEN_CLIENT_KEY
  })
);

// show result
app.get("/result/:type", (req, res) =>
  res.render("result", {
    type: req.params.type,
  })
);
//final auth confirmation
app.get("/final", (req, res) => res.render("final"));

//start index.js
function getPort() {
  return process.env.PORT || 8080;
}
app.listen(getPort(), () => console.log(`Server started -> http://localhost:${getPort()}`));
