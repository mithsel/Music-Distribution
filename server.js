import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { db } from './src/db.js';
import { authRouter } from './src/routes/auth.js';
import { billingRouter } from './src/routes/billing.js';
import { uploadsRouter } from './src/routes/uploads.js';
import { songsRouter } from './src/routes/songs.js';
import { payoutsRouter } from './src/routes/payouts.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 500 });
app.use(limiter);

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/payouts', payoutsRouter);

const frontendDir = path.resolve(process.cwd(), '../');
app.use(express.static(frontendDir));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
	console.log(`IndieWave API listening on http://localhost:${PORT}`);
	db.init();
});

