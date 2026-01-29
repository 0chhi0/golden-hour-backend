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

// Liste der Ziele (Auszug, erweitere diese wie besprochen)
const TARGETS = [
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 13.5 },
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.0, lon: 10.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'GB', name: 'UK', lat: 54.0, lon: -2.5 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.5, lon: 8.5 },
    { type: 'region', code: 'BR.SP', name: 'Brasilien-SP', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'US.NY', name: 'USA-NY', lat: 40.7, lon: -74.0 }
];

async function fetchWebcamsForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=50&include=location,images,urls,player`;
    
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
            const alt = SunCalc.getPosition(now, t.lat, t.lon).altitude * 180 / Math.PI;
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        const results = await Promise.all(activeTargets.map(t => fetchWebcamsForTarget(t)));
        const allCams = results.flat().filter(w => {
            if (!w.location) return false;
            const alt = SunCalc.getPosition(now, w.location.latitude, w.location.longitude).altitude * 180 / Math.PI;
            w.sunAlt = alt; // Wichtig für Frontend
            w.isPremium = (alt >= -6 && alt <= 6);
            return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
        });

        // Eindeutige IDs sicherstellen
        const uniqueCams = Array.from(new Map(allCams.map(c => [c.webcamId, c])).values());

        // ANTWORT-STRUKTUR EXAKT FÜRS FRONTEND
        res.json({
            status: "success",
            meta: {
                total: uniqueCams.length,
                gridSize: "5", // Für die Anzeige im Frontend
                serverTime: now.toISOString()
            },
            webcams: uniqueCams
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message, webcams: [] });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend aktiv auf Port ${PORT}`));
