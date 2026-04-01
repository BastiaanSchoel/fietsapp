exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};
  if (!token || !id) return { statusCode: 400, body: JSON.stringify({ error: 'Token of ID ontbreekt' }) };

  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { statusCode: res.status, body: JSON.stringify({ error: err.message || 'Activiteit niet gevonden' }) };
    }

    // Use raw text to preserve 64-bit IDs (effort IDs, segment IDs)
    const rawText = await res.text();
    const safeText = rawText.replace(/"id"\s*:\s*(\d{10,})/g, '"id": "$1"');
    const act = JSON.parse(safeText);

    const segments = (act.segment_efforts || []).map(e => ({
      id: e.segment.id,
      name: e.segment.name,
      effort_id: String(e.id),  // preserve as string
      elapsed_time: e.elapsed_time,
      average_watts: e.average_watts || null,
      distance: e.segment.distance,
      average_grade: e.segment.average_grade,
      maximum_grade: e.segment.maximum_grade,
      total_elevation_gain: e.segment.total_elevation_gain,
      city: e.segment.city,
      pr_rank: e.pr_rank,
      achievements: e.achievements || []
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: act.id,
        name: act.name,
        type: act.type,
        distance: act.distance,
        moving_time: act.moving_time,
        start_date: act.start_date_local,
        gear_id: act.gear_id,
        gear_name: act.gear ? act.gear.name : null,
        total_elevation_gain: act.total_elevation_gain,
        segments
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
