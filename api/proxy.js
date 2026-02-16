
export default async function handler(req, res) {
  // Get the path from the URL, removing the leading /api/
  const targetPath = req.url.split('?')[0].replace(/^\/api\//, '');
  const targetUrl = `https://ail.buyhatke.com/${targetPath}`;

  console.log(`Proxying ${req.method} request to: ${targetUrl}`);

  // Construct headers, removing host to let fetch handle it
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  
  // Set a clean User-Agent and Origin to look like a browser
  headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  headers['Origin'] = 'https://ail.buyhatke.com';
  headers['Referer'] = 'https://ail.buyhatke.com/';

  try {
    const options = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    
    // Get the response body
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      res.status(response.status).json(data);
    } else {
      data = await response.text();
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request', details: error.message });
  }
}
