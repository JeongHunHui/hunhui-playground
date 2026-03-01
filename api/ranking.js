// Vercel serverless function: ranking via Google Sheets API
const crypto = require('crypto');

const SHEET_ID = '1C-ZzU2SFfrQ5Wv76smw-3qsouT0c5CP9zuIB7DdvzV8';
const SHEET_NAME = '뱀파이어랭킹';

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sigInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(sigInput);
  const sig = sign.sign(sa.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const jwt = `${sigInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const token = await getAccessToken(sa);
    const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:E`;

    if (req.method === 'POST') {
      const { initials, time, kills, level } = req.body;
      if (!initials) return res.status(400).json({ error: 'initials required' });
      const date = new Date().toLocaleDateString('ko-KR');
      await fetch(`${readUrl}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ values: [[initials, time, kills, level, date]] }),
      });
    }

    const r = await fetch(readUrl, { headers: authHeader });
    const data = await r.json();
    const rows = (data.values || []).slice(1);
    const ranking = rows
      .map(row => ({ initials: row[0]||'', time: Number(row[1])||0, kills: Number(row[2])||0, level: Number(row[3])||0, date: row[4]||'' }))
      .sort((a, b) => b.kills - a.kills || b.time - a.time)
      .slice(0, 10);
    return res.status(200).json({ ranking });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
