export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // Strip /api prefix: /api/v1/models → /v1/models
  const targetPath = url.pathname.replace(/^\/api\//, '/');
  const targetUrl = `https://ail.buyhatke.com${targetPath}${url.search}`;

  console.log(`Edge Proxying to: ${targetUrl}`);

  // Create a clean Headers object to strip Vercel-specific ones
  const headers = new Headers();

  // Pass through standard safe headers
  const allowedHeaders = ['accept', 'accept-language', 'content-type', 'authorization', 'x-api-key'];
  req.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });


  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await req.arrayBuffer()
        : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Proxy error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
