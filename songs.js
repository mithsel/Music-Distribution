import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { run, all, get } from '../db.js';

export const songsRouter = express.Router();

songsRouter.get('/', requireAuth, async (req, res) => {
	const songs = await all('SELECT id, title, release_date, streams, revenue, status FROM songs WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
	const analytics = await get('SELECT total_streams, total_revenue, payout_pending FROM analytics WHERE user_id = ?', [req.user.id]);
	return res.json({ plan: req.user.lifetime ? 'lifetime' : req.user.plan, songs, analytics });
});

songsRouter.post('/create',
	requireAuth,
	body('title').isString().notEmpty(),
	body('audioPath').isString().notEmpty(),
	body('coverPath').optional().isString(),
	body('releaseDate').optional().isString(),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

		const user = req.user;

		if (!user.lifetime) {
			if (user.plan === 'free') return res.status(403).json({ error: 'Upgrade required to upload' });
			if (user.plan === 'trial') {
				const count = await get('SELECT COUNT(*) as c FROM songs WHERE user_id = ?', [user.id]);
				if ((count?.c || 0) >= 1) return res.status(403).json({ error: 'Trial upload limit reached (1 song). Upgrade for unlimited.' });
				if (user.trial_started_at && Date.now() - user.trial_started_at > 30 * 24 * 60 * 60 * 1000) {
					await run('UPDATE users SET plan = ? , trial_started_at = NULL WHERE id = ?', ['free', user.id]);
					return res.status(403).json({ error: 'Trial expired. Please upgrade.' });
				}
			}
		}

		const { title, audioPath, coverPath = null, releaseDate = '' } = req.body;

		const streams = Math.floor(Math.random() * 5000);
		const revenue = streams * 0.02;
		const now = Date.now();

		await run(
			`INSERT INTO songs (user_id, title, audio_path, cover_path, release_date, streams, revenue, status, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 'Delivering', ?)`,
			[user.id, title, audioPath, coverPath, releaseDate, streams, revenue, now]
		);

		await run(
			`UPDATE analytics SET total_streams = total_streams + ?, total_revenue = total_revenue + ?, payout_pending = payout_pending + ? WHERE user_id = ?`,
			[streams, revenue, revenue * 0.9, user.id]
		);

		return res.json({ ok: true });
	}
);

