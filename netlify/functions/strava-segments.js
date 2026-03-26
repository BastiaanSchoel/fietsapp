exports.handler = async (event) => {
  const { token, query } = event.queryStringParameters || {};

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Geen toegangstoken' })
    };
  }

  try {
    const res = await fetch('https://www.strava.com/api/v3/segments/starred?per_page=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.message || 'Strava fout' })
      };
    }

    let segments = data;
    if (query && query.length > 0) {
      const q = query.toLowerCase();
      segments = data.filter(s => s.name.toLowerCase().includes(q));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segments.slice(0, 20).map(s => ({
        id: s.id,
        name: s.name,
        distance: s.distance,
        average_grade: s.average_grade,
        total_elevation_gain: s.total_elevation_gain,
        city: s.city,
        country: s.country,
        athlete_pr_effort: s.athlete_pr_effort
      })))
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Serverfout: ' + err.message })
    };
  }
};
