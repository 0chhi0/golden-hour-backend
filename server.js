import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// KONFIGURATION
const GOLDEN_HOUR_MIN = -8; 
const GOLDEN_HOUR_MAX = 8;  
const PRE_CHECK_WINDOW = 20; 
const LIMIT_PER_REGION = 50; 

const TARGETS = [
    // --- AUSTRALIEN ---
    { type: 'region', code: 'AU.WA', name: 'Western Australia', lat: -25.0, lon: 122.0 },
    { type: 'region', code: 'AU.NT', name: 'Northern Territory', lat: -19.4, lon: 133.3 },
    { type: 'region', code: 'AU.SA', name: 'South Australia', lat: -30.0, lon: 135.0 },
    { type: 'region', code: 'AU.QLD', name: 'Queensland', lat: -20.9, lon: 142.7 },
    { type: 'region', code: 'AU.NSW', name: 'New South Wales', lat: -31.2, lon: 146.9 },
    { type: 'region', code: 'AU.VIC', name: 'Victoria', lat: -37.4, lon: 144.9 },
    { type: 'region', code: 'AU.TAS', name: 'Tasmania', lat: -42.0, lon: 146.6 },

    // --- CHINA ---
    { type: 'region', code: 'CN.22', name: 'Beijing/Ostchina', lat: 39.9, lon: 116.4 },
    { type: 'region', code: 'CN.30', name: 'Guangdong/Südchina', lat: 23.1, lon: 113.2 },
    { type: 'region', code: 'CN.13', name: 'Xinjiang/Westchina', lat: 43.8, lon: 87.6 },
    { type: 'region', code: 'CN.14', name: 'Tibet', lat: 29.6, lon: 91.1 },
    { type: 'region', code: 'CN.23', name: 'Shanghai Region', lat: 31.2, lon: 121.4 },
    { type: 'region', code: 'CN.08', name: 'Heilongjiang/Nordost', lat: 45.7, lon: 126.6 },
    
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

    // --- KANADA ---
    { type: 'region', code: 'CA.NL', name: 'Newfoundland and Labrador', lat: 47.6, lon: -52.7 },
    { type: 'region', code: 'CA.PE', name: 'Prince Edward Island', lat: 46.5, lon: -63.4 },
    { type: 'region', code: 'CA.NS', name: 'Nova Scotia', lat: 44.7, lon: -63.6 },
    { type: 'region', code: 'CA.NB', name: 'New Brunswick', lat: 46.6, lon: -66.6 },
    { type: 'region', code: 'CA.QC', name: 'Quebec', lat: 52.9, lon: -73.5 },
    { type: 'region', code: 'CA.ON', name: 'Ontario', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.MB', name: 'Manitoba', lat: 53.7, lon: -98.8 },
    { type: 'region', code: 'CA.SK', name: 'Saskatchewan', lat: 52.9, lon: -106.5 },
    { type: 'region', code: 'CA.AB', name: 'Alberta', lat: 53.9, lon: -116.5 },
    { type: 'region', code: 'CA.BC', name: 'British Columbia', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.YT', name: 'Yukon', lat: 63.6, lon: -135.8 },
    { type: 'region', code: 'CA.NT', name: 'Northwest Territories', lat: 64.8, lon: -119.1 },
    { type: 'region', code: 'CA.NU', name: 'Nunavut', lat: 70.3, lon: -92.2 },
  
    // --- MITTELAMERIKA ---
    { type: 'country', code: 'CR', name: 'Costa Rica', lat: 9.7, lon: -83.7 },
    { type: 'country', code: 'PA', name: 'Panama', lat: 8.5, lon: -80.1 },
    { type: 'country', code: 'CU', name: 'Kuba', lat: 21.5, lon: -77.7 },
    { type: 'country', code: 'DO', name: 'Dominikanische Rep.', lat: 18.7, lon: -70.1 },

    // --- MEXIKO ---
    { type: 'region', code: 'MX.ROO', name: 'Quintana Roo (Cancun)', lat: 19.1, lon: -87.5 },
    { type: 'region', code: 'MX.MEX', name: 'Zentral-Mexiko', lat: 19.4, lon: -99.1 },
    { type: 'region', code: 'MX.BCN', name: 'Baja California', lat: 30.5, lon: -115.1 },
    { type: 'region', code: 'MX.JAL', name: 'Jalisco (Pazifik)', lat: 20.6, lon: -103.3 },

    // --- SÜDAMERIKA ---
    { type: 'region', code: 'BR.SP', name: 'São Paulo', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'BR.AM', name: 'Amazonas', lat: -3.4, lon: -60.0 },
    { type: 'region', code: 'BR.RJ', name: 'Rio de Janeiro', lat: -22.9, lon: -43.1 },
    { type: 'country', code: 'AR', name: 'Argentinien', lat: -38.4, lon: -63.6 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.6, lon: -71.5 },
    { type: 'country', code: 'PE', name: 'Peru', lat: -9.1, lon: -75.0 },
    { type: 'country', code: 'CO', name: 'Kolumbien', lat: 4.5, lon: -74.0 },
    { type: 'country', code: 'EC', name: 'Ecuador', lat: -1.8, lon: -78.1 },
    { type: 'country', code: 'BO', name: 'Bolivien', lat: -16.2, lon: -63.5 },
    { type: 'country', code: 'UY', name: 'Uruguay', lat: -32.5, lon: -55.7 },
    { type: 'country', code: 'PY', name: 'Paraguay', lat: -23.4, lon: -58.4 },

    // --- RUSSLAND ---
    { type: 'region', code: 'RU.MOW', name: 'Moskau', lat: 55.7, lon: 37.6 },
    { type: 'region', code: 'RU.SPE', name: 'St. Petersburg', lat: 59.9, lon: 30.3 },
    { type: 'region', code: 'RU.KHA', name: 'Chabarowsk', lat: 48.5, lon: 135.0 },
    { type: 'region', code: 'RU.KAM', name: 'Kamtschatka', lat: 53.0, lon: 158.6 },

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
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        console.log(`🌍 Globaler Scan: ${activeTargets.length} Gebiete im Fenster.`);
        
        const results = await Promise.all(activeTargets.map(fetchForTarget));
        const allCams = results.flat();

        const finalResults = allCams.filter(w => {
            if (!w.location) return false;
            const sunPos = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            const alt = sunPos.altitude * 180 / Math.PI;
            
            // LOGGING: Hier siehst du genau, was mit den Kameras passiert
            if (w.location.country === 'CA') {
                console.log(`🇨🇦 Check Cam ${w.webcamId} in ${w.location.city || 'Canada'}: Sonnenhöhe ${alt.toFixed(2)}°`);
            }

            w.sunAlt = alt;
            w.isPremium = (alt >= -6 && alt <= 6);
            
            const isMatch = alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
            
            if (w.location.country === 'CA' && !isMatch) {
                console.log(`   -> ❌ Aussortiert (nicht im Bereich ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°)`);
            } else if (w.location.country === 'CA') {
                console.log(`   -> ✅ Treffer!`);
            }

            return isMatch;
        });

        const unique = Array.from(new Map(finalResults.map(c => [c.webcamId, c])).values());
        console.log(`✅ ${unique.length} Webcams insgesamt in der Golden Hour gefunden.`);

        res.json({ status: "success", meta: { total: unique.length }, webcams: unique });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend aktiv auf Port ${PORT}`));
