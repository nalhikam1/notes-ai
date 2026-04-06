module.exports = async function handler(req, res) {
  // CORS headers agar bisa dipanggil dari browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { provider, apiKey, model, messages, system } = req.body;
  if (!provider || !apiKey || !model || !messages) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let url, body, headers = { 'Content-Type': 'application/json' };

  try {
    if (provider === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = { model, max_tokens: 2048, system, messages };

    } else if (provider === 'google') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const contents = [
        { role: 'user', parts: [{ text: system + '\n\nPahami instruksi ini.' }] },
        { role: 'model', parts: [{ text: 'Siap membantu.' }] },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      ];
      body = { contents, generationConfig: { maxOutputTokens: 2048 } };

    } else if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = { model, max_tokens: 2048, messages: [{ role: 'system', content: system }, ...messages] };

    } else if (provider === 'nvidia') {
      url = 'https://integrate.api.nvidia.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = { model, max_tokens: 2048, messages: [{ role: 'system', content: system }, ...messages] };

    } else {
      return res.status(400).json({ error: 'Unknown provider: ' + provider });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    // Ekstrak teks dari response sesuai provider
    let text;
    if (provider === 'anthropic') text = data.content[0].text;
    else if (provider === 'google') text = data.candidates[0].content.parts[0].text;
    else text = data.choices[0].message.content;

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
