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

        // 1. Zonen identifizieren
        for (let lat = -70; lat <= 75; lat += gridStep) {
            for (let lng = -180; lng <= 180; lng += gridStep) {
                const sunPos = SunCalc.getPosition(now, lat + (gridStep/2), lng + (gridStep/2));
                const alt = sunPos.altitude * 180 / Math.PI;
                // Nur Zonen im Bereich der Dämmerung (-8 bis +8)
                if (alt >= -8 && alt <= 8) {
                    activeZones.push({ lat, lng });
                }
            }
        }

        let allWebcams = [];
        // Batch-Abfrage an Windy
        for (let i = 0; i < activeZones.length; i += 5) {
            const batch = activeZones.slice(i, i + 5);
            const promises = batch.map(zone => {
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&box=${zone.lat},${zone.lng},${zone.lat + gridStep},${zone.lng + gridStep}&include=location,images,player`;
                return fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } })
                    .then(r => r.json()).catch(() => ({ webcams: [] }));
            });
            const results = await Promise.all(promises);
            results.forEach(data => { if (data.webcams) allWebcams.push(...data.webcams); });
        }

        // Dubletten entfernen & PRÄZISE FILTERUNG
        const uniqueMap = new Map();
        allWebcams.forEach(w => {
            const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            const alt = s.altitude * 180 / Math.PI;
            // Nur Kameras behalten, die WIRKLICH in der Golden Hour sind
            if (alt >= -6 && alt <= 6) {
                uniqueMap.set(w.webcamId, { ...w, sunAlt: alt });
            }
        });

        const final = Array.from(uniqueMap.values())
            .sort((a, b) => Math.abs(a.sunAlt - (-1.5)) - Math.abs(b.sunAlt - (-1.5)));

        console.log(`✅ ${final.length} Kameras exakt gefiltert.`);
        res.json({ webcams: final });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(10000, '0.0.0.0');
