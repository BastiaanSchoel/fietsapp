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

    // Use raw text - but only stringify effort IDs (they're the large 64-bit ones)
    // Segment IDs are typically 7-9 digits, effort IDs are 18-19 digits
    const rawText = await res.text();
    // Only convert IDs with 15+ digits to strings (effort IDs, not segment IDs)
    const safeText = rawText.replace(/"id"\s*:\s*(\d{15,})/g, '"id": "$1"');
    const act = JSON.parse(safeText);

    const segments = (act.segment_efforts || []).map(e => ({
      id: e.segment ? e.segment.id : null,        // segment ID (small, stays number)
      name: e.segment ? e.segment.name : '',
      effort_id: String(e.id),                     // effort ID (large, stored as string)
      elapsed_time: e.elapsed_time,
      average_watts: e.average_watts || null,
      distance: e.segment ? e.segment.distance : 0,
      average_grade: e.segment ? e.segment.average_grade : 0,
      maximum_grade: e.segment ? e.segment.maximum_grade : 0,
      total_elevation_gain: e.segment ? e.segment.total_elevation_gain : 0,
      city: e.segment ? e.segment.city : '',
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
