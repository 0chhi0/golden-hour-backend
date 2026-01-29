import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Golden Hour Definitionen
const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PREMIUM_MIN = -6;
const PREMIUM_MAX = 6;
const PRE_CHECK_MIN = -12;
const PRE_CHECK_MAX = 12;

// Cache
let webcamCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 10 * 60 * 1000;

// ========================================
// ZIEL-DEFINITIONEN
// ========================================
const TARGETS = [
    { type: 'country', code: 'AT', name: 'Österreich', refLat: 47.5, refLon: 13.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', refLat: 46.8, refLon: 8.2 },
    { type: 'country', code: 'DE', name: 'Deutschland', refLat: 51.0, refLon: 10.5 },
    { type: 'country', code: 'FR', name: 'Frankreich', refLat: 46.6, refLon: 2.3 },
    { type: 'country', code: 'IT', name: 'Italien', refLat: 42.8, refLon: 12.5 },
    { type: 'country', code: 'ES', name: 'Spanien', refLat: 40.4, refLon: -3.7 },
    { type: 'country', code: 'GB', name: 'Vereinigtes Königreich', refLat: 54.0, refLon: -2.5 },
    { type: 'country', code: 'IE', name: 'Irland', refLat: 53.4, refLon: -8.0 },
    { type: 'country', code: 'NO', name: 'Norwegen', refLat: 60.5, refLon: 8.5 },
    { type: 'country', code: 'SE', name: 'Schweden', refLat: 60.1, refLon: 18.6 },
    { type: 'country', code: 'FI', name: 'Finnland', refLat: 61.9, refLon: 25.7 },
    { type: 'country', code: 'JP', name: 'Japan', refLat: 36.2, refLon: 138.3 },
    { type: 'region', code: 'US.CA', name: 'Kalifornien', refLat: 36.7, refLon: -119.4 },
    { type: 'region', code: 'US.NY', name: 'New York', refLat: 42.5, refLon: -75.5 },
    { type: 'region', code: 'BR.SP', name: 'São Paulo', refLat: -23.5, refLon: -46.6 },
    { type: 'region', code: 'AU.NSW', name: 'New South Wales', refLat: -32.0, refLon: 147.0 }
    // ... Liste kann beliebig erweitert werden
];

// ========================================
// HILFSFUNKTIONEN
// ========================================
function getSunAltitude(lat, lon, time) {
    const sunPos = SunCalc.getPosition(time, lat, lon);
    return sunPos.altitude * 180 / Math.PI;
}

// ========================================
// API CALL MIT DEBUG-LOGS
// ========================================
async function fetchWebcamsForTarget(target, limit = 50) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    // Wichtig: include=location,images damit Daten für Filter vorhanden sind
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=${limit}&include=location,images`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (!response.ok) {
            console.error(`  ❌ ${target.name}: HTTP ${response.status}`);
            return [];
        }

        const data = await response.json();

        // DEBUG LOG: Zeige die ersten 200 Zeichen der Antwort von UK
        if (target.code === 'GB') {
            console.log(`\n--- DEBUG START (GB) ---`);
            console.log(`URL: ${url}`);
            console.log(`Antwort-Keys: ${Object.keys(data).join(', ')}`);
            if (data.result) console.log(`Keys in data.result: ${Object.keys(data.result).join(', ')}`);
            console.log(`Vorschau: ${JSON.stringify(data).substring(0, 300)}...`);
            console.log(`--- DEBUG ENDE ---\n`);
        }

        // Flexibler Pfad-Check
        const webcams = data.webcams || data.result?.webcams || data.result || [];
        return Array.isArray(webcams) ? webcams : [];

    } catch (error) {
        console.error(`  ❌ ${target.name} Fehler: ${error.message}`);
        return [];
    }
}

// ========================================
// HAUPT-SCANNER
// ========================================
async function fetchGoldenHourWebcams() {
    const now = new Date();
    console.log(`\n🔍 Scan gestartet: ${now.toISOString()}`);

    // 1. Vor-Check
    const activeTargets = TARGETS.filter(t => {
        const alt = getSunAltitude(t.refLat, t.refLon, now);
        return alt >= PRE_CHECK_MIN && alt <= PRE_CHECK_MAX;
    });

    console.log(`📊 Aktive Ziele: ${activeTargets.length}/${TARGETS.length}`);

    // 2. API Anfragen
    const promises = activeTargets.map(t => fetchWebcamsForTarget(t));
    const results = await Promise.all(promises);

    const allWebcams = new Map();
    results.forEach((webcams, idx) => {
        const target = activeTargets[idx];
        if (webcams && webcams.length > 0) {
            console.log(`  ✅ ${target.name}: ${webcams.length} Cams empfangen`);
            webcams.forEach(w => {
                const id = w.webcamId || w.id;
                if (id) allWebcams.set(id, w);
            });
        } else {
            console.log(`  ⚪ ${target.name}: 0 Cams`);
        }
    });

    // 3. Präzisions-Filter
    const filtered = [];
    allWebcams.forEach(w => {
        if (!w.location) return; // Ohne Location kein SunCalc möglich
        const alt = getSunAltitude(w.location.latitude, w.location.longitude, now);
        if (alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX) {
            w.sunAlt = alt;
            w.isPremium = (alt >= PREMIUM_MIN && alt <= PREMIUM_MAX);
            filtered.push(w);
        }
    });

    console.log(`\n✨ Ergebnis: ${filtered.length} Webcams in der Golden Hour\n`);
    webcamCache = filtered;
    lastCacheUpdate = Date.now();
    return filtered;
}

// ========================================
// ROUTES
// ========================================
app.get('/api/webcams', async (req, res) => {
    try {
        const cams = await fetchGoldenHourWebcams();
        res.json({ webcams: cams, meta: { total: cams.length, time: new Date() } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req, res) => res.send("Golden Hour Backend aktiv. Nutze /api/webcams"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server läuft auf Port ${PORT}`);
    // Initialer Scan beim Start
    await fetchGoldenHourWebcams();
});
