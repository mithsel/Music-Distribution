const API_BASE = 'http://localhost:8080/api';
let TOKEN = sessionStorage.getItem('token') || '';

function authHeaders() {
	return TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {};
}

const API = {
	async signUp({ email, password, plan }) {
		const res = await fetch(`${API_BASE}/auth/signup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, plan })
		});
		if (!res.ok) throw new Error((await res.json()).error || 'Signup failed');
		const data = await res.json();
		TOKEN = data.token;
		sessionStorage.setItem('token', TOKEN);
	},

	async signIn({ email, password }) {
		const res = await fetch(`${API_BASE}/auth/signin`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
		if (!res.ok) throw new Error((await res.json()).error || 'Signin failed');
		const data = await res.json();
		TOKEN = data.token;
		sessionStorage.setItem('token', TOKEN);
	},

	async getDashboard() {
		const res = await fetch(`${API_BASE}/songs`, { headers: { ...authHeaders() } });
		if (!res.ok) throw new Error('Failed to load dashboard');
		return res.json();
	},

	async uploadSong({ title, audio, cover, releaseDate }) {
		const fd = new FormData();
		if (audio) fd.append('audio', audio);
		if (cover) fd.append('cover', cover);
		const up = await fetch(`${API_BASE}/uploads/track`, { method: 'POST', headers: { ...authHeaders() }, body: fd });
		if (!up.ok) throw new Error((await up.json()).error || 'Upload failed');
		const files = await up.json();

		const res = await fetch(`${API_BASE}/songs/create`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: JSON.stringify({ title, audioPath: files.audioPath, coverPath: files.coverPath, releaseDate })
		});
		if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
		return res.json();
	},

	async upgradeToLifetime() {
		const o = await fetch(`${API_BASE}/billing/create-lifetime-order`, { method: 'POST', headers: { ...authHeaders() } });
		const order = await o.json();

		if (!order.mock) {
			return new Promise((resolve, reject) => {
				const options = {
					key: '',
					amount: order.amount,
					currency: order.currency,
					name: 'IndieWave Lifetime',
					description: 'Unlimited distribution',
					order_id: order.id,
					handler: async function (resp) {
						const confirm = await fetch(`${API_BASE}/billing/confirm-lifetime`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', ...authHeaders() },
							body: JSON.stringify({ order_id: resp.razorpay_order_id, payment_id: resp.razorpay_payment_id, signature: resp.razorpay_signature, amount: order.amount })
						});
						if (!confirm.ok) return reject(new Error('Confirm failed'));
						resolve(true);
					},
					theme: { color: '#6ea8fe' }
				};
				if (!window.Razorpay) return reject(new Error('Razorpay SDK not loaded'));
				const rz = new window.Razorpay(options);
				rz.on('payment.failed', () => reject(new Error('Payment failed')));
				rz.open();
			});
		} else {
			const confirm = await fetch(`${API_BASE}/billing/confirm-lifetime`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...authHeaders() },
				body: JSON.stringify({ order_id: order.id, payment_id: 'mock_pay_' + Date.now(), amount: order.amount })
			});
			if (!confirm.ok) throw new Error('Upgrade failed');
			return true;
		}
	},

	async savePayoutMethod(method) {
		const res = await fetch(`${API_BASE}/payouts/method`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: JSON.stringify({ method })
		});
		if (!res.ok) throw new Error('Save failed');
		return res.json();
	},

	async requestPayout() {
		const res = await fetch(`${API_BASE}/payouts/request`, { method: 'POST', headers: { ...authHeaders() } });
		if (!res.ok) throw new Error((await res.json()).error || 'Payout failed');
		return res.json();
	}
};

window.API = API;

