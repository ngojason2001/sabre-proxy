const https = require('https');
const http = require('http');
const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (!req.url.startsWith('/sabre/')) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'Royal Way Travel Sabre Proxy OK'}));
    return;
  }

  const sabrePath = req.url.replace('/sabre', '');
  const sabreHost = sabrePath.startsWith('/prod/') ? 'api.sabre.com' : 'api.test.sabre.com';
  const cleanPath = sabrePath.replace('/prod', '').replace('/test', '');

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const opts = {
      hostname: sabreHost,
      path: cleanPath,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        'Authorization': req.headers['authorization'] || '',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const proxy = https.request(opts, sabreRes => {
      res.writeHead(sabreRes.statusCode, {
        'Content-Type': sabreRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      sabreRes.pipe(res);
    });

    proxy.on('error', err => {
      res.writeHead(502, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: err.message}));
    });

    if (body) proxy.write(body);
    proxy.end();
  });
});

server.listen(PORT, () => console.log('Sabre proxy running on port', PORT));
