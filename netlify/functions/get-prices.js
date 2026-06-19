// netlify/functions/get-prices.js
// Pulls real ingredient cost estimates from Spoonacular

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { ingredients } = JSON.parse(event.body);
    if (!ingredients || !ingredients.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No ingredients' }) };
    }

    const KEY = process.env.SPOONACULAR_KEY;
    if (!KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error: Missing SPOONACULAR_KEY' }) };
    }
    const results = [];
    let total = 0;

    // Spoonacular: parse ingredients in one batch call to get cost estimates
    const body = 'ingredientList=' + encodeURIComponent(ingredients.join('\n')) +
                 '&servings=1&includeNutrition=false';

    const resp = await fetch('https://api.spoonacular.com/recipes/parseIngredients?apiKey=' + KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });

    if (!resp.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'pricing_unavailable', items: [], total: 0 }) };
    }

    const data = await resp.json();

    for (const item of data) {
      const costCents = (item.estimatedCost && item.estimatedCost.value) || 0;
      const dollars = costCents / 100;
      total += dollars;
      results.push({ name: item.originalName || item.name || '', amount: item.amount || '', unit: item.unit || '', cost: +dollars.toFixed(2) });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ items: results, total: +total.toFixed(2) }) };

  } catch (err) {
    console.error('Pricing error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message, items: [], total: 0 }) };
  }
};