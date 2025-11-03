import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { run } from '../db.js';

export const billingRouter = express.Router();

const hasKeys = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
const razorpay = hasKeys ? new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET
}) : null;

billingRouter.post('/create-lifetime-order', requireAuth, async (_req, res) => {
	const amount = 59900;
	if (!razorpay) {
		return res.json({ mock: true, amount, currency: 'INR', id: 'order_mock_' + Date.now() });
	}
	const order = await razorpay.orders.create({ amount, currency: 'INR' });
	return res.json(order);
});

billingRouter.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
	try {
		if (!razorpay) return res.status(200).send('ok');
		const signature = req.headers['x-razorpay-signature'];
		const body = JSON.stringify(req.body);
		const secret = process.env.RAZORPAY_KEY_SECRET;
		const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
		if (signature !== expected) return res.status(400).send('Invalid signature');
		return res.status(200).send('ok');
	} catch {
		return res.status(200).send('ok');
	}
});

billingRouter.post('/confirm-lifetime', requireAuth, async (req, res) => {
	const { order_id, payment_id, amount } = req.body || {};
	if (razorpay && (!order_id || !payment_id)) return res.status(400).json({ error: 'Invalid payment confirmation' });

	await run(`INSERT INTO payments (user_id, type, amount, provider, provider_order_id, provider_payment_id, status, created_at)
		VALUES (?, 'lifetime', ?, ?, ?, ?, 'paid', ?)`,
		[req.user.id, amount || 59900, razorpay ? 'razorpay' : 'mock', order_id || '', payment_id || '', Date.now()]
	);
	await run(`UPDATE users SET lifetime = 1, plan = 'lifetime' WHERE id = ?`, [req.user.id]);

	return res.json({ ok: true });
});

