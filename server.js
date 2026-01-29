import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// KONFIGURATION FÜR MAXIMALE TREFFERQUOTE
const GOLDEN_HOUR_MIN = -9; 
const GOLDEN_HOUR_MAX = 9;  
const PRE_CHECK_WINDOW = 20; // Größeres Fenster, damit keine Region zu früh abgeschaltet wird
const LIMIT_PER_REGION = 50; 

const TARGETS = [
    // --- AUSTRALIEN (Einzeln nach Bundesstaaten, um West-Ost-Lücke zu schließen) ---
    { type: 'region', code: 'AU.WA', name: 'Western Australia', lat: -25.0, lon: 122.0 },
    { type: 'region', code: 'AU.NT', name: 'Northern Territory', lat: -19.4, lon: 133.3 },
    { type: 'region', code: 'AU.SA', name: 'South Australia', lat: -30.0, lon: 135.0 },
    { type: 'region', code: 'AU.QLD', name: 'Queensland', lat: -20.9, lon: 142.7 },
    { type: 'region', code: 'AU.NSW', name: 'New South Wales', lat: -31.2, lon: 146.9 },
    { type: 'region', code: 'AU.VIC', name: 'Victoria', lat: -37.4, lon: 144.9 },

    // --- SÜDAMERIKA (Massiv ausgebaut) ---
    { type: 'country', code: 'BR', name: 'Brasilien', lat: -14.2, lon: -51.9 },
    { type: 'region', code: 'BR.AM', name: 'Amazonas', lat: -3.4, lon: -60.0 },
    { type: 'region', code: 'BR.SP', name: 'Sao Paulo', lat: -23.5, lon: -46.6 },
    { type: 'country', code: 'AR', name: 'Argentinien', lat: -38.4, lon: -63.6 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.6, lon: -71.5 },
    { type: 'country', code: 'PE', name: 'Peru', lat: -9.1, lon: -75.0 },
    { type: 'country', code: 'CO', name: 'Kolumbien', lat: 4.5, lon: -74.0 },

    // --- NORDAMERIKA (Lückenlos) ---
    { type: 'region', code: 'CA.BC', name: 'British Columbia', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.AB', name: 'Alberta', lat: 53.9, lon: -116.5 },
    { type: 'region', code: 'CA.ON', name: 'Ontario', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.QC', name: 'Quebec', lat: 52.9, lon: -73.5 },
    { type: 'region', code: 'US.CA', name: 'California', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'US.NY', name: 'New York', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.FL', name: 'Florida', lat: 27.6, lon: -81.5 },
    { type: 'region', code: 'US.TX', name: 'Texas', lat: 31.9, lon: -99.9 },
    { type: 'region', code: 'US.AK', name: 'Alaska', lat: 63.5, lon: -148.9 },

    // --- EUROPA & AFRIKA ---
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.4, lon: 8.4 },
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.5, lon: 22.9 },
    { type: 'country', code: 'IS', name: 'Island', lat: 64.9, lon: -18.0 },

    // --- ASIEN ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
    { type: 'country', code: 'CN', name: 'China', lat: 35.8, lon: 104.1 },
    { type: 'country', code: 'RU', name: 'Russland', lat: 61.5, lon: 105.3 },
    { type: 'country', code: 'IN', name: 'Indien', lat: 20.5, lon: 78.9 },
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.8 }
];

async function fetchForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'regions';
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
            // Wir lassen die API großzügiger suchen
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        console.log(`🌍 Globaler Scan: ${activeTargets.length} Gebiete aktiv.`);
        
        const results = await Promise.all(activeTargets.map(fetchForTarget));
        const allCams = results.flat();

        const finalResults = allCams.filter(w => {
            if (!w.location) return false;
            const sunPos = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            const alt = sunPos.altitude * 180 / Math.PI;
            
            w.sunAlt = alt;
            w.isPremium = (alt >= -6 && alt <= 6);
            
            // Mathematisch exakte Filterung für die Anzeige
            return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
        });

        const unique = Array.from(new Map(finalResults.map(c => [c.webcamId, c])).values());
        console.log(`✅ ${unique.length} Webcams in der Golden Hour gefunden.`);

        res.json({ status: "success", meta: { total: unique.length }, webcams: unique });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend aktiv auf Port ${PORT}`));
