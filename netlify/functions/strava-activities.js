exports.handler = async (event) => {
  const { token, page, after, before } = event.queryStringParameters || {};
  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'Token ontbreekt' }) };

  try {
    let url = `https://www.strava.com/api/v3/athlete/activities?per_page=30&page=${page||1}`;
    if (after) url += `&after=${after}`;
    if (before) url += `&before=${before}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: data.message || 'Fout' }) };

    const activities = data.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      distance: a.distance,
      moving_time: a.moving_time,
      start_date: a.start_date_local,
      gear_id: a.gear_id,
      gear_name: a.gear ? a.gear.name : null,
      total_elevation_gain: a.total_elevation_gain
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activities)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
