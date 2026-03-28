exports.handler = async (event) => {
  const { token, id } = event.queryStringParameters || {};

  if (!token || !id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Token of segment ID ontbreekt' })
    };
  }

  try {
    // Get segment details
    const segRes = await fetch(`https://www.strava.com/api/v3/segments/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const seg = await segRes.json();
    if (!segRes.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: seg.message || 'Segment niet gevonden' }) };
    }

    // Get segment streams (GPS + altitude data)
    const streamRes = await fetch(
      `https://www.strava.com/api/v3/segments/${id}/streams?keys=latlng,altitude,distance&key_by_type=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const streams = await streamRes.json();
    if (!streamRes.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Kon segmentdata niet ophalen' }) };
    }

    // Build point array
    const latlng = streams.latlng?.data || [];
    const altitude = streams.altitude?.data || [];
    const distance = streams.distance?.data || [];

    const points = latlng.map((ll, i) => ({
      lat: ll[0], lng: ll[1],
      ele: altitude[i] || 0,
      dist: distance[i] || 0
    }));

    const enriched = points.map((p, i) => {
      if (i === 0) return { ...p, grade: 0 };
      const dDist = p.dist - points[i-1].dist;
      const dEle = p.ele - points[i-1].ele;
      const grade = dDist > 0 ? (dEle / dDist) * 100 : 0;
      return { ...p, grade: Math.max(-30, Math.min(30, grade)) };
    });

    // Get PR info
    let pr = null;
    if (seg.athlete_segment_stats) {
      pr = {
        pr_elapsed_time: seg.athlete_segment_stats.pr_elapsed_time,
        pr_date: seg.athlete_segment_stats.pr_activity_date || null,
        effort_count: seg.athlete_segment_stats.effort_count
      };
    }

    // Get PR effort to find the bike used
    let prBike = null;
    try {
      const effortsRes = await fetch(
        `https://www.strava.com/api/v3/segments/${id}/all_efforts?per_page=1`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (effortsRes.ok) {
        const efforts = await effortsRes.json();
        if (efforts.length > 0 && efforts[0].activity && efforts[0].activity.gear_id) {
          prBike = { gear_id: efforts[0].activity.gear_id };
        }
        // Also try to get activity detail for full gear info
        if (efforts.length > 0 && efforts[0].activity_id) {
          const actRes = await fetch(
            `https://www.strava.com/api/v3/activities/${efforts[0].activity_id}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (actRes.ok) {
            const act = await actRes.json();
            if (act.gear_id) {
              prBike = {
                gear_id: act.gear_id,
                gear_name: act.gear ? act.gear.name : null
              };
            }
            // Use activity start_date if pr_date is missing
            if (pr && !pr.pr_date && act.start_date) {
              pr.pr_date = act.start_date;
            }
          }
        }
      }
    } catch(e) {
      // bike lookup failed, continue without
    }

    // Try to get KOM from leaderboard
    let komTime = null;
    try {
      // Try overall leaderboard first (requires read_all scope)
      const lbRes = await fetch(
        `https://www.strava.com/api/v3/segments/${id}/leaderboard?per_page=1&gender=M`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (lbRes.ok) {
        const lb = await lbRes.json();
        if (lb.entries && lb.entries.length > 0) {
          komTime = lb.entries[0].elapsed_time;
        }
      }
      // Fallback: try xoms field
      if (!komTime && seg.xoms && seg.xoms.kom) {
        // xoms.kom is a string like "1:23" - parse it
        const parts = seg.xoms.kom.split(':').map(Number);
        if (parts.length === 2) komTime = parts[0]*60 + parts[1];
        else if (parts.length === 3) komTime = parts[0]*3600 + parts[1]*60 + parts[2];
      }
    } catch(e) {}

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
        start_latlng: seg.start_latlng || null,
        end_latlng: seg.end_latlng || null,
        pr,
        pr_bike: prBike,
        kom_time: komTime, // KOM elapsed time in seconds from leaderboard
        points: enriched
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Serverfout: ' + err.message }) };
  }
};
