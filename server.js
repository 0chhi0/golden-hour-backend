import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Konfiguration
const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PRE_CHECK_WINDOW = 12; // Vor-Check +/- 12 Grad

// ========================================
// DIE GLOBALE MASTER-LISTE (Alle Kontinente)
// ========================================
const TARGETS = [
    // --- EUROPA ---
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 13.5 },
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.0, lon: 10.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.6, lon: 2.3 },
    { type: 'country', code: 'IT', name: 'Italien', lat: 42.8, lon: 12.5 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'GB', name: 'UK', lat: 54.0, lon: -2.5 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.5, lon: 8.5 },
    { type: 'country', code: 'SE', name: 'Schweden', lat: 60.1, lon: 18.6 },
    { type: 'country', code: 'FI', name: 'Finnland', lat: 61.9, lon: 25.7 },
    { type: 'country', code: 'PL', name: 'Polen', lat: 51.9, lon: 19.1 },
    { type: 'country', code: 'GR', name: 'Griechenland', lat: 39.1, lon: 21.8 },
    { type: 'country', code: 'PT', name: 'Portugal', lat: 39.4, lon: -8.2 },
    { type: 'country', code: 'IS', name: 'Island', lat: 64.9, lon: -18.0 },
    { type: 'country', code: 'TR', name: 'Türkei', lat: 39.0, lon: 35.0 },

    // --- NORDAMERIKA (Regionen wegen Zeitverschiebung) ---
    { type: 'region', code: 'US.NY', name: 'USA Ost', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.FL', name: 'USA Südost', lat: 27.6, lon: -81.5 },
    { type: 'region', code: 'US.TX', name: 'USA Süd', lat: 31.0, lon: -100.0 },
    { type: 'region', code: 'US.CO', name: 'USA Mitte', lat: 39.0, lon: -105.5 },
    { type: 'region', code: 'US.CA', name: 'USA West', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'US.AK', name: 'Alaska', lat: 64.0, lon: -152.0 },
    { type: 'region', code: 'US.HI', name: 'Hawaii', lat: 21.3, lon: -157.8 },
    { type: 'region', code: 'CA.ON', name: 'Kanada Ost', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.BC', name: 'Kanada West', lat: 53.7, lon: -127.6 },
    { type: 'country', code: 'MX', name: 'Mexiko', lat: 23.6, lon: -102.5 },

    // --- SÜDAMERIKA ---
    { type: 'country', code: 'BR', name: 'Brasilien', lat: -14.2, lon: -51.9 },
    { type: 'country', code: 'AR', name: 'Argentinien', lat: -38.4, lon: -63.6 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.7, lon: -71.5 },
    { type: 'country', code: 'CO', name: 'Kolumbien', lat: 4.6, lon: -74.1 },
    { type: 'country', code: 'PE', name: 'Peru', lat: -9.2, lon: -75.0 },

    // --- ASIEN ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.3 },
    { type: 'country', code: 'KR', name: 'Südkorea', lat: 35.9, lon: 127.8 },
    { type: 'country', code: 'CN', name: 'China Ost', lat: 31.2, lon: 121.5 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.9, lon: 100.9 },
    { type: 'country', code: 'VN', name: 'Vietnam', lat: 14.1, lon: 108.3 },
    { type: 'country', code: 'IN', name: 'Indien', lat: 20.6, lon: 78.9 },
    { type: 'country', code: 'ID', name: 'Indonesien', lat: -0.8, lon: 113.9 },
    { type: 'country', code: 'PH', name: 'Philippinen', lat: 12.9, lon: 121.8 },

    // --- OZEANIEN ---
    { type: 'region', code: 'AU.NSW', name: 'Australien Ost', lat: -32.0, lon: 147.0 },
    { type: 'region', code: 'AU.WA', name: 'Australien West', lat: -26.0, lon: 121.0 },
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.9 },

    // --- AFRIKA ---
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.6, lon: 22.9 },
    { type: 'country', code: 'EG', name: 'Ägypten', lat: 26.8, lon: 30.8 },
    { type: 'country', code: 'MA', name: 'Marokko', lat: 31.8, lon: -7.1 },
    { type: 'country', code: 'KE', name: 'Kenia', lat: -0.0, lon: 37.9 }
];

// ========================================
// LOGIK & API
// ========================================

async function fetchWebcamsForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=50&include=location,images`;
    
    try {
        const response = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
        const data = await response.json();
        // Pfad-Korrektur basierend auf unserem Debug
        return data.webcams || [];
    } catch (e) {
        return [];
    }
}

async function getGoldenHourWebcams() {
    const now = new Date();
    
    // 1. Welche Gebiete sind gerade "dran"?
    const activeTargets = TARGETS.filter(t => {
        const sunPos = SunCalc.getPosition(now, t.lat, t.lon);
        const alt = sunPos.altitude * 180 / Math.PI;
        return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
    });

    console.log(`\n🌍 Globaler Scan: ${activeTargets.length} Gebiete aktiv.`);

    // 2. Abfragen starten
    const results = await Promise.all(activeTargets.map(t => fetchWebcamsForTarget(t)));
    
    // 3. Filtern & Zusammenführen
    const allCams = results.flat();
    const finalSelection = allCams.filter(w => {
        if (!w.location) return false;
        const sunPos = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
        const alt = sunPos.altitude * 180 / Math.PI;
        return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
    });

    // Dubletten entfernen
    return Array.from(new Map(finalSelection.map(c => [c.webcamId, c])).values());
}

app.get('/api/webcams', async (req, res) => {
    const cams = await getGoldenHourWebcams();
    res.json({ webcams: cams, count: cams.length });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend läuft auf Port ${PORT}`));
