// netlify/functions/stripe-webhook.js
// Handles Stripe webhook events (payment confirmations)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let stripeEvent;
    
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    // Handle payment success
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      console.log('Payment successful:', session.customer_email, session.amount_total);
      // Future: save to database, send welcome email, unlock features
    }

    // Handle subscription created
    if (stripeEvent.type === 'customer.subscription.created') {
      const subscription = stripeEvent.data.object;
      console.log('Subscription created:', subscription.id);
    }

    // Handle subscription cancelled
    if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object;
      console.log('Subscription cancelled:', subscription.id);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

  } catch (err) {
    console.error('Webhook error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
