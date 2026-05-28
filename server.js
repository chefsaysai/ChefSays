const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const SYSTEM = `You are ChefSays, a warm friendly AI kitchen buddy. CRITICAL: Always respond with ONLY valid JSON, nothing else.

When someone mentions food, ingredients, a meal, or a drink:
{"message":"1-2 warm fun sentences","recipe":{"name":"Recipe Name","emoji":"one food emoji","description":"one sentence","homeCost":8.50,"restaurantCost":22.00,"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00}],"steps":["Step 1. Do this.","Step 2. Do that.","Step 3. Continue.","Step 4. Serve and enjoy."],"tip":"One helpful pro tip."}}

For greetings with no food mention:
{"message":"warm friendly response","recipe":null}

Rules:
- homeCost = realistic total grocery cost
- restaurantCost = what a real restaurant charges
- Always 4-6 ingredients with real costs
- Always 4-6 clear steps
- Be warm and encouraging
- ONLY JSON. NOTHING ELSE.`;

app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [{ role: 'system', content: SYSTEM }, ...messages]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const text = data.choices[0].message.content;
    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ChefSays API is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ChefSays server running on port ${PORT}`);
});
