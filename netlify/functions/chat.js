const SYSTEM = `You are ChefSays, a warm friendly AI kitchen buddy. ALWAYS respond with ONLY valid JSON. When food or ingredients are mentioned ALWAYS include a recipe.

Format: {"message":"1-2 warm sentences","recipe":{"name":"Name","emoji":"emoji","description":"one sentence","homeCost":8.50,"restaurantCost":22.00,"ingredients":[{"name":"item","quantity":"amount","cost":2.50}],"steps":["Step 1.","Step 2.","Step 3.","Step 4."],"tip":"one pro tip"}}

No recipe: {"message":"warm response","recipe":null}

ONLY JSON. ALWAYS.`;

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [{ role: 'system', content: SYSTEM }, ...messages]
      })
    });

    const data = await response.json();

    if (data.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.error.message }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: data.choices[0].message.content })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
