import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// World data matrix - countries with their coordinates
const worldData = [
    { id: 'US', lon: -95.7 }, { id: 'CA', lon: -106.3 }, { id: 'MX', lon: -102.5 },
    { id: 'BR', lon: -47.9 }, { id: 'AR', lon: -63.6 }, { id: 'CL', lon: -71.5 },
    { id: 'GB', lon: -3.4 }, { id: 'FR', lon: 2.2 }, { id: 'DE', lon: 10.4 },
    { id: 'IT', lon: 12.6 }, { id: 'ES', lon: -3.7 }, { id: 'PT', lon: -8.2 },
    { id: 'NL', lon: 5.3 }, { id: 'BE', lon: 4.5 }, { id: 'CH', lon: 8.2 },
    { id: 'AT', lon: 14.5 }, { id: 'PL', lon: 19.1 }, { id: 'CZ', lon: 15.5 },
    { id: 'SE', lon: 18.6 }, { id: 'NO', lon: 8.5 }, { id: 'FI', lon: 25.7 },
    { id: 'DK', lon: 9.5 }, { id: 'GR', lon: 21.8 }, { id: 'TR', lon: 35.2 },
    { id: 'RU', lon: 105.3 }, { id: 'CN', lon: 104.2 }, { id: 'JP', lon: 138.2 },
    { id: 'KR', lon: 127.8 }, { id: 'IN', lon: 78.9 }, { id: 'AU', lon: 133.8 },
    { id: 'NZ', lon: 174.9 }, { id: 'ZA', lon: 22.9 }, { id: 'EG', lon: 30.8 },
    { id: 'KE', lon: 37.9 }, { id: 'NG', lon: 8.7 }, { id: 'TH', lon: 100.9 },
    { id: 'ID', lon: 113.9 }, { id: 'MY', lon: 101.9 }, { id: 'SG', lon: 103.8 },
    { id: 'PH', lon: 121.8 }, { id: 'VN', lon: 108.3 }, { id: 'AE', lon: 53.8 },
    { id: 'SA', lon: 45.1 }, { id: 'IL', lon: 34.9 }, { id: 'PE', lon: -75.0 },
    { id: 'CO', lon: -74.3 }, { id: 'VE', lon: -66.6 }, { id: 'EC', lon: -78.2 },
    { id: 'CR', lon: -84.1 }, { id: 'PA', lon: -80.8 }, { id: 'IS', lon: -19.0 },
    { id: 'IE', lon: -8.2 }, { id: 'HR', lon: 15.2 }, { id: 'SI', lon: 14.9 },
    { id: 'SK', lon: 19.7 }, { id: 'HU', lon: 19.5 }, { id: 'RO', lon: 24.9 },
    { id: 'BG', lon: 25.5 }, { id: 'RS', lon: 21.0 }, { id: 'UA', lon: 31.2 },
    { id: 'EE', lon: 25.0 }, { id: 'LV', lon: 24.6 }, { id: 'LT', lon: 23.9 }
];

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const targetCountries = worldData.filter(c => {
            const sunPos = SunCalc.getPosition(now, 0, c.lon);
            const altitude = sunPos.altitude * 180 / Math.PI;
            // Generous scan range for backend
            return (altitude >= -15 && altitude <= 15);
        });
        
        console.log(`📡 Batch Scan: Starting individual queries for ${targetCountries.length} countries...`);
        
        const results = await Promise.all(targetCountries.map(async (country) => {
            try {
                const response = await fetch(
                    `https://api.windy.com/webcams/api/v3/webcams?limit=50&country=${country.id}&include=location,player`,
                    { headers: { 'x-windy-api-key': WINDY_KEY } }
                );
                
                if (!response.ok) {
                    console.log(`⚠️ Country ${country.id}: API Error ${response.status}`);
                    return [];
                }
                
                const data = await response.json();
                const cams = data.webcams || [];
                
                if (cams.length > 0) {
                    console.log(`📍 ${country.id}: ${cams.length} cams found.`);
                }
                return cams;
            } catch (err) {
                console.log(`❌ Error for country ${country.id}`);
                return [];
            }
        }));
        
        // Flatten results
        const allWebcams = results.flat();
        
        // Remove duplicates
        const uniqueWebcams = Array.from(
            new Map(allWebcams.map(w => [w.webcamId, w])).values()
        );
        
        console.log(`✅ SCAN COMPLETE. Total batch size: ${uniqueWebcams.length} webcams.`);
        res.json({ webcams: uniqueWebcams });
        
    } catch (error) {
        console.error("Critical backend error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Batch Backend v5 (Stable) active on port ${PORT}`));
