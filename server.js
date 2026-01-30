import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'DEIN_KEY_HIER';

const GOLDEN_MIN = -12;
const GOLDEN_MAX = 10;
const LIMIT_PER_REGION = 50;

const TARGETS = [
  { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 },
  { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.2, lon: 2.2 },
  { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
  { type: 'country', code: 'CA', name: 'Kanada', lat: 56, lon: -106 },
  { type: 'region', code: 'CA.02', name: 'British Columbia', lat: 53.7, lon: -127.6 },
  { type: 'region', code: 'CA.08', name: 'Ontario', lat: 51.2, lon: -85.3 },
  { type: 'country', code: 'US', name: 'USA', lat: 39.8, lon: -98.6 },
  { type: 'region', code: 'US.CA', name: 'California', lat: 36.7, lon: -119.4 },
  { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
  { type: 'country', code: 'BR', name: 'Brasilien', lat: -14.2, lon: -51.9 }
];

async function fetchTarget(t) {
  const param = t.type === 'country' ? 'countries' : 'region';
  const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${t.code}&limit=${LIMIT_PER_REGION}&include=location,images,urls,player`;

  try {
    const r = await fetch(url, {
      headers: { 'x-windy-api-key': WINDY_KEY }
    });
    const j = await r.json();
    return j.webcams || [];
  } catch {
    return [];
  }
}

app.get('/api/webcams', async (req, res) => {
  const now = new Date();
  const debug = [];
  let allCams = [];

  for (const t of TARGETS) {
    const sun = SunCalc.getPosition(now, t.lat, t.lon);
    const sunAlt = sun.altitude * 180 / Math.PI;

    const cams = await fetchTarget(t);

    debug.push({
      code: t.code,
      name: t.name,
      type: t.type,
      lat: t.lat,
      lon: t.lon,
      sunAlt: Number(sunAlt.toFixed(1)),
      camsFetched: cams.length,
      camsGolden: 0
    });

    cams.forEach(c => {
      if (!c.location) return;
      const s = SunCalc.getPosition(
        now,
        c.location.latitude,
        c.location.longitude
      );
      const alt = s.altitude * 180 / Math.PI;

      c.sunAlt = alt;
      c.isGolden = alt >= GOLDEN_MIN && alt <= GOLDEN_MAX;
      c.__target = t.code;

      if (c.isGolden) {
        const d = debug.find(x => x.code === t.code);
        if (d) d.camsGolden++;
      }

      allCams.push(c);
    });
  }

  const unique = Array.from(
    new Map(allCams.map(c => [c.webcamId, c])).values()
  );

  res.json({
    status: 'success',
    webcams: unique.filter(c => c.isGolden),
    debug
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('🔥 Backend läuft auf', PORT));
