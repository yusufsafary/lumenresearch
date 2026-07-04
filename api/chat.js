const https = require('https');

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Service not configured' });
    return;
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const payload = JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: parsed.messages || [],
        max_tokens: 500,
        temperature: 0.7
      });
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const apiReq = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', c => data += c);
        apiRes.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.status(apiRes.statusCode).send(data);
        });
      });
      apiReq.on('error', err => res.status(500).json({ error: err.message }));
      apiReq.write(payload);
      apiReq.end();
    } catch(e) {
      res.status(500).json({ error: 'Parse error', detail: e.message });
    }
  });
};
