fetch("http://localhost:3000/api/woocommerce/orders?per_page=50")
  .then(res => {
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    return res.text();
  })
  .then(text => console.log("Body:", text.slice(0, 100)))
  .catch(console.error);
