import sqlite3 from 'sqlite3';
import path from 'path';

const dbFile = path.resolve('data.sqlite');
const sqlite = new sqlite3.Database(dbFile);

export const db = {
	init() {
		sqlite.serialize(() => {
			sqlite.run(`CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				email TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				plan TEXT NOT NULL DEFAULT 'free',
				trial_started_at INTEGER,
				lifetime INTEGER NOT NULL DEFAULT 0,
				payout_method TEXT DEFAULT ''
			)`);

			sqlite.run(`CREATE TABLE IF NOT EXISTS songs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				title TEXT NOT NULL,
				audio_path TEXT NOT NULL,
				cover_path TEXT,
				release_date TEXT,
				streams INTEGER NOT NULL DEFAULT 0,
				revenue REAL NOT NULL DEFAULT 0,
				status TEXT NOT NULL DEFAULT 'Delivering',
				created_at INTEGER NOT NULL,
				FOREIGN KEY(user_id) REFERENCES users(id)
			)`);

			sqlite.run(`CREATE TABLE IF NOT EXISTS payments (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				type TEXT NOT NULL,
				amount INTEGER NOT NULL,
				provider TEXT NOT NULL,
				provider_order_id TEXT,
				provider_payment_id TEXT,
				status TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				FOREIGN KEY(user_id) REFERENCES users(id)
			)`);

			sqlite.run(`CREATE TABLE IF NOT EXISTS analytics (
				user_id INTEGER PRIMARY KEY,
				total_streams INTEGER NOT NULL DEFAULT 0,
				total_revenue REAL NOT NULL DEFAULT 0,
				payout_pending REAL NOT NULL DEFAULT 0,
				FOREIGN KEY(user_id) REFERENCES users(id)
			)`);
		});
	},
	conn: sqlite
};

export function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.conn.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve(this);
		});
	});
}
export function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.conn.get(sql, params, (err, row) => {
			if (err) return reject(err);
			resolve(row);
		});
	});
}
export function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.conn.all(sql, params, (err, rows) => {
			if (err) return reject(err);
			resolve(rows);
		});
	});
}

