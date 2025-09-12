// server/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Routes
import resumeRoutes from './routes/resumeRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviewRoutes.js';

// Optional services
import { verifyEmailTransport } from './services/emailService.js';

// Optional: DB sanity debug at boot (helps catch wrong DATABASE_URL)
try {
  if (process.env.DATABASE_URL) {
    const { URL } = await import('node:url');
    const host = new URL(process.env.DATABASE_URL).host;
    console.log('DB DEBUG | client=pg host=%s node=%s', host, process.version);
  } else if (process.env.DATABASE_URL_DEV) {
    const { URL } = await import('node:url');
    const host = new URL(process.env.DATABASE_URL_DEV).host;
    console.log('DB DEBUG | (dev) client=pg host=%s node=%s', host, process.version);
  } else {
    console.log('DB DEBUG | no DATABASE_URL* set');
  }
} catch (e) {
  console.warn('DB DEBUG | failed to parse DB URL:', e?.message || e);
}

const app = express();

/* ------------------------------ Core middleware ----------------------------- */
app.disable('x-powered-by');

// Body parsers
const JSON_LIMIT = process.env.JSON_LIMIT || '2mb';
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));

// CORS — allow multiple origins via env (comma-separated)
const allowlist = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, cb) {
    // Allow non-browser tools (curl/postman) and same-origin
    if (!origin) return cb(null, true);
    if (allowlist.length === 0) return cb(null, true); // permissive if not configured
    if (allowlist.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  maxAge: 600,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* --------------------------------- Healthcheck ------------------------------ */
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  });
});

/* ----------------------------------- Routes -------------------------------- */
/* ----------------------------------- Routes -------------------------------- */
console.log('DEBUG: About to mount /api/resumes. The resumeRoutes object is:', resumeRoutes);
app.use('/api/resumes', resumeRoutes);
console.log('DEBUG: Successfully mounted /api/resumes routes.');

app.use('/api/applications', applicationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

/* ----------------------- Optional: email transport check -------------------- */
(async () => {
  try {
    if (typeof verifyEmailTransport === 'function') {
      await verifyEmailTransport();
      console.log('EMAIL DEBUG | transport verified');
    }
  } catch (e) {
    console.warn('EMAIL DEBUG | transport verification failed:', e?.message || e);
  }
})();

/* --------------------------------- 404 & errors ----------------------------- */
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err?.stack || err?.message || err);
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('cors')) {
    return res.status(403).json({ success: false, message: 'CORS: Origin not allowed' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err?.message || 'Internal server error',
  });
});

export default app;