const clientKey = document.getElementById("clientKey").innerHTML;
const type = document.getElementById("type").innerHTML;
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const redirectResult = urlParams.get('redirectResult');

const pspRef = null;

async function startCheckout() {
  try {
    // init
    const checkoutSessionResponse = await callServer("/api/sessions?type=" + type);
    
    console.log(checkoutSessionResponse);

    // create AdyenCheckout
    const checkout = await createAdyenCheckout(checkoutSessionResponse)
  
    console.dir(checkout);
    
  // instance Drop-in and mount it
    checkout.create(type).mount(document.getElementById(type));

  } catch (error) {
    console.error(error);
    alert("error!");
  }
}

// LPM redirect
async function finalizeCheckout() {
    try {
        // Create AdyenCheckout
        const checkout = await createAdyenCheckout({id: sessionId});

        
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
        environment: "test",
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
        },
        onPaymentCompleted: (result, component) => {    
          console.log(result.json);      
            handleServerResponse(result, component);          
        },
        //from here 11022022
        /*
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
        */
      
        //until here
        onError: (error, component) => {
            console.error(error.name, error.message, error.stack, component);
        }
    };

    return new AdyenCheckout(configuration);
}

// Call server
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

// handling response
function handleServerResponse(res, component) {  
  //alert(res.resultCode);
  //alert(res.pspReference);
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
