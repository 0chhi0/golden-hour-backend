import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'DEIN_API_KEY';

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const gridStep = 10; 
        const activeZones = [];

        // 1. Finde nur die Zonen, die in der Golden Hour liegen
        for (let lat = -70; lat <= 75; lat += gridStep) {
            for (let lng = -180; lng <= 180; lng += gridStep) {
                const alt = SunCalc.getPosition(now, lat + 5, lng + 5).altitude * 180 / Math.PI;
                if (alt >= -8 && alt <= 8) activeZones.push({ lat, lng });
            }
        }

        let allWebcams = [];
        // 2. Windy Abfrage (Batching)
        for (let i = 0; i < activeZones.length; i += 5) {
            const batch = activeZones.slice(i, i + 5);
            const promises = batch.map(zone => {
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&box=${zone.lat},${zone.lng},${zone.lat + gridStep},${zone.lng + gridStep}&include=location,images,player`;
                return fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } }).then(r => r.json());
            });
            const results = await Promise.all(promises);
            results.forEach(data => { if (data.webcams) allWebcams.push(...data.webcams); });
        }

        // 3. PRÄZISE FILTERUNG: Jede Kamera einzeln validieren
        const uniqueMap = new Map();
        allWebcams.forEach(w => {
            const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            const alt = s.altitude * 180 / Math.PI;
            // NUR Kameras zwischen -6 und +6 Grad behalten
            if (alt >= -6 && alt <= 6) {
                uniqueMap.set(w.webcamId, { ...w, sunAlt: alt });
            }
        });

        const final = Array.from(uniqueMap.values())
            .sort((a, b) => Math.abs(a.sunAlt - (-1.5)) - Math.abs(b.sunAlt - (-1.5)));

        console.log(`✅ ${final.length} Kameras präzise gefiltert.`);
        res.json({ webcams: final });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(10000, '0.0.0.0');
