module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  let context = { pct: 0, used: '?', total: '?' };
  let openclaw = { gateway: 'unknown', agents: '-', model: 'claude-sonnet-4', session: 'main' };
  let crons = [];
  let usage5h = { pct: 0, used: '?', limit: '?' };
  let usageWeek = { pct: 0, used: '?', limit: '?' };

  try {
    const gwBase = 'http://127.0.0.1:18789';
    const token = process.env.OPENCLAW_GW_TOKEN || '';
    const headers = token ? { Authorization: 'Bearer ' + token } : {};

    // Sessions
    const sessR = await fetch(gwBase + '/api/sessions', { headers }).catch(() => null);
    if (sessR?.ok) {
      const data = await sessR.json();
      const sessions = Array.isArray(data) ? data : (data.sessions || []);
      openclaw.agents = sessions.length + ' sessions';
      openclaw.gateway = 'connected';
      const main = sessions.find(s => (s.key||'').includes('main') && !(s.key||'').includes('subagent'));
      if (main?.context) {
        const u = main.context.used || 0, t = main.context.total || 200000;
        context = { pct: Math.round(u/t*100), used: Math.round(u/1000)+'k', total: Math.round(t/1000)+'k' };
      }
      if (main?.model) openclaw.model = main.model;
    }

    // Crons
    const cronR = await fetch(gwBase + '/api/crons', { headers }).catch(() => null);
    if (cronR?.ok) {
      const data = await cronR.json();
      const jobs = Array.isArray(data) ? data : (data.jobs || []);
      crons = jobs.map(j => ({
        name: j.name || j.id,
        enabled: j.enabled !== false,
        next: j.state?.nextRunAtMs
          ? new Date(j.state.nextRunAtMs).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'})
          : '-'
      }));
    }
  } catch(e) {
    openclaw.gateway = 'error';
  }

  return res.status(200).json({ context, openclaw, crons, usage5h, usageWeek, subagents: [], ts: Date.now() });
};
