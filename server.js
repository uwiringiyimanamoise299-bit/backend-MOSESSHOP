const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,        // set this on Render dashboard if needed
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Frontend static files (only when dist exists — skipped on Render API deploys) ──
const frontendDist = path.join(__dirname, '..', 'MOSES', 'dist');
const hasFrontend = fs.existsSync(frontendDist);

if (hasFrontend) {
  app.use(express.static(frontendDist));
  console.log('Serving frontend from:', frontendDist);
} else {
  console.log('No frontend dist found — running in API-only mode');
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Montana shop API is running' });
});

// ── Catch-all: serve index.html (full-stack) or return JSON 404 (API-only) ───
app.get('*', (req, res) => {
  if (hasFrontend) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  } else {
    res.status(404).json({ error: 'Route not found. API is running in API-only mode.' });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

require('./config/initDb')().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err.message);
  // Start server anyway so health check passes on Render
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT} (DB init failed)`);
  });
});
