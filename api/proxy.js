export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // Get the path after /api/
  const targetPath = url.pathname.replace(/^\/api\//, '');
  const targetUrl = `https://ail.buyhatke.com/${targetPath}${url.search}`;

  console.log(`Edge Proxying to: ${targetUrl}`);

  // Create a clean Headers object to strip Vercel-specific ones
  const headers = new Headers();
  
  // Pass through standard safe headers
  const allowedHeaders = ['accept', 'accept-language', 'content-type', 'authorization'];
  req.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Set a clean browser-like identity
  headers.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  headers.set('Accept', '*/*');
  headers.set('Origin', 'https://ail.buyhatke.com');
  headers.set('Referer', 'https://ail.buyhatke.com/');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    // Return the response exactly as is, but with CORS headers added manually
    // in case the target server doesn't provide them
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Edge Proxy Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
