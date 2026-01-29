import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Konfiguration nach deinem Feedback
const GOLDEN_HOUR_MIN = -9; 
const GOLDEN_HOUR_MAX = 9;  
const PRE_CHECK_WINDOW = 14; 
const LIMIT_PER_REGION = 50; // Dein Wunsch: Top 50

const TARGETS = [
    // --- AUSTRALIEN (Vollständig für Westaustralien-Lücke) ---
    { type: 'region', code: 'AU.WA', name: 'Western Australia', lat: -25.0, lon: 122.0 },
    { type: 'region', code: 'AU.NT', name: 'Northern Territory', lat: -19.4, lon: 133.3 },
    { type: 'region', code: 'AU.SA', name: 'South Australia', lat: -30.0, lon: 135.0 },
    { type: 'region', code: 'AU.QLD', name: 'Queensland', lat: -20.9, lon: 142.7 },
    { type: 'region', code: 'AU.NSW', name: 'New South Wales', lat: -31.2, lon: 146.9 },
    { type: 'region', code: 'AU.VIC', name: 'Victoria', lat: -37.4, lon: 144.9 },
    { type: 'region', code: 'AU.TAS', name: 'Tasmania', lat: -42.0, lon: 146.6 },

    // --- BRASILIEN (Vollständig) ---
    { type: 'region', code: 'BR.AM', name: 'Amazonas', lat: -3.4, lon: -60.0 },
    { type: 'region', code: 'BR.SP', name: 'São Paulo', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'BR.RJ', name: 'Rio de Janeiro', lat: -22.9, lon: -43.1 },
    { type: 'region', code: 'BR.BA', name: 'Bahia', lat: -12.9, lon: -38.5 },
    { type: 'region', code: 'BR.MT', name: 'Mato Grosso', lat: -12.6, lon: -55.4 },
    { type: 'region', code: 'BR.PE', name: 'Pernambuco', lat: -8.8, lon: -36.9 },
    { type: 'region', code: 'BR.RS', name: 'Rio Grande do Sul', lat: -30.0, lon: -51.2 },
    { type: 'region', code: 'BR.MG', name: 'Minas Gerais', lat: -18.5, lon: -44.5 },
    { type: 'region', code: 'BR.SC', name: 'Santa Catarina', lat: -27.2, lon: -50.4 },

    // --- KANADA ---
    { type: 'region', code: 'CA.BC', name: 'British Columbia', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.AB', name: 'Alberta', lat: 53.9, lon: -116.5 },
    { type: 'region', code: 'CA.ON', name: 'Ontario', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.QC', name: 'Quebec', lat: 52.9, lon: -73.5 },

    // --- ASIEN & REST ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
    { type: 'country', code: 'VN', name: 'Vietnam', lat: 14.0, lon: 108.2 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.8, lon: 100.9 },
    { type: 'country', code: 'ID', name: 'Indonesien', lat: -0.7, lon: 113.9 },
    { type: 'country', code: 'GL', name: 'Grönland', lat: 71.7, lon: -42.6 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.4, lon: 8.4 },
    { type: 'country', code: 'IS', name: 'Island', lat: 64.9, lon: -18.0 }
    // Liste kann beliebig erweitert werden
];

async function fetchForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    // Top 50 Abfrage
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
            const alt = SunCalc.getPosition(now, t.lat, t.lon).altitude * 180 / Math.PI;
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        const results = await Promise.all(activeTargets.map(fetchForTarget));
        const allCams = results.flat();

        const filtered = allCams.filter(w => {
            if (!w.location) return false;
            const alt = SunCalc.getPosition(now, w.location.latitude, w.location.longitude).altitude * 180 / Math.PI;
            
            w.sunAlt = alt;
            w.isPremium = (alt >= -6 && alt <= 6);
            
            // Nur Kameras mit gültigem Bild
            return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX && w.images?.current?.preview;
        });

        // Dubletten-Check
        const unique = Array.from(new Map(filtered.map(c => [c.webcamId, c])).values());

        res.json({
            status: "success",
            meta: { total: unique.length, regionsScanned: activeTargets.length },
            webcams: unique
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend läuft auf Port ${PORT}`));
