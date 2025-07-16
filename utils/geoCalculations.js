// Geographic calculation utilities

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function kilometersToMiles(km) {
  return km * 0.621371;
}

function calculateLocationDistances(locations) {
  const distances = [];
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const loc1 = locations[i];
      const loc2 = locations[j];
      const distanceKm = calculateDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude);
      const distanceMiles = kilometersToMiles(distanceKm);
      
      distances.push({
        from: loc1.city,
        to: loc2.city,
        distanceKm: Math.round(distanceKm),
        distanceMiles: Math.round(distanceMiles)
      });
    }
  }
  return distances;
}

function calculateTimeDifferences(locations) {
  const timeDiffs = [];
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const loc1 = locations[i];
      const loc2 = locations[j];
      const timeDiff = Math.abs(loc1.timezoneOffset - loc2.timezoneOffset);
      
      timeDiffs.push({
        from: loc1.city,
        to: loc2.city,
        timeDifference: timeDiff
      });
    }
  }
  return timeDiffs;
}

module.exports = {
  toRadians,
  calculateDistance,
  kilometersToMiles,
  calculateLocationDistances,
  calculateTimeDifferences
};