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
    var messages = body.messages || [];
    var image = body.image || null;

    var SYSTEM = 'You are ChefSays, a warm friendly AI kitchen buddy. '
      + 'CRITICAL: Respond with ONLY a valid JSON object. No text outside JSON. ALWAYS return exactly 3 different recipe options in the recipes array so the user can choose. '
      + 'When food, ingredients, meals, drinks or cocktails are mentioned, OR when an image of a fridge or food is provided, return EXACTLY this format: '
      + '{"message":"warm 1-2 sentence response","recipes":[{'
      + '"name":"Recipe Name",'
      + '"description":"One sentence description",'
      + '"homeCost":8.50,'
      + '"restaurantCost":22.00,'
      + '"calories":450,'
      + '"prepTime":"20 mins",'
      + '"difficulty":"Easy",'
      + '"servings":2,'
      + '"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00},{"name":"Garlic","quantity":"3 cloves","cost":0.30}],'
      + '"steps":["Step 1","Step 2","Step 3","Step 4"],'
      + '"tip":"One helpful pro tip"'
      + '}]} '
      + 'If an image is provided: ONLY use ingredients you can CLEARLY and CONFIDENTLY see in the photo. Do NOT guess or add ingredients that are not visible. If you can only see 2-3 items, only use those. Start your message by listing exactly what you saw: I can see [only what is visible] in your photo. '
      + 'Start the message with what you detected: "I can see [ingredients] in your fridge! Here is what I can make..." '
      + 'Rules: homeCost = realistic grocery cost. restaurantCost = restaurant price. '
      + 'calories = realistic per serving. difficulty = Easy Medium or Hard. '
      + 'Always 4+ ingredients with costs. Always 4+ steps. '
      + 'Works for food AND cocktails. ' + 'If the user mentions minutes or time (like 10 minutes, 20 minutes), build recipes that can be made in that time or less. Show prep time prominently. Give speed hacks. ' + 'If the user asks for meal prep, give recipes that can be batch cooked on Sunday and stored for the whole week. Include storage tips and how many days each lasts. '
      + 'For greetings only: {"message":"warm response","recipes":[]}. '
      + 'ONLY JSON. ALWAYS.';

    // Build the messages array for OpenAI
    var openAIMessages = [{ role: 'system', content: SYSTEM }];

    // Add chat history
    for (var i = 0; i < messages.length; i++) {
      openAIMessages.push(messages[i]);
    }

    // If image provided, add vision message
    if (image && image.data) {
      openAIMessages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: 'data:' + image.mediaType + ';base64,' + image.data
            }
          },
          {
            type: 'text',
            text: 'Please scan this '+(image.photoType||'fridge')+' photo carefully. List ONLY ingredients you can CLEARLY and CONFIDENTLY see. Do NOT assume or add any ingredient not visible in the photo. Build 3 different recipe options using ONLY those visible ingredients. Never add ingredients the user does not have.'
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
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
        messages: openAIMessages
      })
    });

    var data = await response.json();

    if (data.error) {
      console.error('OpenAI error:', data.error.message);
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: data.error.message }) };
    }

    var text = data.choices[0].message.content;
    console.log('Response:', text.substring(0, 80));
    return { statusCode: 200, headers: headers, body: JSON.stringify({ text: text }) };

  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) };
  }
};
