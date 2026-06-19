// netlify/functions/find-snap.js
// Finds real EBT/SNAP-accepting stores near a ZIP or lat/lng.
//
// DATA SOURCE: USDA SNAP Retailer Locator (public ArcGIS FeatureServer).
// If results ever stop coming back, update SNAP_SERVICE below — find the
// current URL at: https://www.fns.usda.gov/snap/retailer-locator
// (open dev tools Network tab on that page, copy the FeatureServer/0/query URL)

const SNAP_SERVICE = 'https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/Store_Locations/FeatureServer/0/query';

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const params = event.queryStringParameters || {};
    let { zip, lat, lng } = params;
    if (event.body) {
      try { const b = JSON.parse(event.body); zip = b.zip||zip; lat = b.lat||lat; lng = b.lng||lng; } catch(e){}
    }

    // Geocode ZIP -> lat/lng (free OpenStreetMap Nominatim)
    if ((!lat || !lng) && zip) {
      try {
        const geo = await fetch(
          'https://nominatim.openstreetmap.org/search?postalcode=' + encodeURIComponent(zip) + '&country=USA&format=json&limit=1',
          { headers: { 'User-Agent': 'ChefSays/1.0 (chefsays.ai)' } }
        );
        const gj = await geo.json();
        if (gj && gj.length) { lat = parseFloat(gj[0].lat); lng = parseFloat(gj[0].lon); }
      } catch(e) {}
    }

    if (!lat || !lng) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'no_location', stores: [] }) };
    }

    const url = SNAP_SERVICE +
      '?where=1%3D1' +
      '&geometry=' + lng + ',' + lat +
      '&geometryType=esriGeometryPoint&inSR=4326' +
      '&distance=8047&units=esriSRUnit_Meter' +
      '&spatialRel=esriSpatialRelIntersects' +
      '&outFields=*' +
      '&returnGeometry=true&outSR=4326&resultRecordCount=20&f=json';

    const resp = await fetch(url);
    const data = await resp.json();

    const stores = [];
    if (data.features) {
      for (const f of data.features) {
        const a = f.attributes || {};
        const g = f.geometry || {};
        // Field names vary by USDA layer version — try common variants
        const name = a.Store_Name || a.STORE_NAME || a.StoreName || a.Name || 'SNAP Retailer';
        const addr = a.Address || a.ADDRESS || a.Street || '';
        const city = a.City || a.CITY || '';
        const state = a.State || a.STATE || '';
        const zip5 = a.Zip5 || a.ZIP5 || a.Zip || '';
        const dist = (g.y && g.x) ? haversine(lat, lng, g.y, g.x) : null;
        stores.push({
          name,
          address: [addr, city, state, zip5].filter(Boolean).join(', '),
          lat: g.y, lng: g.x,
          miles: dist != null ? +dist.toFixed(1) : null
        });
      }
    }
    stores.sort((p, q) => (p.miles||999) - (q.miles||999));

    return { statusCode: 200, headers, body: JSON.stringify({ stores: stores.slice(0, 15), count: stores.length }) };

  } catch (err) {
    console.error('SNAP error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message, stores: [] }) };
  }
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
