import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PRE_CHECK_WINDOW = 12;

// ========================================
// DIE TOTALE WELT-LISTE (Regionen & Länder)
// ========================================
const TARGETS = [
    // --- NORDAMERIKA (Regionen) ---
    { type: 'region', code: 'US.NY', name: 'USA-NY', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.CA', name: 'USA-CA', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'US.FL', name: 'USA-FL', lat: 27.6, lon: -81.5 },
    { type: 'region', code: 'US.TX', name: 'USA-TX', lat: 31.0, lon: -100.0 },
    { type: 'region', code: 'US.WA', name: 'USA-WA', lat: 47.4, lon: -121.4 },
    { type: 'region', code: 'US.CO', name: 'USA-CO', lat: 39.0, lon: -105.5 },
    { type: 'region', code: 'US.AK', name: 'USA-AK', lat: 64.0, lon: -152.0 },
    { type: 'region', code: 'CA.BC', name: 'Kanada-BC', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.ON', name: 'Kanada-ON', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.QC', name: 'Kanada-QC', lat: 52.9, lon: -73.5 },
    { type: 'country', code: 'MX', name: 'Mexiko', lat: 23.6, lon: -102.5 },

    // --- SÜDAMERIKA (Regionen beibehalten) ---
    { type: 'region', code: 'BR.SP', name: 'Brasilien-SP', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'BR.RJ', name: 'Brasilien-RJ', lat: -22.9, lon: -43.2 },
    { type: 'region', code: 'BR.AM', name: 'Brasilien-AM', lat: -3.1, lon: -60.0 },
    { type: 'region', code: 'AR.C', name: 'Argentinien-BA', lat: -34.6, lon: -58.4 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.7, lon: -71.5 },
    { type: 'country', code: 'PE', name: 'Peru', lat: -9.2, lon: -75.0 },
    { type: 'country', code: 'CO', name: 'Kolumbien', lat: 4.6, lon: -74.1 },

    // --- EUROPA (Vollständig) ---
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 13.5 },
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.0, lon: 10.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.6, lon: 2.3 },
    { type: 'country', code: 'IT', name: 'Italien', lat: 42.8, lon: 12.5 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'GB', name: 'UK', lat: 54.0, lon: -2.5 },
    { type: 'country', code: 'IE', name: 'Irland', lat: 53.4, lon: -8.0 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.5, lon: 8.5 },
    { type: 'country', code: 'SE', name: 'Schweden', lat: 60.1, lon: 18.6 },
    { type: 'country', code: 'FI', name: 'Finnland', lat: 61.9, lon: 25.7 },
    { type: 'country', code: 'IS', name: 'Island', lat: 64.9, lon: -18.0 },
    { type: 'country', code: 'PT', name: 'Portugal', lat: 39.4, lon: -8.2 },
    { type: 'country', code: 'GR', name: 'Griechenland', lat: 39.1, lon: 21.8 },
    { type: 'country', code: 'PL', name: 'Polen', lat: 51.9, lon: 19.1 },
    { type: 'country', code: 'CZ', name: 'Tschechien', lat: 49.8, lon: 15.5 },
    { type: 'country', code: 'HR', name: 'Kroatien', lat: 45.1, lon: 15.2 },

    // --- ASIEN & OZEANIEN (Regionen & Länder) ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.3 },
    { type: 'country', code: 'KR', name: 'Südkorea', lat: 35.9, lon: 127.8 },
    { type: 'region', code: 'AU.NSW', name: 'Australien-Ost', lat: -32.0, lon: 147.0 },
    { type: 'region', code: 'AU.WA', name: 'Australien-West', lat: -26.0, lon: 121.0 },
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.9 },
    { type: 'country', code: 'IN', name: 'Indien', lat: 20.6, lon: 78.9 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.9, lon: 100.9 },
    { type: 'country', code: 'ID', name: 'Indonesien', lat: -0.8, lon: 113.9 },
    { type: 'country', code: 'CN', name: 'China-Ost', lat: 31.2, lon: 121.5 },
    { type: 'country', code: 'TR', name: 'Türkei', lat: 39.0, lon: 35.0 },

    // --- AFRIKA ---
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.6, lon: 22.9 },
    { type: 'country', code: 'MA', name: 'Marokko', lat: 31.8, lon: -7.1 },
    { type: 'country', code: 'EG', name: 'Ägypten', lat: 26.8, lon: 30.8 },
    { type: 'country', code: 'KE', name: 'Kenia', lat: -0.0, lon: 37.9 }
];

async function fetchWebcamsForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=50&include=location,images`;
    
    try {
        const response = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
        const data = await response.json();
        return data.webcams || [];
    } catch (e) {
        console.error(`Fehler bei ${target.name}: ${e.message}`);
        return [];
    }
}

async function getGoldenHourWebcams() {
    const now = new Date();
    
    // 1. Gebiete im Golden Hour Bereich vorfiltern
    const activeTargets = TARGETS.filter(t => {
        const sunPos = SunCalc.getPosition(now, t.lat, t.lon);
        const alt = sunPos.altitude * 180 / Math.PI;
        return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
    });

    console.log(`\n🌍 Globaler Scan: ${activeTargets.length} Ziele im Zeitfenster.`);

    // 2. Parallele Abfragen
    const results = await Promise.all(activeTargets.map(t => fetchWebcamsForTarget(t)));
    
    // 3. Präzisions-Filterung pro Webcam
    const finalCams = results.flat().filter(w => {
        if (!w.location) return false;
        const sunPos = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
        const alt = sunPos.altitude * 180 / Math.PI;
        return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
    });

    // Dubletten-Schutz (falls IDs doppelt kommen)
    const uniqueMap = new Map();
    finalCams.forEach(c => uniqueMap.set(c.webcamId, c));
    
    const sorted = Array.from(uniqueMap.values());
    console.log(`✅ ${sorted.length} Webcams gefunden.`);
    return sorted;
}

app.get('/api/webcams', async (req, res) => {
    try {
        const webcams = await getGoldenHourWebcams();
        res.json({ webcams });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Global Golden Hour Backend läuft auf Port ${PORT}`);
});
