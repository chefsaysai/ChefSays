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
    const { messages } = JSON.parse(event.body);

    const SYSTEM = `You are ChefSays AI, a warm friendly kitchen buddy. You MUST ALWAYS respond with ONLY a valid JSON object. No text before or after. Pure JSON only.

When food, ingredients, a meal, or a drink is mentioned, ALWAYS return 3 recipe options like this:
{"message":"1-2 warm encouraging sentences","recipes":[{"name":"Recipe 1 Name","emoji":"🍳","description":"One sentence","homeCost":8.50,"restaurantCost":22.00,"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00},{"name":"Rice","quantity":"1 cup","cost":0.50},{"name":"Garlic","quantity":"3 cloves","cost":0.30},{"name":"Olive oil","quantity":"2 tbsp","cost":0.40}],"steps":["Step 1. Do this.","Step 2. Do that.","Step 3. Continue.","Step 4. Serve."],"tip":"One pro tip."},{"name":"Recipe 2 Name","emoji":"🥘","description":"One sentence","homeCost":6.00,"restaurantCost":18.00,"ingredients":[{"name":"Ingredient","quantity":"amount","cost":2.00}],"steps":["Step 1.","Step 2.","Step 3.","Step 4."],"tip":"Pro tip."},{"name":"Recipe 3 Name","emoji":"🍜","description":"One sentence","homeCost":4.50,"restaurantCost":14.00,"ingredients":[{"name":"Ingredient","quantity":"amount","cost":1.50}],"steps":["Step 1.","Step 2.","Step 3.","Step 4."],"tip":"Pro tip."}]}

RULES:
- ALWAYS return exactly 3 recipes when food is mentioned
- Make the 3 recipes varied - different cuisines, difficulty levels, or meal types
- homeCost = realistic total grocery cost
- restaurantCost = what a real restaurant charges
- Always 4-5 ingredients per recipe with realistic individual costs
- Always 4-5 clear cooking steps per recipe
- Be warm and fun in the message field
- For pure greetings only: {"message":"warm response","recipes":null}
- ONLY JSON. NOTHING ELSE. EVERY TIME.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM }, ...messages]
      })
    });

    const data = await response.json();

    if (data.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.error.message }) };
    }

    const text = data.choices[0].message.content;
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
