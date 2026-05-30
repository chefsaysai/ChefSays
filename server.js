var express = require('express');
var https = require('https');
var app = express();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/', function(req, res) {
  res.json({ status: 'ChefSays running' });
});

app.post('/chat', function(req, res) {
  var messages = req.body.messages;
  if (!messages) return res.status(400).json({ error: 'no messages' });

  var SYSTEM = 'You are ChefSays AI. Respond ONLY with valid JSON. When food is mentioned return: {"message":"warm response","recipes":[{"name":"Name","description":"One sentence","homeCost":8.50,"restaurantCost":22.00,"ingredients":[{"name":"Chicken","quantity":"1 lb","cost":4.00},{"name":"Rice","quantity":"1 cup","cost":0.50},{"name":"Garlic","quantity":"3 cloves","cost":0.30}],"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Pro tip"},{"name":"Name 2","description":"Sentence","homeCost":6.00,"restaurantCost":16.00,"ingredients":[{"name":"Eggs","quantity":"4","cost":1.20},{"name":"Butter","quantity":"2 tbsp","cost":0.40},{"name":"Milk","quantity":"quarter cup","cost":0.30}],"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Tip"},{"name":"Name 3","description":"Sentence","homeCost":5.00,"restaurantCost":14.00,"ingredients":[{"name":"Pasta","quantity":"2 cups","cost":1.00},{"name":"Tomato sauce","quantity":"1 cup","cost":1.50},{"name":"Parmesan","quantity":"quarter cup","cost":0.80}],"steps":["Step 1","Step 2","Step 3","Step 4"],"tip":"Tip"}]}. For greetings: {"message":"response","recipes":[]}. ONLY JSON.';

  var allMessages = [{ role: 'system', content: SYSTEM }].concat(messages);

  var bodyData = JSON.stringify({
    model: 'gpt-4o-mini',
    max_tokens: 3000,
    messages: allMessages
  });

  var options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
      'Content-Length': Buffer.byteLength(bodyData)
    }
  };

  var apiReq = https.request(options, function(apiRes) {
    var data = '';
    apiRes.on('data', function(chunk) { data += chunk; });
    apiRes.on('end', function() {
      try {
        var parsed = JSON.parse(data);
        if (parsed.error) {
          console.error('OpenAI error:', parsed.error.message);
          return res.status(400).json({ error: parsed.error.message });
        }
        var text = parsed.choices[0].message.content;
        console.log('OK:', text.substring(0, 60));
        res.json({ text: text });
      } catch (e) {
        console.error('Parse error:', e.message);
        res.status(500).json({ error: 'parse error' });
      }
    });
  });

  apiReq.on('error', function(e) {
    console.error('Request error:', e.message);
    res.status(500).json({ error: e.message });
  });

  apiReq.write(bodyData);
  apiReq.end();
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', function() {
  console.log('ChefSays on port ' + PORT);
});
