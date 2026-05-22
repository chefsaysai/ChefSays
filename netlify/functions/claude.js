const https = require('https');

exports.handler = async function(event) {
  const body = JSON.parse(event.body);
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' },
          body: responseData
        });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};
