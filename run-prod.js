import express from 'express';
import path from 'path';

const app = express();
const distPath = path.join(process.cwd(), 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(3002, () => {
  console.log('Test server running on port 3002');
});
