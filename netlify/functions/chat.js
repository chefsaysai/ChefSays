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
    var userContext = body.userContext || '';

    var SYSTEM = 'You are ChefSays — an AI kitchen buddy, professional bartender, AND restaurant consultant. '
      + 'CRITICAL: Respond with ONLY a valid JSON object. No text outside JSON. '
      + 'ALWAYS return exactly 3 different recipe options in the recipes array so the user can choose. '
      + 'If the user mentions drinks, cocktails, spirits, tequila, rum, gin, vodka, whiskey, beer, wine — give DRINK recipes ONLY. '
      + 'If the user rejects previous suggestions (says they do not like them, want something else, are tired of them, etc.), give 3 NEW recipes that still match the ORIGINAL request — same protein, meal type, and general cuisine vibe — just different specific dishes. Do NOT switch to an unrelated cuisine or food category unless the user explicitly asks for that. Example: "tired of smoked meats with BBQ sauce" rejected once should lead to other meat-forward mains (grilled, braised, smoked-but-no-BBQ-sauce, etc.), not pasta or desserts. '
      + 'If the user asks about restaurant menu design, dollar menus, pricing items — respond with a menu array containing items with: item_name, description, cost, sell_price, profit_margin, where_to_buy. '
      + 'For general cooking tips, techniques, substitutions — respond with a message field containing helpful advice. '
      + 'When food, ingredients, meals, drinks or cocktails are mentioned, return this format: '
      + '{"message":"optional tip","recipes":[{"name":"","description":"","homeCost":0,"restaurantCost":0,"prepTime":"","difficulty":"","servings":0,"calories":0,"ingredients":[{"name":"","quantity":"","cost":0}],"steps":[""],"tip":""}]} '
      + 'For menu/restaurant requests: {"message":"","menu":[{"item_name":"","description":"","cost":0,"sell_price":0,"profit_margin":0,"food_cost_percentage":0,"where_to_buy":""}]} '
      + 'For simple tips: {"message":"your helpful advice here"} '
      + 'NEVER use markdown. NEVER use bullet points. ONLY valid JSON.';

    if (userContext) {
      SYSTEM += '\n\nUSER FOOD PROFILE — follow STRICTLY for every recipe, no exceptions: ' + userContext;
      SYSTEM += '\n\nMESSAGE FIELD (mandatory when a food profile is present): Always write a warm, personalized 1–2 sentence "message" in your response. '
        + 'First, check whether the user\'s request mentions any ingredient, protein, or food item that CONFLICTS with their food profile — '
        + 'for example: they asked for chicken but are Jain, vegan, or vegetarian; they asked for beef but follow a Hindu diet; they asked for shellfish but have a shellfish allergy; they asked for eggs but are Jain or vegan. '
        + 'CONFLICT detected → Briefly name the specific restriction and warmly explain what you substituted. Be specific, not generic. '
        + 'Examples: "Since you follow a Jain diet, chicken isn\'t something we can use — but here are 3 incredible paneer and veggie burgers with all the same satisfying flavors!" '
        + '/ "Your vegan profile means no eggs or dairy, so these three breakfast bowls are completely plant-based and just as hearty!" '
        + '/ "Shellfish is off the menu for you, so we\'ve put together 3 delicious seafood alternatives that work with your profile!" '
        + 'NO conflict → Write a warm personalized intro that references their specific diet, tradition, or restriction by name. '
        + 'Examples: "Here are 3 vegetarian options perfectly matched to your Jain dietary profile!" '
        + '/ "Great choice — these 3 recipes are fully Jain-friendly: no onion, garlic, root vegetables, or eggs!" '
        + '/ "Here are 3 halal-friendly dishes that fit your dietary preferences!" '
        + 'NEVER write a generic message when a user profile exists — always name their specific restriction or tradition.';
    }

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
        model: 'gpt-4o',
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
