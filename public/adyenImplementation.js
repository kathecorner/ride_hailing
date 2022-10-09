const clientKey = document.getElementById("clientKey").innerHTML;
const type = document.getElementById("type").innerHTML;

// Used to finalize a checkout call in case of redirect
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId'); // Unique identifier for the payment session
const redirectResult = urlParams.get('redirectResult');


async function startCheckout() {
  try {
    // Init Sessions
    const checkoutSessionResponse = await callServer("/api/sessions?type=" + type);

    // Create AdyenCheckout using Sessions response
    const checkout = await createAdyenCheckout(checkoutSessionResponse)

  // Create an instance of Drop-in and mount it
    checkout.create(type).mount(document.getElementById(type));

  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
}

// Some payment methods use redirects. This is where we finalize the operation
async function finalizeCheckout() {
    try {
        // Create AdyenCheckout re-using existing Session
        const checkout = await createAdyenCheckout({id: sessionId});

        // Submit the extracted redirectResult (to trigger onPaymentCompleted() handler)
        checkout.submitDetails({details: {redirectResult}});
    } catch (error) {
        console.error(error);
        alert("Error occurred. Look at console for details");
    }
}

async function createAdyenCheckout(session) {

    const configuration = {
        clientKey,
        locale: "en_US",
        environment: "test",  // change to live for production
        showPayButton: true,
        session: session,
        paymentMethodsConfiguration: {
            ideal: {
                showImage: true
            },
            card: {
                hasHolderName: true,
                holderNameRequired: true,
                name: "Credit or debit card",
                amount: {
                    value: 1000,
                    currency: "USD"
                }
            },
            paypal: {
                amount: {
                    currency: "USD",
                    value: 1000
                },
            applepay: {
                
   "additionalData" : {
      "riskdata.basket.item1" : {
         "itemID" : "000010",
         "productTitle" : "COTTON MODAL open collar short SLEEVE SHIRT (TALL - 31.5\") - en",
         "amountPerItem" : "499.0000",
         "upc" : "0001*****0372",
         "sku" : "00000191",
         "brand" : "UQ",
         "manufacturer" : "FAST_RETAILING",
         "color" : "COL71",
         "size" : "MSC025",
         "quantity" : "1"
      }
   },
   "amount" : {
      "value" : 59900,
      "currency" : "SEK"
   },
   "merchantAccount" : "Uniqlo_Qburst",
   "shopperReference" : "96b37ed02477a791f28a2cf2893b198c",
   "reference" : "PMG0C1E9B2DI660ARW6ZRFOCEZNEQ71",
   "shopperName" : {
      "firstName" : "Reshma",
      "gender" : "UNKNOWN",
      "lastName" : "Pillai"
   },
   "shopperEmail" : "seapplepay@gmail.com",
   "shopperIP" : "111.93.116.30",
   "deliveryAddress" : {
      "city" : "Bodens kommun",
      "country" : "SE",
      "street" : "110 Ferne Spurs",
      "houseNumberOrName" : "96146, Norrbotten County",
      "postalCode" : "984 99",
      "stateOrProvince" : "Stockholm"
   },
   "billingAddress" : {
      "city" : "Bodens kommun",
      "country" : "SE",
      "street" : "110 Ferne Spurs",
      "houseNumberOrName" : "96146, Norrbotten County",
      "postalCode" : "984 99",
      "stateOrProvince" : "Stockholm"
   },
   "deliveryDate" : "2022-05-29T12:30:02Z",
   "storePaymentMethod" : false,
   "browserInfo" : {
      "userAgent" : "Mozilla\/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit\/605.1.15 (KHTML, like Gecko) Version\/14.1.1 Mobile\/15E148 Safari\/604.1",
      "acceptHeader" : "application\/json",
      "language" : "en-ca",
      "colorDepth" : 32,
      "screenHeight" : 896,
      "screenWidth" : 414,
      "timeZoneOffset" : -330,
      "javaEnabled" : false
   },
   "paymentMethod" : {
      "type" : "applepay",
      "applePayToken" : "*****"
   },
   "accountInfo" : {
      "accountCreationDate" : "2022-05-25T06:46:41Z"
   }

                },
                environment: "test",
                countryCode: "US"   // Only needed for test. This will be automatically retrieved when you are in production.
            }
        },
        onPaymentCompleted: (result, component) => {
            handleServerResponse(result, component);
        },
        onError: (error, component) => {
            console.error(error.name, error.message, error.stack, component);
        }
    };

    return new AdyenCheckout(configuration);
}

// Calls your server endpoints
async function callServer(url, data) {
  const res = await fetch(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : "",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
}

// Handles responses sent from your server to the client
function handleServerResponse(res, component) {
  if (res.action) {
    component.handleAction(res.action);
  } else {
    switch (res.resultCode) {
      case "Authorised":
        window.location.href = "/result/success";
        break;
      case "Pending":
      case "Received":
        window.location.href = "/result/pending";
        break;
      case "Refused":
        window.location.href = "/result/failed";
        break;
      default:
        window.location.href = "/result/error";
        break;
    }
  }
}

if (!sessionId) {
    startCheckout();
}
else {
    // existing session: complete Checkout
    finalizeCheckout();
}
