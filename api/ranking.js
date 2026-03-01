const crypto = require('crypto');
const SHEET_ID = '1C-ZzU2SFfrQ5Wv76smw-3qsouT0c5CP9zuIB7DdvzV8';
const SHEET_NAME = '시트1';

function b64u(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

async function getToken(sa) {
  const now = Math.floor(Date.now()/1000);
  const h = b64u(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const p = b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
  const s = crypto.createSign('RSA-SHA256');
  s.update(`${h}.${p}`);
  const sig = s.sign(sa.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${p}.${sig}`});
  return (await r.json()).access_token;
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') return res.status(200).end();
  try {
    const sa = JSON.parse(Buffer.from(process.env.GOOGLE_SA_B64,'base64').toString('utf8'));
    const token = await getToken(sa);
    const hdrs = {Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:G`;

    if (req.method==='POST') {
      const {initials,time,kills,level,version,difficulty} = req.body||{};
      if (!initials) return res.status(400).json({error:'initials required'});
      const date = new Date().toLocaleDateString('ko-KR');
      await fetch(`${baseUrl}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{
        method:'POST',headers:hdrs,
        body:JSON.stringify({values:[[initials,time,kills,level,date,version||'',difficulty||'']]}),
      });
    }

    const d = await (await fetch(baseUrl,{headers:hdrs})).json();
    const ranking = (d.values||[]).slice(1)
      .map(r=>({initials:r[0]||'',time:+r[1]||0,kills:+r[2]||0,level:+r[3]||0,date:r[4]||'',version:r[5]||'',difficulty:r[6]||''}))
      .sort((a,b)=>b.kills-a.kills||b.time-a.time).slice(0,10);
    return res.status(200).json({ranking});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
