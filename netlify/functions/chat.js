// netlify/functions/chat.js
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
    var body = JSON.parse(event.body);
    var messages = body.messages || [];
    var image = body.image || null;

    // This prompt is now aligned with your local server.js for consistency.
    var SYSTEM = 'You are ChefSays AI. Respond ONLY with valid JSON. The user prompt may be prefixed with a context string about their history (e.g., "User loves: Italian."). Use this context to provide more relevant, personalized responses. Do not mention the context in your response. When food is mentioned return: {"message":"warm response","recipes":[{"name":"Name","description":"One sentence","homeCost":8.50,"restaurantCost":22.00,"ingredients":[{"name":"Chicken","quantity":"1 lb","cost":4.00},{"name":"Rice","quantity":"1 cup","cost":0.50},{"name":"Garlic","quantity":"3 cloves","cost":0.30}],"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Pro tip"},{"name":"Name 2","description":"Sentence","homeCost":6.00,"restaurantCost":16.00,"ingredients":[{"name":"Eggs","quantity":"4","cost":1.20},{"name":"Butter","quantity":"2 tbsp","cost":0.40},{"name":"Milk","quantity":"quarter cup","cost":0.30}],"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Tip"},{"name":"Name 3","description":"Sentence","homeCost":5.00,"restaurantCost":14.00,"ingredients":[{"name":"Pasta","quantity":"2 cups","cost":1.00},{"name":"Tomato sauce","quantity":"1 cup","cost":1.50},{"name":"Parmesan","quantity":"quarter cup","cost":0.80}],"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Tip"}]}. For greetings: {"message":"response","recipes":[]}. ONLY JSON.';

    var openAIMessages = [{ role: 'system', content: SYSTEM }];

    for (var i = 0; i < messages.length; i++) {
      openAIMessages.push(messages[i]);
    }

    if (image && image.data) {
      openAIMessages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:' + image.type + ';base64,' + image.data }
          },
          {
            type: 'text',
            text: 'Scan this ' + (image.photoType || 'fridge') + ' photo. Only use ingredients you can CLEARLY see. Do NOT add anything not visible. Give me 3 recipes using ONLY what you see.'
          }
        ]
      });
    }

    var response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify(Object.assign({
        model: 'gpt-4o-mini', // Switched to gpt-4o-mini to match server.js
        max_tokens: 3000,
        messages: openAIMessages
      }, (!image || !image.data) ? { response_format: { type: 'json_object' } } : {}))
    });

    var data = await response.json();

    if (data.error) {
      console.error('OpenAI error:', data.error);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ error: data.error.message, text: '' })
      };
    }

    var text = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: text })
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: err.message, text: '' })
    };
  }
};
