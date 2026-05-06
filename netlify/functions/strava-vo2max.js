exports.handler = async (event) => {
  const { token } = event.queryStringParameters || {};
  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'Token ontbreekt' }) };

  try {
    // Get last 90 days of rides to find best 20-min power
    const after = Math.floor(Date.now()/1000) - 90*24*3600;
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${after}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: 'Kon activiteiten niet laden' }) };
    const activities = await res.json();

    // Filter cycling with power data
    const rides = activities.filter(a =>
      (a.type === 'Ride' || a.type === 'GravelRide' || a.type === 'MountainBikeRide') &&
      a.average_watts && a.moving_time >= 1200  // min 20 min
    );

    // Find best average power for rides >= 20 min
    // Use weighted_average_watts if available (more accurate for variable power)
    let best20min = 0;
    let bestActivity = null;
    rides.forEach(a => {
      const watts = a.weighted_average_watts || a.average_watts;
      if (watts > best20min) {
        best20min = watts;
        bestActivity = a;
      }
    });

    // Also get recent HR data if available
    const hrRides = activities.filter(a =>
      (a.type === 'Ride' || a.type === 'GravelRide') &&
      a.average_heartrate && a.average_watts && a.moving_time >= 600
    );

    // Best HR/watts ratio (efficiency indicator)
    let avgHREfficiency = null;
    if (hrRides.length >= 3) {
      const recent = hrRides.slice(0, 10);
      const avgRatio = recent.reduce((sum, a) => sum + (a.average_watts / a.average_heartrate), 0) / recent.length;
      avgHREfficiency = Math.round(avgRatio * 10) / 10;
    }

    // Power history for trend (last 8 weeks, weekly best)
    const weeklyBest = {};
    rides.forEach(a => {
      const w = Math.floor((Date.now()/1000 - new Date(a.start_date).getTime()/1000) / (7*24*3600));
      const watts = a.weighted_average_watts || a.average_watts;
      if (!weeklyBest[w] || watts > weeklyBest[w]) weeklyBest[w] = watts;
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        best20minWatts: Math.round(best20min),
        bestActivityDate: bestActivity ? bestActivity.start_date_local : null,
        bestActivityName: bestActivity ? bestActivity.name : null,
        rideCount: rides.length,
        hrEfficiency: avgHREfficiency,
        weeklyBest: weeklyBest
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
