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
     // --- AUSTRALIEN (Rein Numerische Windy/ISO-Codes) ---
    { type: 'region', code: 'AU.08', name: 'Western Australia', lat: -25.0, lon: 122.0 },
    { type: 'region', code: 'AU.03', name: 'Northern Territory', lat: -19.4, lon: 133.3 },
    { type: 'region', code: 'AU.05', name: 'South Australia', lat: -30.0, lon: 135.0 },
    { type: 'region', code: 'AU.04', name: 'Queensland', lat: -20.9, lon: 142.7 },
    { type: 'region', code: 'AU.02', name: 'New South Wales', lat: -31.2, lon: 146.9 },
    { type: 'region', code: 'AU.07', name: 'Victoria', lat: -37.4, lon: 144.9 },
    { type: 'region', code: 'AU.06', name: 'Tasmania', lat: -42.0, lon: 146.6 },
    { type: 'region', code: 'AU.01', name: 'Australian Capital Territory', lat: -35.3, lon: 149.1 },

  // --- CHINA (Optimiert nach Hoppscotch-Test) ---
    { type: 'region', code: 'CN.22', name: 'Beijing Region', lat: 39.9, lon: 116.4 },
    { type: 'region', code: 'R913110', name: 'Hong Kong (Sonderzone)', lat: 22.3, lon: 114.2 },
    { type: 'region', code: 'R1867188', name: 'Macau (Sonderzone)', lat: 22.2, lon: 113.5 },
    { type: 'region', code: 'CN.30', name: 'Guangdong (Südchina)', lat: 23.1, lon: 113.2 },
    { type: 'region', code: 'CN.08', name: 'Heilongjiang (Nordost)', lat: 45.8, lon: 126.6 },
    { type: 'region', code: 'CN.13', name: 'Xinjiang (Westchina)', lat: 43.5, lon: 87.2 },
    { type: 'region', code: 'CN.06', name: 'Qinghai', lat: 37.3, lon: 102.0 },
    { type: 'region', code: 'CN.32', name: 'Sichuan (Chengdu)', lat: 30.6, lon: 104.1 },
    { type: 'region', code: 'CN.04', name: 'Jiangsu (Nanjing)', lat: 32.1, lon: 118.8 },
    { type: 'region', code: 'CN.33', name: 'Chongqing', lat: 29.6, lon: 106.5 },
    { type: 'region', code: 'CN.07', name: 'Fujian', lat: 27.6, lon: 117.9 },
    { type: 'region', code: 'CN.10', name: 'Hebei', lat: 38.3, lon: 116.8 },
    
    // --- ASIEN ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
    { type: 'country', code: 'KR', name: 'Südkorea', lat: 35.9, lon: 127.7 },
    { type: 'country', code: 'VN', name: 'Vietnam', lat: 14.0, lon: 108.2 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.8, lon: 100.9 },
    { type: 'country', code: 'ID', name: 'Indonesien', lat: -0.7, lon: 113.9 },
    { type: 'country', code: 'PH', name: 'Philippinen', lat: 12.8, lon: 121.7 },
    { type: 'country', code: 'MY', name: 'Malaysia', lat: 4.2, lon: 101.9 },
    { type: 'country', code: 'SG', name: 'Singapur', lat: 1.3, lon: 103.8 },
    { type: 'country', code: 'TR', name: 'Türkei', lat: 38.9, lon: 35.2 },
    { type: 'country', code: 'AE', name: 'VAE', lat: 23.4, lon: 53.8 },
    { type: 'country', code: 'TW', name: 'Taiwan', lat: 23.6, lon: 120.9 },
    { type: 'country', code: 'LK', name: 'Sri Lanka', lat: 7.8, lon: 80.7 },
    { type: 'country', code: 'IL', name: 'Israel', lat: 31.0, lon: 34.8 },
    { type: 'country', code: 'GE', name: 'Georgien', lat: 42.3, lon: 43.3 },
    { type: 'country', code: 'KZ', name: 'Kasachstan', lat: 48.0, lon: 66.9 },
    { type: 'country', code: 'NP', name: 'Nepal (Himalaya)', lat: 28.3, lon: 84.1 },

    // --- INDIEN ---
    { type: 'region', code: 'IN.16', name: 'Maharashtra/West (Mumbai)', lat: 19.0, lon: 72.8 },
    { type: 'region', code: 'IN.25', name: 'Westbengalen/Ost (Kalkutta)', lat: 22.5, lon: 88.3 },
    { type: 'region', code: 'IN.07', name: 'Delhi/Nordindien', lat: 28.6, lon: 77.2 },
    { type: 'region', code: 'IN.22', name: 'Tamil Nadu/Südindien', lat: 13.0, lon: 80.2 },
    { type: 'region', code: 'IN.14', name: 'Karnataka/Zentral-Süd', lat: 12.9, lon: 77.5 },

    // --- USA ---
    { type: 'region', code: 'US.CA', name: 'California', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'US.OR', name: 'Oregon', lat: 43.8, lon: -120.5 },
    { type: 'region', code: 'US.WA', name: 'Washington State', lat: 47.7, lon: -120.7 },
    { type: 'region', code: 'US.AK', name: 'Alaska', lat: 63.5, lon: -148.9 },
    { type: 'region', code: 'US.HI', name: 'Hawaii', lat: 19.8, lon: -155.5 },
    { type: 'region', code: 'US.FL', name: 'Florida', lat: 27.6, lon: -81.5 },
    { type: 'region', code: 'US.NY', name: 'New York', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.TX', name: 'Texas', lat: 31.9, lon: -99.9 },
    { type: 'region', code: 'US.CO', name: 'Colorado', lat: 39.5, lon: -105.7 },

    // --- KANADA (Numerische Windy-Region-Codes) ---
    { type: 'region', code: 'CA.05', name: 'Newfoundland and Labrador', lat: 47.6, lon: -52.7 },
    { type: 'region', code: 'CA.09', name: 'Prince Edward Island', lat: 46.5, lon: -63.4 },
    { type: 'region', code: 'CA.07', name: 'Nova Scotia', lat: 44.7, lon: -63.6 },
    { type: 'region', code: 'CA.04', name: 'New Brunswick', lat: 46.6, lon: -66.6 },
    { type: 'region', code: 'CA.10', name: 'Quebec', lat: 52.9, lon: -73.5 },
    { type: 'region', code: 'CA.08', name: 'Ontario', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.03', name: 'Manitoba', lat: 53.7, lon: -98.8 },
    { type: 'region', code: 'CA.11', name: 'Saskatchewan', lat: 52.9, lon: -106.5 },
    { type: 'region', code: 'CA.01', name: 'Alberta', lat: 53.9, lon: -116.5 },
    { type: 'region', code: 'CA.02', name: 'British Columbia', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.12', name: 'Yukon', lat: 63.6, lon: -135.8 },
    { type: 'region', code: 'CA.06', name: 'Northwest Territories', lat: 64.8, lon: -119.1 },
    { type: 'region', code: 'CA.13', name: 'Nunavut', lat: 70.3, lon: -92.2 },
  
    // --- MITTELAMERIKA ---
    { type: 'country', code: 'CR', name: 'Costa Rica', lat: 9.7, lon: -83.7 },
    { type: 'country', code: 'PA', name: 'Panama', lat: 8.5, lon: -80.1 },
    { type: 'country', code: 'CU', name: 'Kuba', lat: 21.5, lon: -77.7 },
    { type: 'country', code: 'DO', name: 'Dominikanische Rep.', lat: 18.7, lon: -70.1 },

    // --- MEXIKO (Numerische Windy/ISO-Codes) ---
    { type: 'region', code: 'MX.23', name: 'Quintana Roo (Cancun)', lat: 19.1, lon: -87.5 },
    { type: 'region', code: 'MX.09', name: 'CDMX / Zentral-Mexiko', lat: 19.4, lon: -99.1 },
    { type: 'region', code: 'MX.02', name: 'Baja California Norte', lat: 30.5, lon: -115.1 },
    { type: 'region', code: 'MX.14', name: 'Jalisco (Pazifik)', lat: 20.6, lon: -103.3 },
    
    // --- BRASILIEN (Numerische ISO-Codes) ---
    { type: 'region', code: 'BR.27', name: 'São Paulo', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'BR.21', name: 'Rio de Janeiro', lat: -22.9, lon: -43.1 },
    { type: 'region', code: 'BR.04', name: 'Amazonas', lat: -3.4, lon: -60.0 },
    { type: 'region', code: 'BR.05', name: 'Bahia (Nordost)', lat: -12.9, lon: -38.5 },
    { type: 'region', code: 'BR.13', name: 'Minas Gerais', lat: -18.5, lon: -44.5 },
    { type: 'region', code: 'BR.16', name: 'Paraná (Süden)', lat: -24.8, lon: -51.3 },
        
    // --- SÜDAMERIKA ---
    { type: 'country', code: 'AR', name: 'Argentinien', lat: -38.4, lon: -63.6 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.6, lon: -71.5 },
    { type: 'country', code: 'PE', name: 'Peru', lat: -9.1, lon: -75.0 },
    { type: 'country', code: 'CO', name: 'Kolumbien', lat: 4.5, lon: -74.0 },
    { type: 'country', code: 'EC', name: 'Ecuador', lat: -1.8, lon: -78.1 },
    { type: 'country', code: 'BO', name: 'Bolivien', lat: -16.2, lon: -63.5 },
    { type: 'country', code: 'UY', name: 'Uruguay', lat: -32.5, lon: -55.7 },
    { type: 'country', code: 'PY', name: 'Paraguay', lat: -23.4, lon: -58.4 },

    // --- RUSSLAND (Numerische Windy/ISO-Codes für 11 Zeitzonen) ---
    { type: 'region', code: 'RU.48', name: 'Moskau (Stadt)', lat: 55.7, lon: 37.6 },
    { type: 'region', code: 'RU.66', name: 'St. Petersburg (Stadt)', lat: 59.9, lon: 30.3 },
    { type: 'region', code: 'RU.75', name: 'Tatarstan (Kasan/Wolga)', lat: 55.8, lon: 49.1 },
    { type: 'region', code: 'RU.71', name: 'Swerdlowsk (Jekaterinburg/Ural)', lat: 56.8, lon: 60.6 },
    { type: 'region', code: 'RU.54', name: 'Nowosibirsk (Sibirien)', lat: 55.0, lon: 82.9 },
    { type: 'region', code: 'RU.22', name: 'Irkutsk (Baikalsee)', lat: 52.3, lon: 104.3 },
    { type: 'region', code: 'RU.30', name: 'Kamtschatka (Fernost)', lat: 53.0, lon: 158.6 },
    { type: 'region', code: 'RU.20', name: 'Region Chabarowsk', lat: 48.5, lon: 135.1 },
    { type: 'region', code: 'RU.59', name: 'Region Primorje (Wladiwostok)', lat: 43.1, lon: 131.9 },

    // --- EUROPA ---
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 },
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 14.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.2, lon: 2.2 },
    { type: 'country', code: 'IT', name: 'Italien', lat: 41.8, lon: 12.5 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'PT', name: 'Portugal', lat: 39.3, lon: -8.2 },
    { type: 'country', code: 'GB', name: 'UK', lat: 55.3, lon: -3.4 },
    { type: 'country', code: 'IE', name: 'Irland', lat: 53.4, lon: -8.2 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.4, lon: 8.4 },
    { type: 'country', code: 'SE', name: 'Schweden', lat: 60.1, lon: 18.6 },
    { type: 'country', code: 'FI', name: 'Finnland', lat: 61.9, lon: 25.7 },
    { type: 'country', code: 'IS', name: 'Island', lat: 64.9, lon: -18.0 },
    { type: 'country', code: 'PL', name: 'Polen', lat: 51.9, lon: 19.1 },
    { type: 'country', code: 'CZ', name: 'Tschechien', lat: 49.8, lon: 15.4 },
    { type: 'country', code: 'GR', name: 'Griechenland', lat: 39.0, lon: 21.8 },
    { type: 'country', code: 'HR', name: 'Kroatien', lat: 45.1, lon: 15.2 },
    { type: 'country', code: 'RO', name: 'Rumänien', lat: 45.9, lon: 24.9 },
    { type: 'country', code: 'HU', name: 'Ungarn', lat: 47.1, lon: 19.5 },

    // --- AFRIKA ---
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.5, lon: 22.9 },
    { type: 'country', code: 'MA', name: 'Marokko', lat: 31.7, lon: -7.0 },
    { type: 'country', code: 'EG', name: 'Ägypten', lat: 26.8, lon: 30.8 },
    { type: 'country', code: 'DZ', name: 'Algerien', lat: 28.0, lon: 1.6 },
    { type: 'country', code: 'KE', name: 'Kenia', lat: -0.02, lon: 37.9 },
    { type: 'country', code: 'NA', name: 'Namibia', lat: -22.9, lon: 18.4 },
    { type: 'country', code: 'SN', name: 'Senegal', lat: 14.4, lon: -14.4 },

    // --- WEITERE LÄNDER ---
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.8 },
    { type: 'country', code: 'GL', name: 'Grönland', lat: 71.7, lon: -42.6 },

];

async function fetchForTarget(target) {
    const param = target.type === 'country' ? 'countries' : 'region';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=${LIMIT_PER_REGION}&include=location,images,urls,player`;
    try {
        const response = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
        const data = await response.json();
        return { 
            code: target.code, 
            name: target.name, 
            lat: target.lat, 
            lon: target.lon, 
            webcams: data.webcams || [] 
        };
    } catch (e) { 
        return { code: target.code, name: target.name, lat: target.lat, lon: target.lon, webcams: [] }; 
    }
}

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        
        // 1. Pre-Check: Welche Regionen kommen theoretisch in Frage?
        const activeTargets = TARGETS.filter(t => {
            const sunPos = SunCalc.getPosition(now, t.lat, t.lon);
            const alt = sunPos.altitude * 180 / Math.PI;
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        // 2. Windy Abfrage
        const results = await Promise.all(activeTargets.map(fetchForTarget));
        
        const debugInfo = [];
        const finalCams = [];

        // 3. Verarbeitung & Echte Zählung
        results.forEach(resObj => {
            const sunPosRef = SunCalc.getPosition(now, resObj.lat, resObj.lon);
            const altRef = sunPosRef.altitude * 180 / Math.PI;

            let camsInGoldenHour = 0;

            resObj.webcams.forEach(w => {
                if (w.location) {
                    const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
                    const a = s.altitude * 180 / Math.PI;
                    
                    if (a >= GOLDEN_HOUR_MIN && a <= GOLDEN_HOUR_MAX) {
                        w.sunAlt = a;
                        w.isPremium = (a >= -6 && a <= 6);
                        finalCams.push(w);
                        camsInGoldenHour++;
                    }
                }
            });

            // Hier wird die REALE Menge geloggt
            debugInfo.push({
                name: resObj.name,
                sunAlt: Number(altRef.toFixed(1)),
                camsFetched: resObj.webcams.length, // Reale Menge von Windy (z.B. 25)
                camsFinal: camsInGoldenHour,        // Wie viele den Filter bestanden haben
                preCheck: true
            });
        });

        // Unique Filter (falls Kameras in zwei Regionen auftauchen)
        const unique = Array.from(new Map(finalCams.map(c => [c.webcamId, c])).values());

        res.json({ 
            status: "success", 
            meta: { total: unique.length }, 
            webcams: unique,
            debug: debugInfo 
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend läuft auf Port ${PORT}`));
