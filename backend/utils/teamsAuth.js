const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;
let cachedAppToken = null;
let appTokenExpiry = null;

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id:     process.env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  process.env.AZURE_REDIRECT_URI,
    scope:         'https://graph.microsoft.com/OnlineMeetings.Read.All https://graph.microsoft.com/CallRecords.Read.All https://graph.microsoft.com/CallRecordings.Read.All https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access',
    response_mode: 'query'
  });

  return `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

async function exchangeCodeForToken(code) {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      redirect_uri:  process.env.AZURE_REDIRECT_URI,
      code
    })
  );

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in * 1000);
  return cachedToken;
}

/**
 * Get Application-level access token (Client Credentials flow)
 */
async function getApplicationToken() {
  if (cachedAppToken && Date.now() < appTokenExpiry) {
    return cachedAppToken;
  }

  console.log('[auth] Fetching fresh Application Token...');
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope:         'https://graph.microsoft.com/.default'
    })
  );

  cachedAppToken = res.data.access_token;
  appTokenExpiry = Date.now() + (res.data.expires_in * 1000);
  return cachedAppToken;
}

/**
 * Get available token, prioritizing User then Application
 */
async function getToken(forceAppToken = false) {
  if (forceAppToken) return await getApplicationToken();

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Fallback to Application Token if user not authenticated
  try {
    return await getApplicationToken();
  } catch (err) {
    throw new Error('NOT_AUTHENTICATED — Please connect Microsoft Teams or check App Credentials');
  }
}

function isAuthenticated() {
  const userAuth = !!cachedToken && Date.now() < tokenExpiry;
  const appAuth  = !!cachedAppToken && Date.now() < appTokenExpiry;
  return userAuth || appAuth;
}

module.exports = { getAuthUrl, exchangeCodeForToken, getToken, isAuthenticated, getApplicationToken };