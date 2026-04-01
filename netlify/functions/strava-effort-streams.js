exports.handler = async (event) => {
  const { token, effort_id } = event.queryStringParameters || {};
  if (!token || !effort_id) return { statusCode: 400, body: JSON.stringify({ error: 'Ontbreekt' }) };

  // effort_id comes as string to preserve 64-bit precision
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/segment_efforts/${effort_id}/streams?keys=distance,velocity_smooth,altitude&key_by_type=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { statusCode: res.status, body: JSON.stringify({ error: err.message || `Effort niet gevonden (${res.status})` }) };
    }
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distance: data.distance?.data || [],
        velocity: data.velocity_smooth?.data || [],
        altitude: data.altitude?.data || []
      })
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
