exports.handler = async (event) => {
  const { code } = event.queryStringParameters || {};
  if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'Geen code meegegeven' }) };

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    if (!response.ok) return { statusCode: 400, body: JSON.stringify({ error: data.message || 'Strava fout' }) };

    // Also fetch full athlete profile for weight, HR zones etc
    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const athleteFull = athleteRes.ok ? await athleteRes.json() : {};

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.access_token,
        athlete: {
          id: data.athlete.id,
          firstname: data.athlete.firstname,
          lastname: data.athlete.lastname,
          profile: data.athlete.profile_medium,
          weight: athleteFull.weight || null,      // kg
          bikes: data.athlete.bikes || [],
          sex: athleteFull.sex || null,
          max_heartrate: athleteFull.athlete_hr_setting ? athleteFull.athlete_hr_setting.max : null
        }
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Serverfout: ' + err.message }) };
  }
};
