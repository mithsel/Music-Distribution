import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { run, get } from '../db.js';

export const payoutsRouter = express.Router();

payoutsRouter.post('/method',
	requireAuth,
	body('method').isString().notEmpty(),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		await run('UPDATE users SET payout_method = ? WHERE id = ?', [req.body.method, req.user.id]);
		return res.json({ ok: true });
	}
);

payoutsRouter.post('/request', requireAuth, async (req, res) => {
	const a = await get('SELECT payout_pending FROM analytics WHERE user_id = ?', [req.user.id]);
	const amount = a?.payout_pending || 0;
	if (amount <= 0) return res.status(400).json({ error: 'Nothing to payout' });
	await run('UPDATE analytics SET payout_pending = 0 WHERE user_id = ?', [req.user.id]);
	return res.json({ amount });
});

