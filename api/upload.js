const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { file, filename } = req.body || {};
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const CLOUD_NAME = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const API_KEY = process.env.CLOUDINARY_API || process.env.CLOUDINARY_API_KEY;
    const API_SECRET = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      res.status(500).json({ error: 'Cloudinary env vars missing on server' });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(toSign + API_SECRET).digest('hex');

    // Folder where images will be stored (Cloudinary folder)
    const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'notes';

    // Use global FormData + fetch (Node 18+ / Vercel environment)
    const formData = new FormData();
    // Cloudinary accepts data URLs as file content
    formData.append('file', file);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', UPLOAD_FOLDER);

    const cloudUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
    const cloudRes = await fetch(cloudUrl, { method: 'POST', body: formData });
    const data = await cloudRes.json();
    if (!cloudRes.ok) {
      res.status(cloudRes.status || 500).json(data || { error: 'Upload failed' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('upload api error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
