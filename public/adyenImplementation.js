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
    
    console.log(checkoutSessionResponse);

    // Create AdyenCheckout using Sessions response
    const checkout = await createAdyenCheckout(checkoutSessionResponse)
  
    console.dir(checkout);
    
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
                environment: "test",
                countryCode: "US"   // Only needed for test. This will be automatically retrieved when you are in production.
            }
        },
        onPaymentCompleted: (result, component) => {
            handleServerResponse(result, component);
        },
        //from here 11022022
        onValidateMerchant: (resolve, reject, validationURL) => {
        // Your server uses the validation URL to request a session from the Apple Pay server.
        // Call resolve(MERCHANTSESSION) or reject() to complete merchant validation.
        validateMerchant(validationURL)
            .then(response => {
            // Complete merchant validation with resolve(MERCHANTSESSION) after receiving an opaque merchant session object, MerchantSession
            resolve(response);
            })
            .catch(error => {
            // Complete merchant validation with reject() if any error occurs
            reject();
            });
        }
      
      
        //until here
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
