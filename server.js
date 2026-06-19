require('dotenv').config();
var express = require('express');
var { createProxyMiddleware } = require('http-proxy-middleware');
var app = express();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/', function(req, res) {
  res.json({ status: 'ChefSays running' });
});

// Proxy requests to Netlify Functions running locally
const functionsProxy = createProxyMiddleware({
  target: 'http://localhost:8888', // Default port for `netlify dev`
  changeOrigin: true,
  pathRewrite: {
    '^/': '/.netlify/functions/', // Rewrite /chat to /.netlify/functions/chat
  },
});

app.use(['/chat', '/save-conversation', '/create-checkout', '/stripe-webhook', '/claude', '/get-prices'], functionsProxy);

var PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', function() {
  console.log('ChefSays on port ' + PORT);
});
