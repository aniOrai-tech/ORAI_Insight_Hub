const express = require('express');
const router  = express.Router();
const { getAuthUrl, exchangeCodeForToken, isAuthenticated } = require('../utils/teamsAuth');

// Step 1 — admin visits this to connect Teams
router.get('/login', (req, res) => {
  res.redirect(getAuthUrl());
});

// Step 2 — Microsoft redirects back here with code
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.send(`❌ Auth error: ${error}`);

    await exchangeCodeForToken(code);
    res.send(`
      <h2>✅ Microsoft Teams connected!</h2>
      <p>You can close this tab. Sync features are now active.</p>
    `);
  } catch (err) {
    res.status(500).send(`❌ Failed: ${err.message}`);
  }
});

// Check connection status
router.get('/status', (req, res) => {
  res.json({
    authenticated: isAuthenticated(),
    message: isAuthenticated()
      ? '✅ Connected to Microsoft Teams'
      : '❌ Not connected — visit /teams-auth/login'
  });
});

module.exports = router;