import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PRE_CHECK_WINDOW = 50; 
const LIMIT_PER_REGION = 50;

const TARGETS = [
    { type: 'region', code: 'CA.13', name: 'Nunavut', lat: 70.3, lon: -92.2 },
    { type: 'region', code: 'CA.06', name: 'Northwest Terr.', lat: 64.8, lon: -119.1 },
    { type: 'region', code: 'CA.01', name: 'Alberta', lat: 53.9, lon: -116.5 },
    { type: 'region', code: 'CA.02', name: 'British Columbia', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.10', name: 'Quebec', lat: 52.9, lon: -73.5 },
    { type: 'region', code: 'CA.08', name: 'Ontario', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'US.AK', name: 'Alaska', lat: 63.5, lon: -148.9 },
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 }
];

async function fetchForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'region';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=${LIMIT_PER_REGION}&include=location,images,urls,player`;
    try {
        const response = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
        const data = await response.json();
        return data.webcams || [];
    } catch (e) { return []; }
}

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const activeTargets = TARGETS.filter(t => {
            const sunPos = SunCalc.getPosition(now, t.lat, t.lon);
            const alt = sunPos.altitude * 180 / Math.PI;
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        const debugInfo = [];
        const allFetchedCams = [];

        for (const target of activeTargets) {
            const cams = await fetchForTarget(target);
            const sunPosRef = SunCalc.getPosition(now, target.lat, target.lon);
            
            const filtered = cams.filter(w => {
                if (!w.location) return false;
                const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
                const a = s.altitude * 180 / Math.PI;
                w.sunAlt = a;
                w.isPremium = (a >= -6 && a <= 6);
                return a >= GOLDEN_HOUR_MIN && a <= GOLDEN_HOUR_MAX;
            });

            debugInfo.push({
                name: target.name,
                sunAlt: (sunPosRef.altitude * 180 / Math.PI).toFixed(1),
                fetched: cams.length, // REALE MENGE
                inGH: filtered.length
            });
            allFetchedCams.push(...filtered);
        }

        const unique = Array.from(new Map(allFetchedCams.map(c => [c.webcamId, c])).values());
        res.json({ status: "success", debug: debugInfo, webcams: unique });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend läuft auf Port ${PORT}`));
