module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Get API key from environment variable
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NVIDIA API key not configured on server' });
  }

  const { model, messages, system } = req.body;
  if (!model || !messages) {
    return res.status(400).json({ error: 'Missing required fields: model, messages' });
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

    // Extract text from NVIDIA response (OpenAI-compatible format)
    const text = data.choices[0].message.content;
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
