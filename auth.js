const Auth = {
	async signUp({ email, password, plan }) {
		await API.signUp({ email, password, plan });
		return true;
	},
	async signIn({ email, password }) {
		await API.signIn({ email, password });
		return true;
	},
	signOut() {
		sessionStorage.removeItem('token');
	},
	requireAuth() {
		const token = sessionStorage.getItem('token');
		if (!token) {
			window.location.href = 'signup.html';
			throw new Error('Not signed in');
		}
		return { token, email: '' };
	}
};

window.Auth = Auth;

