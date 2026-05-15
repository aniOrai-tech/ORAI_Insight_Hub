// routes/ai.js — Proxy for Claude API calls from the AI Agent (Aura)
const express = require('express');
const router  = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-...' || apiKey.length < 20) {
      return res.status(500).json({
        error: { message: 'ANTHROPIC_API_KEY is not configured. Please set it in backend/.env' }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Claude API Error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error('AI Chat route error:', err.message);
    res.status(500).json({
      error: { message: 'Internal server error while contacting AI service: ' + err.message }
    });
  }
});

module.exports = router;