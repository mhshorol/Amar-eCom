import https from 'https';

https.get('https://portal.packzy.com/api/v1/status_by_invoice/123456', (res) => {
  console.log('status_by_invoice:', res.statusCode);
});

https.get('https://portal.packzy.com/api/v1/status_by_tracking/123456', (res) => {
  console.log('status_by_tracking:', res.statusCode);
});
