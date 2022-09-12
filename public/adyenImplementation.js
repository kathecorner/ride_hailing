const clientKey = document.getElementById("clientKey").innerHTML;
const type = document.getElementById("type").innerHTML;

// Used to finalize a checkout call in case of redirect
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId'); // Unique identifier for the payment session
const redirectResult = urlParams.get('redirectResult');


async function startCheckout(req, res) {
  try {
    // Init Sessions
    const checkoutSessionResponse = await callServer("/api/sessions?type=" + type);
    console.log("after callServer");
    console.log(checkoutSessionResponse);
    
    // Create AdyenCheckout using Sessions response
    const checkout = await createAdyenCheckout(checkoutSessionResponse)
    console.log("after createAdyenCheckout");
    console.log(checkout);

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
                //showImage: true
            },
            card: {
                hasHolderName: true,
                holderNameRequired: true,
                name: "Credit or debit card",
                amount: {
                    value: 10000,
                    currency: "EUR"
                }
            },
            paypal: {
                amount: {
                    currency: "USD",
                    value: 1000
                },
                environment: "test",
                countryCode: "US"   // Only needed for test. This will be automatically retrieved when you are in production.                
            },
            gcash: {
              amount: {
                currency: "PHP",
                value: 1000
              }
            },
            klarna_paynow: {
              amount: {
                currency: "EUR",
                value: 7000
              },
              "shopperLocale": "en_US",
              "countryCode": "SE",
              "telephoneNumber": "+46 840 839 298",
              "shopperEmail": "youremail@email.com",
              "shopperName": {
              "firstName": "Testperson-se",
              "gender": "UNKNOWN",
              "lastName": "Approved"
              },
              "lineItems": [
                {
                  "quantity": "1",
                  "taxPercentage": "2100",
                  "description": "Shoes",
                  "id": "Item #1",
                  "amountIncludingTax": "400",
                  "productUrl": "URL_TO_PURCHASED_ITEM",
                  "imageUrl": "URL_TO_PICTURE_OF_PURCHASED_ITEM"
                }],
                "additionalData" : {
                  "openinvoicedata.merchantData" : "eyJjdXN0b21lcl9hY ... "
                }
            }
        },
        onPaymentCompleted: (result, component) => {
            handleServerResponse(result, component);
        },
        onError: (error, component) => {
            console.error(error.name, error.message, error.stack, component);
        }
    };
    console.log("Checkout configuration is*");
    console.log(AdyenCheckout(configuration));
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
  console.log("at callServer:");
  console.log(res);


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
