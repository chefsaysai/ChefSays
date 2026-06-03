// netlify/functions/create-checkout.js
// Creates a Stripe checkout session

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { plan } = JSON.parse(event.body);

    // Price IDs from your Stripe dashboard
    var priceId = plan === 'caterer'
      ? process.env.STRIPE_PRICE_CATERER   // $24.99/month
      : process.env.STRIPE_PRICE_HOME;     // $9.99/month

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://chefsays.ai?payment=success',
      cancel_url: 'https://chefsays.ai?payment=cancelled',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
    console.error('Checkout error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
