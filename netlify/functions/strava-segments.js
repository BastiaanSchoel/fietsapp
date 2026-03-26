const https = require('https');

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, data: JSON.parse(data) }); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  const { token, query } = event.queryStringParameters || {};
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Geen toegangstoken' }) };

  try {
    const result = await httpsGet(
      'https://www.strava.com/api/v3/segments/starred?per_page=50',
      { 'Authorization': `Bearer ${token}` }
    );

    if (!result.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: result.data.message || 'Strava fout' }) };
    }

    let segments = result.data;
    if (query && query.length > 0) {
      const q = query.toLowerCase();
      segments = segments.filter(s => s.name.toLowerCase().includes(q));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segments.slice(0, 20).map(s => ({
        id: s.id,
        name: s.name,
        distance: s.distance ?? 0,
        average_grade: s.average_grade ?? 0,
        total_elevation_gain: s.total_elevation_gain ?? 0,
        city: s.city || '',
        country: s.country || '',
        athlete_pr_effort: s.athlete_pr_effort || null
      })))
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Serverfout: ' + err.message }) };
  }
};
