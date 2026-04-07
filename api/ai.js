module.exports = async function handler(req, res) {
  // CORS headers agar bisa dipanggil dari browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Kini hanya fokus pada param penting untuk NVIDIA
  const { apiKey, model, messages, system } = req.body;
  if (!apiKey || !model || !messages) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
    const body = { 
      model, 
      max_tokens: 2048, 
      messages: [{ role: 'system', content: system }, ...messages] 
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    // Ekstrak teks bentuk OpenAI-style milik NVIDIA
    const text = data.choices[0].message.content;
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
