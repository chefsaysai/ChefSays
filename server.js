const express = require('express');
const app = express();

// Allow ALL origins - no restrictions
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/', function(req, res) {
  res.json({ status: 'ChefSays API running', version: '3.0' });
});

app.post('/chat', async function(req, res) {
  try {
    var messages = req.body.messages;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    var SYSTEM = 'You are ChefSays, a warm friendly AI kitchen buddy. '
      + 'CRITICAL: Respond with ONLY a valid JSON object. No text outside JSON. '
      + 'When food or ingredients are mentioned return this format: '
      + '{"message":"warm 1-2 sentences","recipes":['
      + '{"name":"Recipe Name","description":"One sentence","homeCost":8.50,"restaurantCost":22.00,'
      + '"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00},{"name":"Rice","quantity":"1 cup","cost":0.50},{"name":"Garlic","quantity":"3 cloves","cost":0.30}],'
      + '"steps":["Step 1 do this","Step 2 do that","Step 3 continue","Step 4 serve"],'
      + '"tip":"One helpful pro tip"},'
      + '{"name":"Recipe 2 Name","description":"One sentence","homeCost":6.00,"restaurantCost":16.00,'
      + '"ingredients":[{"name":"Eggs","quantity":"4 large","cost":1.20},{"name":"Butter","quantity":"2 tbsp","cost":0.40},{"name":"Cheese","quantity":"half cup","cost":0.80}],'
      + '"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Tip"},'
      + '{"name":"Recipe 3 Name","description":"One sentence","homeCost":5.00,"restaurantCost":14.00,'
      + '"ingredients":[{"name":"Pasta","quantity":"2 cups","cost":1.00},{"name":"Tomato sauce","quantity":"1 cup","cost":1.50},{"name":"Parmesan","quantity":"quarter cup","cost":0.80}],'
      + '"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Tip"}]} '
      + 'Rules: homeCost = realistic grocery total. restaurantCost = real restaurant price. '
      + 'Make 3 DIFFERENT recipes with different cuisines. '
      + 'For greetings only: {"message":"warm response","recipes":[]}. ONLY JSON.';

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
      return res.status(400).json({ error: data.error.message });
    }

    var text = data.choices[0].message.content;
    console.log('Response sent:', text.substring(0, 80));
    res.json({ text: text });

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', function() {
  console.log('ChefSays server running on port ' + PORT);
});
