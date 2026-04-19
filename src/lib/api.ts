export async function fetchJson(url: string, options: RequestInit = {}) {
  // Ensure we accept JSON, which might help proxies avoid sending HTML challenges
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  const response = await fetch(url, { ...options, headers });
  
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    return response.json();
  } else {
    const text = await response.text();
    // If we receive an HTML response (e.g. from a proxy Cookie check or SPA fallback)
    if (text.trim().startsWith('<')) {
      console.warn(`[API] Received HTML instead of JSON from ${url}. Proxy or auth wall might be active.`);
      throw new Error(`Invalid response from server. Please reload the page to refresh your session.`);
    }
    throw new Error(`Unexpected non-JSON response from server.`);
  }
}
