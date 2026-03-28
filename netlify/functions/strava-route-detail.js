exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};
  if (!token || !id) return { statusCode: 400, body: JSON.stringify({ error: 'Token of ID ontbreekt' }) };

  try {
    // Strava route detail endpoint
    const res = await fetch(
      `https://www.strava.com/api/v3/routes/${id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { statusCode: res.status, body: JSON.stringify({ error: err.message || `Route niet gevonden (${res.status})` }) };
    }

    const route = await res.json();

    // Strava routes API returns segments in route.segments
    // But this requires routes:read scope - try segment_efforts instead
    const segments = (route.segments || []).map(s => ({
      id: s.id,
      name: s.name,
      distance: s.distance,
      average_grade: s.average_grade,
      maximum_grade: s.maximum_grade || 0,
      total_elevation_gain: s.total_elevation_gain || 0,
      city: s.city || '',
      athlete_pr_effort: s.athlete_pr_effort || null,
      xoms: s.xoms || null
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: route.id,
        name: route.name,
        distance: route.distance,
        elevation_gain: route.elevation_gain,
        segments
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
