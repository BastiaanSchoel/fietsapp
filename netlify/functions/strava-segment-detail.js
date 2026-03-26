const https = require('https');

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve({ ok: res.statusCode < 400, data: JSON.parse(data) }); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

exports.handler = async function(event) {
  const params = event.queryStringParameters || {};
  const token = params.token;
  const id = params.id;

  if (!token || !id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Token of segment ID ontbreekt' }) };
  }

  try {
    const authHeader = { 'Authorization': 'Bearer ' + token };

    const segResult = await httpsGet('https://www.strava.com/api/v3/segments/' + id, authHeader);
    if (!segResult.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: segResult.data.message || 'Segment niet gevonden' }) };
    }
    const seg = segResult.data;

    const streamResult = await httpsGet(
      'https://www.strava.com/api/v3/segments/' + id + '/streams?keys=latlng,altitude,distance&key_by_type=true',
      authHeader
    );

    const streams = streamResult.data;
    const latlng   = (streams.latlng   && streams.latlng.data)   ? streams.latlng.data   : [];
    const altitude = (streams.altitude && streams.altitude.data) ? streams.altitude.data : [];
    const distance = (streams.distance && streams.distance.data) ? streams.distance.data : [];

    const points = latlng.map(function(ll, i) {
      const dist = distance[i] || 0;
      const ele  = altitude[i] || 0;
      const prevDist = i > 0 ? (distance[i-1] || 0) : 0;
      const prevEle  = i > 0 ? (altitude[i-1] || 0) : 0;
      const dDist = dist - prevDist;
      const dEle  = ele  - prevEle;
      const grade = i === 0 ? 0 : dDist > 0 ? (dEle / dDist) * 100 : 0;
      const clampedGrade = Math.max(-30, Math.min(30, grade));
      return { lat: ll[0], lng: ll[1], ele: ele, dist: dist, grade: clampedGrade };
    });

    const pr = seg.athlete_segment_stats ? {
      pr_elapsed_time: seg.athlete_segment_stats.pr_elapsed_time || 0,
      effort_count: seg.athlete_segment_stats.effort_count || 0
    } : null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: seg.id,
        name: seg.name || '',
        distance: seg.distance || 0,
        average_grade: seg.average_grade || 0,
        maximum_grade: seg.maximum_grade || 0,
        total_elevation_gain: seg.total_elevation_gain || 0,
        city: seg.city || '',
        pr: pr,
        points: points
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Serverfout: ' + err.message }) };
  }
};
