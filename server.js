require('dotenv').config();
const express = require('express');
const braintree = require('braintree');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const port = 3000;

// HTTPS options - make sure these files exist!
const options = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost.pem')
};

// Braintree Gateway with your real environment vars
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

// Middleware for static files + JSON body
app.use(express.static('public'));
app.use(express.json());

// Serve HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Generate client token
app.get('/client_token', async (req, res) => {
  try {
    const response = await gateway.clientToken.generate({});
    res.send(response.clientToken); // CORRECT — send the generated token
  } catch (err) {
    console.error('Failed to generate client token:', err);
    res.status(500).send('Could not generate client token');
  }
});

// Handle payment
app.post('/checkout', async (req, res) => {
  const nonceFromClient = req.body.paymentMethodNonce;
  const amount = req.body.amount; // Get amount dynamically from client

  if (!amount) {
    return res.status(400).send({ success: false, message: 'Missing amount' });
  }

  const saleRequest = {
    amount: amount,
    paymentMethodNonce: nonceFromClient,
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
    console.error('Error during checkout:', err);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Start HTTPS server
https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS server running at https://localhost:${port}`);
});
