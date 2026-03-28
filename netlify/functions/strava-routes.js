exports.handler = async (event) => {
  const { token, athlete_id } = event.queryStringParameters || {};
  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'Token ontbreekt' }) };

  try {
    let aid = athlete_id;
    if (!aid) {
      const aRes = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const a = await aRes.json();
      aid = a.id;
    }

    const res = await fetch(
      `https://www.strava.com/api/v3/athletes/${aid}/routes?per_page=30`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: data.message || 'Fout' }) };

    const routes = data.map(r => ({
      id: String(r.id),
      name: r.name,
      distance: r.distance,
      elevation_gain: r.elevation_gain,
      type: r.type,
      created_at: r.created_at,
      description: r.description || ''
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routes)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
