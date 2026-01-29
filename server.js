import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Konfiguration
const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PRE_CHECK_WINDOW = 12; 
const LIMIT_PER_REGION = 20;

// ==========================================================
// MASTER TARGET LISTE (Weltweit + Regionen)
// ==========================================================
const TARGETS = [
    // --- NORDAMERIKA (Regionen) ---
    { type: 'region', code: 'GL.QT', name: 'Grönland', lat: 71.7, lon: -42.6 },
    { type: 'region', code: 'CA.AB', name: 'Alberta', lat: 53.9, lon: -116.5 },
    { type: 'region', code: 'CA.BC', name: 'British Columbia', lat: 53.7, lon: -127.6 },
    { type: 'region', code: 'CA.MB', name: 'Manitoba', lat: 53.7, lon: -98.8 },
    { type: 'region', code: 'CA.NB', name: 'New Brunswick', lat: 46.5, lon: -66.3 },
    { type: 'region', code: 'CA.NL', name: 'Newfoundland', lat: 53.1, lon: -57.6 },
    { type: 'region', code: 'CA.NS', name: 'Nova Scotia', lat: 44.6, lon: -63.7 },
    { type: 'region', code: 'CA.ON', name: 'Ontario', lat: 51.2, lon: -85.3 },
    { type: 'region', code: 'CA.QC', name: 'Quebec', lat: 52.9, lon: -73.5 },
    { type: 'region', code: 'CA.SK', name: 'Saskatchewan', lat: 52.9, lon: -106.4 },
    { type: 'region', code: 'US.AL', name: 'Alabama', lat: 32.3, lon: -86.9 },
    { type: 'region', code: 'US.AK', name: 'Alaska', lat: 63.5, lon: -148.9 },
    { type: 'region', code: 'US.AZ', name: 'Arizona', lat: 34.0, lon: -111.0 },
    { type: 'region', code: 'US.CA', name: 'California', lat: 36.7, lon: -119.4 },
    { type: 'region', code: 'US.FL', name: 'Florida', lat: 27.6, lon: -81.5 },
    { type: 'region', code: 'US.NY', name: 'New York', lat: 40.7, lon: -74.0 },
    { type: 'region', code: 'US.TX', name: 'Texas', lat: 31.9, lon: -99.9 },
    { type: 'country', code: 'MX', name: 'Mexiko', lat: 23.6, lon: -102.5 },

    // --- SÜDAMERIKA (Alle Brasilien-Regionen) ---
    { type: 'region', code: 'BR.AC', name: 'Acre', lat: -9.0, lon: -70.0 },
    { type: 'region', code: 'BR.AL', name: 'Alagoas', lat: -9.5, lon: -36.6 },
    { type: 'region', code: 'BR.AP', name: 'Amapá', lat: 1.4, lon: -51.7 },
    { type: 'region', code: 'BR.AM', name: 'Amazonas', lat: -3.4, lon: -60.0 },
    { type: 'region', code: 'BR.BA', name: 'Bahia', lat: -12.9, lon: -38.5 },
    { type: 'region', code: 'BR.CE', name: 'Ceará', lat: -5.2, lon: -39.3 },
    { type: 'region', code: 'BR.DF', name: 'Distrito Federal', lat: -15.7, lon: -47.8 },
    { type: 'region', code: 'BR.ES', name: 'Espírito Santo', lat: -19.1, lon: -40.3 },
    { type: 'region', code: 'BR.GO', name: 'Goiás', lat: -15.8, lon: -49.0 },
    { type: 'region', code: 'BR.MA', name: 'Maranhão', lat: -5.4, lon: -45.2 },
    { type: 'region', code: 'BR.MT', name: 'Mato Grosso', lat: -12.6, lon: -55.4 },
    { type: 'region', code: 'BR.MS', name: 'Mato Grosso do Sul', lat: -20.5, lon: -54.6 },
    { type: 'region', code: 'BR.MG', name: 'Minas Gerais', lat: -18.5, lon: -44.5 },
    { type: 'region', code: 'BR.PA', name: 'Pará', lat: -3.4, lon: -52.2 },
    { type: 'region', code: 'BR.PB', name: 'Paraíba', lat: -7.2, lon: -36.7 },
    { type: 'region', code: 'BR.PR', name: 'Paraná', lat: -24.8, lon: -51.3 },
    { type: 'region', code: 'BR.PE', name: 'Pernambuco', lat: -8.8, lon: -36.9 },
    { type: 'region', code: 'BR.PI', name: 'Piauí', lat: -7.7, lon: -42.7 },
    { type: 'region', code: 'BR.RJ', name: 'Rio de Janeiro', lat: -22.9, lon: -43.1 },
    { type: 'region', code: 'BR.RN', name: 'Rio Grande do Norte', lat: -5.8, lon: -36.5 },
    { type: 'region', code: 'BR.RS', name: 'Rio Grande do Sul', lat: -30.0, lon: -53.5 },
    { type: 'region', code: 'BR.RO', name: 'Rondônia', lat: -11.5, lon: -63.0 },
    { type: 'region', code: 'BR.RR', name: 'Roraima', lat: 2.7, lon: -61.3 },
    { type: 'region', code: 'BR.SC', name: 'Santa Catarina', lat: -27.2, lon: -50.4 },
    { type: 'region', code: 'BR.SP', name: 'São Paulo', lat: -23.5, lon: -46.6 },
    { type: 'region', code: 'BR.SE', name: 'Sergipe', lat: -10.5, lon: -37.3 },
    { type: 'region', code: 'BR.TO', name: 'Tocantins', lat: -10.1, lon: -48.3 },
    { type: 'country', code: 'AR', name: 'Argentinien', lat: -38.4, lon: -63.6 },
    { type: 'country', code: 'CL', name: 'Chile', lat: -35.6, lon: -71.5 },
    { type: 'country', code: 'CO', name: 'Kolumbien', lat: 4.5, lon: -74.0 },
    { type: 'country', code: 'PE', name: 'Peru', lat: -9.1, lon: -75.0 },

    // --- EUROPA ---
    { type: 'country', code: 'DE', name: 'Deutschland', lat: 51.1, lon: 10.4 },
    { type: 'country', code: 'AT', name: 'Österreich', lat: 47.5, lon: 14.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2 },
    { type: 'country', code: 'IT', name: 'Italien', lat: 41.8, lon: 12.5 },
    { type: 'country', code: 'FR', name: 'Frankreich', lat: 46.2, lon: 2.2 },
    { type: 'country', code: 'ES', name: 'Spanien', lat: 40.4, lon: -3.7 },
    { type: 'country', code: 'PT', name: 'Portugal', lat: 39.3, lon: -8.2 },
    { type: 'country', code: 'GB', name: 'UK', lat: 55.3, lon: -3.4 },
    { type: 'country', code: 'NO', name: 'Norwegen', lat: 60.4, lon: 8.4 },
    { type: 'country', code: 'SE', name: 'Schweden', lat: 60.1, lon: 18.6 },
    { type: 'country', code: 'FI', name: 'Finnland', lat: 61.9, lon: 25.7 },
    { type: 'country', code: 'IS', name: 'Island', lat: 64.9, lon: -18.0 },
    { type: 'country', code: 'PL', name: 'Polen', lat: 51.9, lon: 19.1 },
    { type: 'country', code: 'GR', name: 'Griechenland', lat: 39.0, lon: 21.8 },

    // --- ASIEN ---
    { type: 'country', code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2 },
    { type: 'country', code: 'KR', name: 'Südkorea', lat: 35.9, lon: 127.7 },
    { type: 'country', code: 'VN', name: 'Vietnam', lat: 14.0, lon: 108.2 },
    { type: 'country', code: 'TH', name: 'Thailand', lat: 15.8, lon: 100.9 },
    { type: 'country', code: 'IN', name: 'Indien', lat: 20.5, lon: 78.9 },
    { type: 'country', code: 'ID', name: 'Indonesien', lat: -0.7, lon: 113.9 },
    { type: 'country', code: 'PH', name: 'Philippinen', lat: 12.8, lon: 121.7 },
    { type: 'country', code: 'MY', name: 'Malaysia', lat: 4.2, lon: 101.9 },
    { type: 'region', code: 'CN.BJ', name: 'Peking', lat: 39.9, lon: 116.4 },
    { type: 'region', code: 'CN.SH', name: 'Shanghai', lat: 31.2, lon: 121.4 },
    { type: 'region', code: 'CN.GD', name: 'Guangdong', lat: 23.3, lon: 113.2 },
    { type: 'region', code: 'CN.HK', name: 'Hong Kong', lat: 22.3, lon: 114.1 },

    // --- OZEANIEN ---
    { type: 'region', code: 'AU.NSW', name: 'New South Wales', lat: -31.2, lon: 146.9 },
    { type: 'region', code: 'AU.VIC', name: 'Victoria', lat: -37.4, lon: 144.9 },
    { type: 'region', code: 'AU.QLD', name: 'Queensland', lat: -20.9, lon: 142.7 },
    { type: 'region', code: 'AU.WA', name: 'West-Australien', lat: -25.0, lon: 122.0 },
    { type: 'country', code: 'NZ', name: 'Neuseeland', lat: -40.9, lon: 174.8 },

    // --- AFRIKA ---
    { type: 'country', code: 'ZA', name: 'Südafrika', lat: -30.5, lon: 22.9 },
    { type: 'country', code: 'MA', name: 'Marokko', lat: 31.7, lon: -7.0 },
    { type: 'country', code: 'EG', name: 'Ägypten', lat: 26.8, lon: 30.8 },
    { type: 'country', code: 'KE', name: 'Kenia', lat: -0.0, lon: 37.9 }
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
            const alt = SunCalc.getPosition(now, t.lat, t.lon).altitude * 180 / Math.PI;
            return alt >= -PRE_CHECK_WINDOW && alt <= PRE_CHECK_WINDOW;
        });

        console.log(`Scan: ${activeTargets.length} aktive Gebiete.`);
        const results = await Promise.all(activeTargets.map(fetchForTarget));
        
        const finalResults = results.flat().filter(w => {
            const alt = SunCalc.getPosition(now, w.location.latitude, w.location.longitude).altitude * 180 / Math.PI;
            w.sunAlt = alt;
            w.isPremium = (alt >= -6 && alt <= 6);
            return alt >= GOLDEN_HOUR_MIN && alt <= GOLDEN_HOUR_MAX;
        });

        const unique = Array.from(new Map(finalResults.map(c => [c.webcamId, c])).values());
        res.json({ status: "success", meta: { total: unique.length, gridSize: 5 }, webcams: unique });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend aktiv auf Port ${PORT}`));
