import jwt from 'jsonwebtoken';
import { get } from '../db.js';

export function signToken(payload) {
	return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
}

export async function requireAuth(req, res, next) {
	try {
		const auth = req.headers.authorization || '';
		const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
		if (!token) return res.status(401).json({ error: 'Missing token' });
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
		const user = await get('SELECT id, email, plan, lifetime, trial_started_at, payout_method FROM users WHERE id = ?', [decoded.uid]);
		if (!user) return res.status(401).json({ error: 'Invalid token' });
		req.user = user;
		next();
	} catch (e) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
}

