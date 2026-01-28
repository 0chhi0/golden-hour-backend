import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Sonnenstand-Konfiguration
const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const TRIGGER_WINDOW = 12; // Grober Vor-Check (+/- 12 Grad)

// ========================================
// STRATEGISCHE ZIEL-LISTE (Länder & Regionen)
// ========================================
// Wir definieren Referenzpunkte (Lat/Lon), um zu prüfen, ob die Region gerade im Licht steht.
const SEARCH_TARGETS = [
    // Europa
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 14.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 },
    { type: 'country', code: 'IT', name: 'Italien', lat: 41.8, lon: 12.5 },
    { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.2, lon: 2.2 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'GB', name: 'UK', lat: 55.3, lon: -3.4 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.4, lon: 8.4 },
    
    // Nordamerika (Regionen für die Zeitverschiebung)
    { type: 'region', code: 'US.NY', name: 'USA Ost (NY)', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.FL', name: 'USA Florida', lat: 27.6, lon: -81.5 },
    { type: 'region', code: 'US.TX', name: 'USA Texas', lat: 31.9, lon: -99.9 },
    { type: 'region', code: 'US.CO', name: 'USA Colorado', lat: 39.5, lon: -105.7 },
    { type: 'region', code: 'US.CA', name: 'USA West (CA)', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'CA.BC', name: 'Kanada West', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.ON', name: 'Kanada Ost', lat: 51.2, lon: -85.3 },

    // Asien & Ozeanien
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
    { type: 'country', code: 'AU', name: 'Australien Ost', lat: -33.8, lon: 151.2 },
    { type: 'region', code: 'AU.WA', name: 'Australien West', lat: -25.0, lon: 121.0 },
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.8 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.8, lon: 100.9 },

    // Südamerika & Afrika
    { type: 'country', code: 'BR', name: 'Brasilien', lat: -14.2, lon: -51.9 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.6, lon: -71.5 },
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.5, lon: 22.9 },
    { type: 'country', code: 'MA', name: 'Marokko', lat: 31.7, lon: -7.0 }
];

app.get('/webcams', async (req, res) => {
    try {
        const now = new Date();
        
        // 1. Identifiziere Länder/Regionen, die POTENZIELL in der Golden Hour sind
        const activeTargets = SEARCH_TARGETS.filter(t => {
            const sunPos = SunCalc.getPosition(now, t.lat, t.lon);
            const alt = sunPos.altitude * (180 / Math.PI);
            return alt >= -TRIGGER_WINDOW && alt <= TRIGGER_WINDOW;
        });

        console.log(`\nAktive Ziele (${activeTargets.length}): ${activeTargets.map(t => t.name).join(', ')}`);

        // 2. API-Anfragen parallel für alle aktiven Ziele starten
        const fetchPromises = activeTargets.map(async (target) => {
            const param = target.type === 'region' ? `region=${target.code}` : `country=${target.code}`;
            const url = `https://api.windy.com/webcams/api/v3/webcams?${param}&limit=30&include=location,images`;
            
            try {
                const response = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
                const data = await response.json();
                return data.webcams || [];
            } catch (e) {
                console.error(`Fehler bei ${target.name}:`, e.message);
                return [];
            }
        });

        const resultsArray = await Promise.all(fetchPromises);
        const rawWebcams = resultsArray.flat();

        // 3. Präzisions-Filter: Jede Webcam einzeln prüfen
        const goldenHourWebcams = rawWebcams.filter(cam => {
            const sunPos = SunCalc.getPosition(now, cam.location.latitude, cam.location.longitude);
            const alt = sunPos.altitude * (180 / Math.PI);
            return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
        });

        // 4. Dubletten entfernen (falls Regionen und Länder überlappen)
        const uniqueWebcams = Array.from(new Map(goldenHourWebcams.map(c => [c.webcamId, c])).values());

        res.json({
            meta: {
                timestamp: now.toISOString(),
                targets_scanned: activeTargets.length,
                raw_found: rawWebcams.length,
                filtered_total: uniqueWebcams.length
            },
            webcams: uniqueWebcams
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug-Endpunkt bleibt für Notfälle erhalten
app.get('/debug', (req, res) => res.json({ status: "online", targets: SEARCH_TARGETS.length }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend läuft auf Port ${PORT}`));
