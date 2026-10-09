const GROQ_MODELS = [
  'groq/compound',
  'openai/gpt-oss-20b',
  'llama3-70b-8192',
  'qwen/qwen3.8-27b'
];

const json = (res, status, payload) => {
  res.status(status).json(payload);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured.');
    return json(res, 503, { error: 'AI service is not configured.' });
  }

  const { task, messages, responseFormat } = req.body || {};
  if (task !== 'chat' && task !== 'quiz') {
    return json(res, 400, { error: 'Invalid AI task.' });
  }

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 22 ||
    messages.some(
      (message) =>
        !message ||
        !['system', 'user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' ||
        message.content.length > 8000
    ) ||
    messages.reduce((total, message) => total + message.content.length, 0) > 20000
  ) {
    return json(res, 400, { error: 'Invalid AI messages.' });
  }

  const requestOptions = task === 'quiz'
    ? { response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 350 }
    : { temperature: 0.6, max_tokens: 300 };

  if (task === 'quiz' && responseFormat !== 'json') {
    return json(res, 400, { error: 'Invalid quiz response format.' });
  }

  for (const model of GROQ_MODELS) {
    try {
      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages, ...requestOptions })
      });

      if (!upstream.ok) {
        console.warn(`Groq request using ${model} returned status ${upstream.status}.`);
        continue;
      }

      const data = await upstream.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.length > 0) {
        return json(res, 200, { content });
      }

      console.warn(`Groq request using ${model} returned no message content.`);
    } catch (error) {
      console.error(`Groq request using ${model} failed:`, error);
    }
  }

  return json(res, 502, { error: 'The AI service is temporarily unavailable.' });
}
