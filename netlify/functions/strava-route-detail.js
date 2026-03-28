exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};
  if (!token || !id) return { statusCode: 400, body: JSON.stringify({ error: 'Token of ID ontbreekt' }) };

  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/routes/${id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Route niet gevonden (status ${res.status})`;
      try { errMsg = JSON.parse(errText).message || errMsg; } catch(e) {}
      return { statusCode: res.status, body: JSON.stringify({ error: errMsg }) };
    }

    // Use raw text to avoid precision loss on large IDs
    const rawText = await res.text();
    const safeText = rawText.replace(/"id"\s*:\s*(\d{10,})/g, '"id": "$1"');
    const route = JSON.parse(safeText);

    let segments = [];
    let isFallback = false;

    if (route.segments && route.segments.length > 0) {
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
    } else {
      // Fall back to starred segments
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
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: String(route.id),
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
