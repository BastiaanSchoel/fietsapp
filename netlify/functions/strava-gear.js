exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};
  if (!token || !id) return { statusCode: 400, body: JSON.stringify({ error: 'Token of ID ontbreekt' }) };

  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/gear/${id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const gear = await res.json();
    if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: gear.message || 'Fiets niet gevonden' }) };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: gear.id,
        name: gear.name,
        brand_name: gear.brand_name || '',
        model_name: gear.model_name || '',
        frame_type: gear.frame_type,
        description: gear.description || '',
        distance: gear.distance,
        weight: gear.weight ? gear.weight / 1000 : null
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
