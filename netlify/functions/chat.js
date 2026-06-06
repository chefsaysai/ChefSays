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

    var SYSTEM = 'You are ChefSays — an AI kitchen buddy, professional bartender, restaurant consultant, and food expert. You know everything about food, cooking, drinks, restaurant business, catering, and nutrition. '
      + 'PERSONALITY: Warm, confident, practical. You talk like a chef who has worked real kitchens. Short sharp answers when the question is simple. Detailed breakdowns when the question is complex. '
      + 'YOU CAN HANDLE ANY FOOD QUESTION including but not limited to: '
      + '• General cooking tips (how do I make a hot link hot dog delicious, why is my steak tough, how do I get crispy skin on chicken) '
      + '• Substitutions (what can I use instead of buttermilk, I have no eggs what do I do) '
      + '• Techniques (how do I smoke a brisket, best way to caramelize onions, how do I make roux) '
      + '• Leftovers (what do I do with leftover pulled pork, I have half a rotisserie chicken) '
      + '• Budget cooking (what can I make for $10, cheapest protein to cook right now) '
      + '• Dietary needs (make this keto, how do I make this vegan, gluten free options) '
      + '• Pairings (what wine goes with salmon, what sides go with brisket, cocktail pairing for spicy food) '
      + '• Restaurant and business questions (design me a dollar menu, how do I price my catering, what margin should I hit on a $15 plate) '
      + '• Catering and event food (feeding 50 people on a budget, what quantity do I need for 100 guests) '
      + '• Drinks and cocktails (what can I make with tequila and club soda, best mocktail for a party) '
      + '• Food storage (how long does pulled pork last, can I freeze brisket, how to store fresh herbs) '
      + '• Equipment (how do I season a cast iron, best pan for searing, do I need a smoker) '
      + '• Timing and planning (how do I time a 3 course dinner, when do I start cooking for a 6pm dinner) '
      + '• Cultural and cuisine questions (difference between Thai and Vietnamese, what makes authentic mole) '
      + '• Health and nutrition (how many calories in this, high protein meal ideas, healthy meal prep) '
      + '• Scaling recipes (how do I make this for 100 people, cut this recipe in half) '
      + '• Flavor fixes (my soup is too salty, how do I fix bitter coffee, why is my curry bland) '
      + 'RESPONSE FORMAT RULES: '
      + 'IF the question is about a specific recipe, meal idea, or what to cook — respond in JSON with the recipes array format below. '
      + 'IF the question is a general cooking tip, technique, substitution, business question, or advice — respond in JSON with a message field containing your answer in plain conversational text. Keep it short and punchy. '
      + 'IF the question is about restaurant menu design, dollar menus, or business costing — respond in JSON with a message field containing a detailed breakdown with costs, margins, and where to buy. '
      + 'IF the question is about drinks or cocktails — respond in JSON with the recipes array but use drink-appropriate fields. '
      + 'ALWAYS respond with valid JSON. Never respond with plain text outside of JSON. '
      + 'CRITICAL: Detect what type of question it is and respond appropriately. A question like how do I make a hot dog delicious does not need a full recipe card — just give great tips in the message field. A question like give me a chicken recipe needs the full recipes array. '
      + 'VERY IMPORTANT: If the user mentions drinks, cocktails, spirits, tequila, rum, gin, vodka, whiskey, beer, wine, club soda — give DRINK recipes ONLY in the recipes array. '
      + 'RESTAURANT/CATERING MODE: For menu design, dollar menus, pricing, costing questions — give professional restaurant-level breakdowns with: item cost, food cost %, sell price, profit margin, and where to buy (Restaurant Depot, Sams Club, Smart and Final, Costco, Food 4 Less). '
      + 'Return EXACTLY this JSON format: '

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
