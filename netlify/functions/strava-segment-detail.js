exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};

  if (!token || !id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Token of segment ID ontbreekt' })
    };
  }

  try {
    const segRes = await fetch(`https://www.strava.com/api/v3/segments/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const seg = await segRes.json();

    if (!segRes.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: seg.message || 'Segment niet gevonden' })
      };
    }

    const streamRes = await fetch(
      `https://www.strava.com/api/v3/segments/${id}/streams?keys=latlng,altitude,distance&key_by_type=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const streams = await streamRes.json();

    const latlng = streams.latlng?.data || [];
    const altitude = streams.altitude?.data || [];
    const distance = streams.distance?.data || [];

    const points = latlng.map((ll, i) => {
      const dist = distance[i] || 0;
      const ele = altitude[i] || 0;
      const prevDist = distance[i-1] || 0;
      const prevEle = altitude[i-1] || 0;
      const dDist = dist - prevDist;
      const dEle = ele - prevEle;
      const grade = i === 0 ? 0 : dDist > 0 ? (dEle / dDist) * 100 : 0;
      return { lat: ll[0], lng: ll[1], ele, dist, grade: Math.max(-30, Math.min(30, grade)) };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: seg.id,
        name: seg.name,
        distance: seg.distance,
        average_grade: seg.average_grade,
        maximum_grade: seg.maximum_grade,
        total_elevation_gain: seg.total_elevation_gain,
        city: seg.city,
        pr: seg.athlete_segment_stats ? {
          pr_elapsed_time: seg.athlete_segment_stats.pr_elapsed_time,
          effort_count: seg.athlete_segment_stats.effort_count
        } : null,
        points
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Serverfout: ' + err.message })
    };
  }
};
```

---

Na het aanmaken van alle drie ga je in Netlify naar **Deploys** — je ziet automatisch een nieuwe build starten. Daarna test je opnieuw:
```
https://jouwapp.netlify.app/api/strava-auth
