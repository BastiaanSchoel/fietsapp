exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};
  if (!token || !id) return { statusCode: 400, body: JSON.stringify({ error: 'Token of ID ontbreekt' }) };

  try {
    // Get route info
    const res = await fetch(
      `https://www.strava.com/api/v3/routes/${id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = 'Route niet gevonden';
      try { errMsg = JSON.parse(errText).message || errMsg; } catch(e) {}
      return { statusCode: res.status, body: JSON.stringify({ error: errMsg }) };
    }
    const route = await res.json();

    // Strava doesn't return segments on routes without routes:read_all scope
    // Fall back to starred segments
    let segments = [];
    let isFallback = false;

    if (!route.segments || route.segments.length === 0) {
      isFallback = true;
      const starredRes = await fetch(
        `https://www.strava.com/api/v3/segments/starred?per_page=200`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (starredRes.ok) {
        const starred = await starredRes.json();
        if (Array.isArray(starred)) {
          segments = starred.map(s => ({
            id: s.id,
            name: s.name,
            distance: s.distance,
            average_grade: s.average_grade || 0,
            maximum_grade: s.maximum_grade || 0,
            total_elevation_gain: s.total_elevation_gain || 0,
            city: s.city || '',
            athlete_pr_effort: s.athlete_pr_effort || null,
            kom_time: s.xoms ? s.xoms.kom : null
          }));
        }
      }
    } else {
      segments = route.segments.map(s => ({
        id: s.id,
        name: s.name,
        distance: s.distance,
        average_grade: s.average_grade || 0,
        maximum_grade: s.maximum_grade || 0,
        total_elevation_gain: s.total_elevation_gain || 0,
        city: s.city || '',
        athlete_pr_effort: s.athlete_pr_effort || null,
        kom_time: s.xoms ? s.xoms.kom : null
      }));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: route.id,
        name: route.name,
        distance: route.distance,
        elevation_gain: route.elevation_gain,
        segments,
        is_starred_fallback: isFallback
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
