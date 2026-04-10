const crypto = require('crypto');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const cloudName = process.env.CLOUDINARY_NAME;
  const apiKey = process.env.CLOUDINARY_API;
  const apiSecret = process.env.CLOUDINARY_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary config not set on server' });
  }

  // GET = return cloud name + api key (public info for widget)
  if (req.method === 'GET') {
    return res.status(200).json({ cloudName, apiKey });
  }

  // POST = generate signature for signed upload
  if (req.method === 'POST') {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'notes';

    // Parameters to sign (must be alphabetically sorted)
    const paramsToSign = {
      folder,
      timestamp,
    };

    // Build the string to sign: key=value&key=value... + apiSecret
    const sortedKeys = Object.keys(paramsToSign).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&') + apiSecret;

    const signature = crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('hex');

    return res.status(200).json({
      signature,
      timestamp,
      folder,
      apiKey,
      cloudName,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
