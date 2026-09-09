// Realistic GPS Route Simulation for driver testing without physical road travel
export const PUNE_DELIVERY_WAYPOINTS = [
  { lat: 18.54414, lng: 73.79346, name: 'Pashan Hub (Sus Road)' },
  { lat: 18.55100, lng: 73.79120, name: 'Pashan-Baner Link Road' },
  { lat: 18.55900, lng: 73.78680, name: 'Baner Main Junction' },
  { lat: 18.55800, lng: 73.80700, name: 'Aundh DP Road' },
  { lat: 18.53800, lng: 73.83400, name: 'Pune University Circle' },
  { lat: 18.52040, lng: 73.85670, name: 'Shivajinagar Blood Distribution Center' },
  { lat: 18.50800, lng: 73.80500, name: 'Kothrud Paud Road Depot' },
  { lat: 18.53600, lng: 73.78800, name: 'Pashan Lake Junction' },
  { lat: 18.54414, lng: 73.79346, name: 'Pashan Hub (Sus Road)' },
];

export const MUMBAI_DELIVERY_WAYPOINTS = [
  { lat: 19.0596, lng: 72.8406, name: 'Bandra Station West Hub' },
  { lat: 19.0645, lng: 72.8550, name: 'Kalanagar Junction' },
  { lat: 19.0688, lng: 72.8685, name: 'Bandra Kurla Complex (BKC)' },
  { lat: 19.0742, lng: 72.8610, name: 'CST Road Santacruz' },
  { lat: 19.0825, lng: 72.8580, name: 'Western Express Highway (WEH)' },
  { lat: 19.0968, lng: 72.8525, name: 'Vile Parle Flyover' },
  { lat: 19.1136, lng: 72.8697, name: 'Andheri East Logistics Park' },
  { lat: 19.1245, lng: 72.8512, name: 'Jogeshwari Hub' },
  { lat: 19.1136, lng: 72.8697, name: 'Andheri East Logistics Park' },
  { lat: 19.0742, lng: 72.8610, name: 'CST Road Santacruz' },
];

export class LocationSimulator {
  constructor(waypoints = PUNE_DELIVERY_WAYPOINTS) {
    this.waypoints = waypoints;
    this.currentIdx = 0;
    this.progress = 0; // 0 to 1 between current and next waypoint
    this.step = 0.08;  // Speed of progression
  }

  getNextPoint() {
    const from = this.waypoints[this.currentIdx];
    const nextIdx = (this.currentIdx + 1) % this.waypoints.length;
    const to = this.waypoints[nextIdx];

    // Interpolate coordinates
    const lat = from.lat + (to.lat - from.lat) * this.progress;
    const lng = from.lng + (to.lng - from.lng) * this.progress;

    // Calculate heading (bearing)
    const dLng = to.lng - from.lng;
    const dLat = to.lat - from.lat;
    let heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    if (heading < 0) heading += 360;

    // Speed: 30 to 55 km/h with subtle noise
    const speed = 32 + Math.sin(this.progress * Math.PI) * 22 + (Math.random() * 4 - 2);

    // Advance
    this.progress += this.step;
    if (this.progress >= 1) {
      this.progress = 0;
      this.currentIdx = nextIdx;
    }

    return {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      speed: parseFloat(Math.max(0, speed).toFixed(1)),
      heading: Math.round(heading),
      address: `${from.name} ➔ ${to.name}`,
    };
  }

  reset() {
    this.currentIdx = 0;
    this.progress = 0;
  }
}
