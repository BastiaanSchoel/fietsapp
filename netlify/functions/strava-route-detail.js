exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};
  if (!token || !id) return { statusCode: 400, body: JSON.stringify({ error: 'Token of ID ontbreekt' }) };

  try {
    // Get route detail - includes segments on the route
    const res = await fetch(
      `https://www.strava.com/api/v3/routes/${id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const route = await res.json();
    if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: route.message || 'Route niet gevonden' }) };

    // Extract segments from route
    const segments = (route.segments || []).map(s => ({
      id: s.id,
      name: s.name,
      distance: s.distance,
      average_grade: s.average_grade,
      maximum_grade: s.maximum_grade,
      total_elevation_gain: s.total_elevation_gain,
      city: s.city,
      athlete_pr_effort: s.athlete_pr_effort || null
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
