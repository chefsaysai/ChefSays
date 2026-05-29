exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  try {
    var body = JSON.parse(event.body);
    var messages = body.messages;

    var SYSTEM = 'You are ChefSays, a warm friendly AI kitchen buddy. '
      + 'CRITICAL: Respond with ONLY a valid JSON object. No text outside JSON. '
      + 'When food or ingredients are mentioned return this format: '
      + '{"message":"warm 1-2 sentences","recipes":['
      + '{"name":"Recipe Name","description":"One sentence","homeCost":8.50,"restaurantCost":22.00,'
      + '"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00},{"name":"Rice","quantity":"1 cup","cost":0.50},{"name":"Garlic","quantity":"3 cloves","cost":0.30}],'
      + '"steps":["Step 1 do this","Step 2 do that","Step 3 continue","Step 4 serve"],'
      + '"tip":"One helpful pro tip"},'
      + '{"name":"Recipe 2","description":"One sentence","homeCost":6.00,"restaurantCost":16.00,'
      + '"ingredients":[{"name":"Ingredient","quantity":"amount","cost":1.00}],'
      + '"steps":["Step 1","Step 2","Step 3"],"tip":"Tip"},'
      + '{"name":"Recipe 3","description":"One sentence","homeCost":5.00,"restaurantCost":14.00,'
      + '"ingredients":[{"name":"Ingredient","quantity":"amount","cost":1.00}],'
      + '"steps":["Step 1","Step 2","Step 3"],"tip":"Tip"}]} '
      + 'Rules: homeCost = realistic grocery total. restaurantCost = real restaurant price. '
      + 'Make 3 different recipes with different cuisines. '
      + 'Always include 4+ ingredients per recipe with individual costs. '
      + 'For greetings only with no food: {"message":"warm response","recipes":[]} '
      + 'ONLY JSON. ALWAYS.';

    var response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 3000,
        messages: [{ role: 'system', content: SYSTEM }].concat(messages)
      })
    });

    var data = await response.json();

    if (data.error) {
      console.error('OpenAI error:', data.error.message);
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: data.error.message })
      };
    }

    var text = data.choices[0].message.content;
    console.log('Response:', text.substring(0, 100));

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ text: text })
    };

  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
