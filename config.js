/*
 * Taryfa – pricing and service configuration.
 *
 * All fares are ESTIMATES. Uber, Bolt and FREENOW do not publish open price APIs.
 * Update the numbers below whenever you check current prices in each app.
 * Currency: PLN. Distances: km. Time: minutes.
 *
 * App rides (Uber, Bolt):
 *   fare = max(minimum, (base + km * perKm + min * perMin) * surge) + bookingFee
 *
 * Licensed taxi (FREENOW):
 *   fare = (start + km * perKm[tariff] + waitingMinutes * perWaitMin) * classMultiplier
 *   tariff 1 = day, tariff 2 = night (22:00–06:00) and Sundays/holidays
 */
window.TARYFA_CONFIG = {
  city: {
    name: 'Warsaw',
    center: [52.2297, 21.0122],
    zoom: 12,
    // Search box: west, north, east, south
    viewbox: [20.75, 52.40, 21.35, 52.05],
    timeZone: 'Europe/Warsaw'
  },

  // Free public services. For heavy traffic, switch to your own or a paid provider (see README).
  services: {
    tiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tilesAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    geocoder: 'https://nominatim.openstreetmap.org',
    router: 'https://router.project-osrm.org/route/v1/driving'
  },

  // Straight-line → road distance factor, used only if routing is unavailable.
  roadFactor: 1.33,

  // Average speeds (km/h) used when routing is unavailable.
  speeds: { peak: 19, normal: 26, night: 34 },

  // Multiplier on the router's free-flow travel time, by traffic level.
  trafficFactor: { peak: 1.6, normal: 1.25, night: 1.05 },

  providers: [
    {
      id: 'uber',
      name: 'Uber',
      type: 'app',
      color: '#000000',
      text: '#FFFFFF',
      bar: '#101318',
      initial: 'U',
      surge: { peak: 1.2, party: 1.35 },
      eta: [3, 7],
      classes: {
        standard: { product: 'UberX',   base: 6, perKm: 1.85, perMin: 0.40, minimum: 11, bookingFee: 2 },
        comfort:  { product: 'Comfort', base: 8, perKm: 2.40, perMin: 0.50, minimum: 15, bookingFee: 2 },
        xl:       { product: 'UberXL',  base: 9, perKm: 2.90, perMin: 0.55, minimum: 20, bookingFee: 2 }
      }
    },
    {
      id: 'bolt',
      name: 'Bolt',
      type: 'app',
      color: '#34D186',
      text: '#08261A',
      bar: '#1FA866',
      initial: 'B',
      surge: { peak: 1.15, party: 1.3 },
      eta: [2, 6],
      link: 'https://bolt.eu/pl-pl/rides/',
      classes: {
        standard: { product: 'Bolt',    base: 5, perKm: 1.75, perMin: 0.40, minimum: 10, bookingFee: 1.5 },
        comfort:  { product: 'Comfort', base: 7, perKm: 2.25, perMin: 0.45, minimum: 14, bookingFee: 1.5 },
        xl:       { product: 'XL',      base: 8, perKm: 2.70, perMin: 0.50, minimum: 18, bookingFee: 1.5 }
      }
    },
    {
      id: 'freenow',
      name: 'FREENOW',
      type: 'taxi',
      color: '#C8102E',
      text: '#FFFFFF',
      bar: '#C8102E',
      initial: 'F',
      eta: [4, 9],
      link: 'https://www.free-now.com/pl/',
      start: 8,
      perKm: { tariff1: 3.0, tariff2: 4.5 },
      perWaitMin: 0.67,
      waitingShare: 0.25, // share of trip time spent waiting in traffic
      classes: {
        standard: { product: 'Taxi',         multiplier: 1 },
        comfort:  { product: 'Taxi Comfort', multiplier: 1.2 },
        xl:       { product: 'Taxi XL',      multiplier: 1.35 }
      }
    }
  ]
};
