export async function requestGroq(task, messages, responseFormat) {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, messages, responseFormat })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'AI request failed.');
  }

  if (typeof data.content !== 'string' || data.content.length === 0) {
    throw new Error('AI service returned an invalid response.');
  }

  return data.content;
}
