const crypto = require('crypto');
const SHEET_ID = '1C-ZzU2SFfrQ5Wv76smw-3qsouT0c5CP9zuIB7DdvzV8';
const BALANCE_SHEET = '밸런스설정';

function b64u(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function getToken(sa) {
  const now = Math.floor(Date.now()/1000);
  const h = b64u(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const p = b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
  const s = crypto.createSign('RSA-SHA256'); s.update(`${h}.${p}`);
  const sig = s.sign(sa.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${p}.${sig}`});
  return (await r.json()).access_token;
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=60'); // 1분 캐시
  try {
    const sa = JSON.parse(Buffer.from(process.env.GOOGLE_SA_B64,'base64').toString('utf8'));
    const token = await getToken(sa);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(BALANCE_SHEET)}!A:C`;
    const d = await (await fetch(url,{headers:{Authorization:`Bearer ${token}`}})).json();
    const rows = (d.values||[]).slice(1); // skip header
    const config = {};
    for(const row of rows) {
      if(row[0] && row[1] !== undefined) {
        const val = isNaN(row[1]) ? row[1] : Number(row[1]);
        config[row[0]] = val;
      }
    }
    return res.status(200).json(config);
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
};
