// Using native global fetch available in Node.js 18+

async function summarizeMeeting(transcript) {
  if (!transcript) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role:    'user',
        content: `Summarize this meeting transcript into:
1. A 1-sentence overview
2. Key decisions made (bullet points)
3. Action items with owners if mentioned

Transcript:
${transcript.slice(0, 8000)}`,
      }],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || null;
}

module.exports = { summarizeMeeting };