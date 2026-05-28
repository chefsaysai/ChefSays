exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { messages } = JSON.parse(event.body);
    const SYSTEM = `You are ChefSays AI. ALWAYS respond with ONLY valid JSON. No text outside JSON.

Return EXACTLY this format every time food is mentioned:
{
  "message": "warm 1-2 sentence response",
  "recipes": [
    {
      "name": "Recipe Name Here",
      "description": "One sentence about this dish",
      "homeCost": 8.50,
      "restaurantCost": 22.00,
      "ingredients": [
        { "name": "Chicken breast", "quantity": "1 lb", "cost": 4.00 },
        { "name": "Rice", "quantity": "1 cup", "cost": 0.50 },
        { "name": "Garlic", "quantity": "3 cloves", "cost": 0.30 }
      ],
      "steps": ["Step 1 instruction here", "Step 2 instruction here", "Step 3 instruction here", "Step 4 finish and serve"],
      "tip": "One helpful pro tip"
    },
    { second recipe in same format },
    { third recipe in same format }
  ]
}

For greetings only with no food: { "message": "warm response", "recipes": [] }

RULES:
- homeCost = realistic total grocery cost in dollars
- restaurantCost = what a real restaurant charges
- ALWAYS return exactly 3 recipes when food mentioned
- Make the 3 recipes different styles/cuisines
- ONLY JSON. NOTHING ELSE.`;

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
    if (data.error) return { statusCode: 400, headers, body: JSON.stringify({ error: data.error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ text: data.choices[0].message.content }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
