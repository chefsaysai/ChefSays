exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  
  try {
    const { messages } = JSON.parse(event.body);
    
    const SYSTEM = `You are ChefSays, a warm friendly AI kitchen buddy for women, moms, and young adults.

CRITICAL: You MUST respond with ONLY a valid JSON object. No text before or after. Pure JSON only.

When food, ingredients, meals, or drinks are mentioned, return EXACTLY:
{"message":"warm 1-2 sentences","recipes":[{"name":"Recipe Name","description":"One sentence about it","homeCost":8.50,"restaurantCost":22.00,"ingredients":[{"name":"Chicken breast","quantity":"1 lb","cost":4.00},{"name":"Rice","quantity":"1 cup","cost":0.50},{"name":"Garlic","quantity":"3 cloves","cost":0.30},{"name":"Olive oil","quantity":"2 tbsp","cost":0.40}],"steps":["Step 1 instruction","Step 2 instruction","Step 3 instruction","Step 4 instruction"],"tip":"One helpful tip"},{"name":"Recipe 2 Name","description":"One sentence","homeCost":6.00,"restaurantCost":16.00,"ingredients":[{"name":"Eggs","quantity":"4 large","cost":1.20},{"name":"Butter","quantity":"2 tbsp","cost":0.40}],"steps":["Step 1","Step 2","Step 3"],"tip":"Tip"},{"name":"Recipe 3 Name","description":"One sentence","homeCost":5.00,"restaurantCost":14.00,"ingredients":[{"name":"Pasta","quantity":"2 cups","cost":1.00},{"name":"Tomato sauce","quantity":"1 cup","cost":1.50}],"steps":["Step 1","Step 2","Step 3"],"tip":"Tip"}]}

Rules:
- homeCost = sum of ingredient costs (realistic grocery prices)
- restaurantCost = what a real restaurant charges for this dish
- Make 3 different recipes - different cuisines and styles
- Always include at least 4 ingredients per recipe with individual costs
- Always include at least 4 clear cooking steps
- Be warm, fun, encouraging
- For greetings only with no food: {"message":"warm response","recipes":[]}
- ONLY JSON. ALWAYS.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 3000,
        messages: [{ role: 'system', content: SYSTEM }, ...messages]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI error:', data.error.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.error.message }) };
    }
    
    const text = data.choices[0].message.content;
    console.log('Response preview:', text.substring(0, 150));
    return { statusCode: 200, headers, body: JSON.stringify({ text: text }) };
    
  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};