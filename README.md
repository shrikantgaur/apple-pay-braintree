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

### 6️⃣ **Update your server**

Example `server.js`:

```js
const https = require('https');
const fs = require('fs');
const express = require('express');
const braintree = require('braintree');
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Braintree config
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY,
});

app.get('/client_token', async (req, res) => {
  const response = await gateway.clientToken.generate({});
  res.send(response.clientToken);
});

app.post('/checkout', async (req, res) => {
  const { paymentMethodNonce, amount } = req.body;

  const saleRequest = {
    amount: amount,
    paymentMethodNonce: paymentMethodNonce,
    options: { submitForSettlement: true }
  };

  try {
    const result = await gateway.transaction.sale(saleRequest);

    if (result.success) {
      res.send({ success: true, transactionId: result.transaction.id });
    } else {
      console.error('Transaction failed:', result);
      res.send({ success: false, message: result.message });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// HTTPS server with mkcert certs
const options = {
  key: fs.readFileSync('./localhost+2-key.pem'),
  cert: fs.readFileSync('./localhost+2.pem')
};

https.createServer(options, app).listen(3000, () => {
  console.log('✅ Server running at https://localhost:3000');
});
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

Enjoy! 🚀🍏💳
