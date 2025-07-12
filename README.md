##  Apple Pay + Braintree Node Example

A **simple example** of accepting **Apple Pay payments** using **Braintree** in a Node.js app.
Includes:

* Product card with dynamic price
* Apple Pay button
* Sandbox environment
* Local HTTPS setup for testing

---

## 📂 Project Structure

```
.
├── public/
│   └── index.html
├── .well-known/
│   └── apple-developer-merchantid-domain-association
├── certs/
│   ├── localhost+2.pem         # SSL certificate
│   └── localhost+2-key.pem     # SSL key
├── server.js
├── package.json
└── README.md

```

---

## ✅ Requirements

* Node.js installed (LTS recommended)
* Braintree sandbox account
* Apple Developer Account
* Sandbox iCloud account with Apple Pay enabled (for test cards)
* Safari on Mac/iOS for testing

---

## 🚀 How to Use

### 1️⃣ **Clone this repo**

```bash
git clone https://github.com/shrikantgaur/apple-pay-braintree.git
cd apple-pay-braintree

```

---

### 2️⃣ **Install dependencies**

```bash
npm install
```

---

### 3️⃣ **Setup Braintree Sandbox**

1. [Sign up for a Braintree Sandbox account](https://sandbox.braintreegateway.com/).

2. Copy your:

   * `Merchant ID`
   * `Public Key`
   * `Private Key`

3. Create a `.env` file:

   ```env
   BT_MERCHANT_ID=YOUR_MERCHANT_ID
   BT_PUBLIC_KEY=YOUR_PUBLIC_KEY
   BT_PRIVATE_KEY=YOUR_PRIVATE_KEY
   BT_MERCHANT_ACCOUNT_ID=YOUR_MERCHANT_ACCOUNT_ID
   ```

4. Add your domain in Braintree’s **Apple Pay** settings:

   * Upload the `.well-known/apple-developer-merchantid-domain-association` file to verify your domain.

---

### 4️⃣ **Use a Sandbox iCloud account**

Apple Pay sandbox testing requires a **sandbox iCloud account**:

* [Apple Docs: Create Sandbox Tester](https://developer.apple.com/apple-pay/sandbox-testing/)

👉 Log in to this sandbox account on your **Mac** or **iPhone** under **Settings → \[Your Name] → Media & Purchases → Sandbox Account**

Add a sandbox test card in **Wallet**:

* `Settings → Wallet & Apple Pay → Add Card → Use Sandbox test card`.

---

### 5️⃣ **Setup local HTTPS with mkcert**

Apple Pay requires HTTPS. For local development you can use self-signed certs.

**Install [mkcert](https://github.com/FiloSottile/mkcert):**

```bash
brew install mkcert
brew install nss  # if using Firefox
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

This creates:

* `localhost+2.pem` (cert)
* `localhost+2-key.pem` (key) 

Copy the generated .pem files to a certs/ folder:

```bash
mv localhost+2.pem certs/
mv localhost+2-key.pem certs/
```

---

### 6️⃣ **Update your server and frontend code**

Example `server.js`:

```js
// Load environment variables from .env file
require('dotenv').config();

// Core dependencies
const express = require('express');
const braintree = require('braintree');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Initialize Express app
const app = express();
const port = 3000;

// HTTPS options - paths to your local SSL cert and key
const options = {
  key: fs.readFileSync('./certs/localhost-key.pem'), // Private key
  cert: fs.readFileSync('./certs/localhost.pem')     // Certificate
};

// Create Braintree Gateway instance with your sandbox credentials
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,          // Use Sandbox for testing
  merchantId: process.env.BRAINTREE_MERCHANT_ID,       // Your Merchant ID
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,         // Your Public Key
  privateKey: process.env.BRAINTREE_PRIVATE_KEY        // Your Private Key
});

// Middleware to serve static files from 'public' folder
app.use(express.static('public'));

// Middleware to parse incoming JSON requests
app.use(express.json());

// Serve the main HTML page on root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Endpoint to generate and return a Braintree client token
app.get('/client_token', async (req, res) => {
  try {
    const response = await gateway.clientToken.generate({});
    res.send(response.clientToken); // Send generated token back to client
  } catch (err) {
    console.error('Failed to generate client token:', err);
    res.status(500).send('Could not generate client token');
  }
});

// Endpoint to handle checkout/payment
app.post('/checkout', async (req, res) => {
  const nonceFromClient = req.body.paymentMethodNonce; // Payment nonce from client
  const amount = req.body.amount;                      // Amount to charge (from client)

  if (!amount) {
    return res.status(400).send({ success: false, message: 'Missing amount' });
  }

  const saleRequest = {
    amount: amount,
    paymentMethodNonce: nonceFromClient,
    options: { submitForSettlement: true } // Automatically submit for settlement
  };

  try {
    const result = await gateway.transaction.sale(saleRequest);

    if (result.success) {
      // Payment successful
      res.send({ success: true, transactionId: result.transaction.id });
    } else {
      // Payment failed
      console.error('Transaction failed:', result);
      res.send({ success: false, message: result.message });
    }
  } catch (err) {
    console.error('Error during checkout:', err);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Start HTTPS server with your cert/key on specified port
https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS server running at https://localhost:${port}`);
});

```
Example `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Apple Pay with Braintree - Dynamic Product</title>

  <!-- Braintree Client SDK -->
  <script src="https://js.braintreegateway.com/web/3.92.2/js/client.min.js"></script>
  <!-- Braintree Apple Pay Component -->
  <script src="https://js.braintreegateway.com/web/3.92.2/js/apple-pay.min.js"></script>

  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      padding: 50px;
    }
    .product-card {
      max-width: 300px;
      margin: 0 auto 30px auto;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .product-card img {
      max-width: 100%;
      height: auto;
    }
    #apple-pay-button {
      width: 250px;
      margin: 0 auto;
    }
    #result {
      margin-top: 20px;
      font-weight: bold;
    }
  </style>
</head>
<body>

  <h1>Apple Pay Checkout</h1>

  <!-- Product Card with dynamic price -->
  <div class="product-card" data-price="19.99">
    <img src="https://fastly.picsum.photos/id/4/5000/3333.jpg?hmac=ghf06FdmgiD0-G4c9DdNM8RnBIN7BO0-ZGEw47khHP4" alt="Product Image">
    <h2 class="product-title">Sample Product</h2>
    <p class="product-description">This is a simple description of the product you’re buying.</p>
    <p class="product-price">$19.99</p>
  </div>

  <!-- Container for Apple Pay button -->
  <div id="apple-pay-button"></div>

  <!-- Result message output -->
  <div id="result"></div>

  <!-- JS Integration -->
  <script>
    // Fetch a client token from the server to initialize Braintree
    fetch('/client_token')
      .then(response => response.text())
      .then(clientToken => {
        // Create Braintree client instance
        braintree.client.create({
          authorization: clientToken
        }, function (clientErr, clientInstance) {
          if (clientErr) {
            console.error(clientErr);
            return;
          }

          // Create Braintree Apple Pay instance
          braintree.applePay.create({
            client: clientInstance
          }, function (applePayErr, applePayInstance) {
            if (applePayErr) {
              console.error(applePayErr);
              return;
            }

            // Check if Apple Pay is available on the device
            if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
              document.getElementById('result').innerText = 'Apple Pay is not available.';
              return;
            }

            // Dynamically create the Apple Pay button
            const button = document.createElement('button');
            button.className = 'apple-pay-button';
            button.style.cssText = 'appearance: -apple-pay-button; -webkit-appearance: -apple-pay-button; width: 100%; height: 44px;';

            // Add click handler for Apple Pay
            button.onclick = function () {
              // Get product price dynamically from product card
              const productCard = document.querySelector('.product-card');
              const totalAmount = productCard.getAttribute('data-price') || '0.00';

              // Create an Apple Pay payment request with total amount
              const paymentRequest = applePayInstance.createPaymentRequest({
                total: { label: 'Your Company', amount: totalAmount }
              });

              // Initialize Apple Pay session
              const session = new ApplePaySession(3, paymentRequest);

              // Validate the merchant with Apple Pay servers
              session.onvalidatemerchant = function (event) {
                applePayInstance.performValidation({
                  validationURL: event.validationURL,
                  displayName: 'Your Company'
                }, function (err, merchantSession) {
                  if (err) {
                    console.error(err);
                    session.abort();
                    return;
                  }
                  session.completeMerchantValidation(merchantSession);
                });
              };

              // Handle payment authorization and tokenize payment
              session.onpaymentauthorized = function (event) {
                applePayInstance.tokenize({
                  token: event.payment.token
                }, function (err, payload) {
                  if (err) {
                    console.error(err);
                    session.completePayment(ApplePaySession.STATUS_FAILURE);
                    return;
                  }

                  // Send nonce and amount to server for transaction
                  fetch('/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentMethodNonce: payload.nonce, amount: totalAmount })
                  })
                  .then(response => response.json())
                  .then(result => {
                    if (result.success) {
                      // Complete payment on success
                      session.completePayment(ApplePaySession.STATUS_SUCCESS);
                      document.getElementById('result').innerText = 'Payment successful! Transaction ID: ' + result.transactionId;
                    } else {
                      // Complete payment with failure status
                      session.completePayment(ApplePaySession.STATUS_FAILURE);
                      document.getElementById('result').innerText = 'Payment failed: ' + result.message;
                    }
                  });
                });
              };

              // Start the Apple Pay session
              session.begin();
            };

            // Append the button to the page
            document.getElementById('apple-pay-button').appendChild(button);
          });
        });
      });
  </script>

</body>
</html>

```
---

### 7️⃣ **Run the server**

```bash
node server.js
```

Visit: [https://localhost:3000](https://localhost:3000)

---

### 8️⃣ **Test Apple Pay**

* Open Safari → visit your local HTTPS URL
* Click the **Apple Pay** button
* Use your sandbox test card
* Confirm payment

---

### 9️⃣ **Deploy to Production**

* Use a real SSL certificate (e.g., via Let’s Encrypt).
* Host your `.well-known` domain association file at `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
* Ensure your domain is verified in your Apple Developer account.
* Switch Braintree from `Sandbox` to `Production` keys.

---

## ✅ **Troubleshooting**

* **Apple Pay button not showing?**

  * Use Safari on a real device or Simulator.
  * Check if your sandbox card is added to Wallet.
  * Make sure you’re using HTTPS.
* **Validation errors?**

  * Check your `.well-known` file path.
  * Ensure your domain is listed in Apple Developer → Identifiers → Merchant ID.
* Use `ngrok` for public HTTPS if you prefer:

  ```bash
  ngrok http 3000
  ```

Enjoy! 🚀💳
