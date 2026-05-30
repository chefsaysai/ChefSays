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
      + 'When food, ingredients, meals, drinks or cocktails are mentioned, return EXACTLY this format: '
      + '{"message":"warm 1-2 sentence response","recipes":[{'
      + '"name":"Recipe or Drink Name",'
      + '"description":"One sentence description",'
      + '"homeCost":8.50,'
      + '"restaurantCost":22.00,'
      + '"calories":450,'
      + '"prepTime":"20 mins",'
      + '"difficulty":"Easy",'
      + '"servings":2,'
      + '"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00},{"name":"Garlic","quantity":"3 cloves","cost":0.30}],'
      + '"steps":["Step 1 do this","Step 2 do that","Step 3 continue","Step 4 serve and enjoy"],'
      + '"tip":"One helpful pro tip"'
      + '}]} '
      + 'Rules: '
      + 'homeCost = realistic grocery or liquor store cost. '
      + 'restaurantCost = what a restaurant or bar charges. '
      + 'calories = realistic calories per serving. '
      + 'difficulty = Easy, Medium, or Hard. '
      + 'Always include 4+ ingredients with individual costs. '
      + 'Always include 4+ clear steps. '
      + 'Works for food AND cocktails - if someone asks for a cocktail or drink, treat it exactly like a recipe with bar cost vs home cost. '
      + 'For greetings only: {"message":"warm friendly response","recipes":[]}. '
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
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: data.error.message }) };
    }

    var text = data.choices[0].message.content;
    return { statusCode: 200, headers: headers, body: JSON.stringify({ text: text }) };

  } catch (err) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) };
  }
};
