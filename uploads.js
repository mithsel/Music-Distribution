import express from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || '');
		const name = Date.now() + '_' + Math.random().toString(36).slice(2) + ext;
		cb(null, name);
	}
});
const fileFilter = (_req, file, cb) => {
	if (file.fieldname === 'audio' && !file.mimetype.startsWith('audio/')) return cb(new Error('Invalid audio type'));
	if (file.fieldname === 'cover' && !file.mimetype.startsWith('image/')) return cb(new Error('Invalid image type'));
	cb(null, true);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

export const uploadsRouter = express.Router();

uploadsRouter.post('/track', requireAuth, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
	try {
		const audio = req.files?.audio?.[0];
		if (!audio) return res.status(400).json({ error: 'Audio required' });
		const cover = req.files?.cover?.[0] || null;
		return res.json({ audioPath: audio.filename, coverPath: cover ? cover.filename : null });
	} catch (e) {
		return res.status(400).json({ error: e.message || 'Upload failed' });
	}
});

uploadsRouter.use('/files', express.static(uploadDir));

