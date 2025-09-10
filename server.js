// server/server.js
import app from './server/app.js';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
