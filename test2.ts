import https from 'https';

// We get 401 when unauthenticated. Let's send a fake 404 request to steadfast using fetch and a valid formatted auth (but wrong token) just to see what happens.
// Wait, we can't fetch with user keys without user keys. It's fine.
