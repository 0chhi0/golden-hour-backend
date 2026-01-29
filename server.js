import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PRE_CHECK_WINDOW = 12;

// GLOBALE TARGET-LISTE FÜR MAXIMALE ABDECKUNG
const TARGETS = [
    // --- EUROPA ---
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 },
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 14.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.2, lon: 2.2 },
    { type: 'country', code: 'IT', name: 'Italien', lat: 41.8, lon: 12.5 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'GB', name: 'UK', lat: 55.3, lon: -3.4 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.4, lon: 8.4 },
    // --- AMERIKA (Regionen) ---
    { type: 'region', code: 'US.NY', name: 'USA-Ost', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.CA', name: 'USA-West', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'BR.SP', name: 'Brasilien-SP', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'BR.RJ', name: 'Brasilien-RJ', lat: -22.9, lon: -43.1 },
    { type: 'region', code: 'BR.AM', name: 'Brasilien-Amazonas', lat: -3.4, lon: -60.0 },
    { type: 'country', code: 'AR', name: 'Argentinien', lat: -38.4, lon: -63.6 },
    // --- ASIEN & OZEANIEN ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
    { type: 'country', code: 'AU', name: 'Australien', lat: -25.2, lon: 133.7 },
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.8 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.8, lon: 100.5 },
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.5, lon: 22.9 }
];

async function fetchWebcams(target) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=50&include=location,images,urls,player`;
    try {
        const res = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
        const data = await res.json();
        return data.webcams || [];
    } catch (e) { return []; }
}

app.get('/api/webcams', async (req, res) => {
    const now = new Date();
    const active = TARGETS.filter(t => {
        const alt = SunCalc.getPosition(now, t.lat, t.lon).altitude * 180 / Math.PI;
        return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
    });

    const results = await Promise.all(active.map(fetchWebcams));
    const finalCams = results.flat().filter(w => {
        const alt = SunCalc.getPosition(now, w.location.latitude, w.location.longitude).altitude * 180 / Math.PI;
        w.sunAlt = alt; // Für Frontend-Anzeige
        w.isPremium = (alt >= -6 && alt <= 6); // Für Premium Badge
        return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
    });

    const unique = Array.from(new Map(finalCams.map(c => [c.webcamId, c])).values());
    res.json({ status: "success", meta: { gridSize: 5, total: unique.length }, webcams: unique });
});

app.listen(10000, '0.0.0.0', () => console.log("Backend aktiv"));
