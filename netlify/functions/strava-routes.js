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

    if (!res.ok) {
      const err = await res.json();
      return { statusCode: 400, body: JSON.stringify({ error: err.message || 'Fout' }) };
    }

    // Get raw text to avoid JS precision loss on large 64-bit IDs
    const rawText = await res.text();

    // Replace all large numeric IDs with quoted strings before parsing
    // Match "id": 1234567890123456789 and wrap in quotes
    const safeText = rawText.replace(/"id"\s*:\s*(\d{10,})/g, '"id": "$1"');

    const data = JSON.parse(safeText);

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
