// Vercel serverless function: ranking proxy via Google Sheets API
const SHEET_ID = '1C-ZzU2SFfrQ5Wv76smw-3qsouT0c5CP9zuIB7DdvzV8';
const SHEET_NAME = '뱀파이어랭킹';

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sigInput = `${header}.${payload}`;

  const crypto = await import('node:crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(sigInput);
  const sig = sign.sign(serviceAccount.private_key, 'base64')
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const token = await getAccessToken(sa);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    // getRanking: read sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:E`;
    const r = await fetch(url, { headers });
    const data = await r.json();
    const rows = (data.values || []).slice(1); // skip header
    const ranking = rows.map(row => ({
      initials: row[0] || '',
      time: Number(row[1]) || 0,
      kills: Number(row[2]) || 0,
      level: Number(row[3]) || 0,
      date: row[4] || '',
    })).sort((a, b) => b.kills - a.kills || b.time - a.time).slice(0, 10);
    return res.status(200).json({ ranking });
  }

  if (req.method === 'POST') {
    const { initials, time, kills, level } = req.body;
    if (!initials) return res.status(400).json({ error: 'initials required' });
    const date = new Date().toLocaleDateString('ko-KR');
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    await fetch(appendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ values: [[initials, time, kills, level, date]] }),
    });
    // Return top 10 after insert
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:E`;
    const r2 = await fetch(readUrl, { headers });
    const data2 = await r2.json();
    const rows2 = (data2.values || []).slice(1);
    const ranking = rows2.map(row => ({
      initials: row[0] || '',
      time: Number(row[1]) || 0,
      kills: Number(row[2]) || 0,
      level: Number(row[3]) || 0,
      date: row[4] || '',
    })).sort((a, b) => b.kills - a.kills || b.time - a.time).slice(0, 10);
    return res.status(200).json({ ok: true, ranking });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
