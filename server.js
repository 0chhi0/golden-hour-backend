import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

// Ersetze 'DEIN_API_KEY' durch deinen echten Windy API Key
const WINDY_KEY = process.env.WINDY_API_KEY || 'DEIN_API_KEY';

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const gridStep = 10; // 10-Grad-Gitter für weltweite Abdeckung
        const activeZones = [];

        // 1. Gitter scannen und aktive Golden-Hour-Zonen finden
        for (let lat = -70; lat <= 75; lat += gridStep) {
            for (let lng = -180; lng <= 180; lng += gridStep) {
                const sunPos = SunCalc.getPosition(now, lat + (gridStep/2), lng + (gridStep/2));
                const alt = sunPos.altitude * 180 / Math.PI;

                // Großzügiges Fenster für das Backend (-7 bis +7)
                if (alt >= -7 && alt <= 7) {
                    activeZones.push({ lat, lng });
                }
            }
        }

        console.log(`🚀 Scanne ${activeZones.length} aktive Gitter-Zonen...`);

        let allWebcams = [];
        const batchSize = 8; // Parallelisierung der Anfragen

        for (let i = 0; i < activeZones.length; i += batchSize) {
            const batch = activeZones.slice(i, i + batchSize);
            const promises = batch.map(zone => {
                // Nutzung des box-Parameters für maximale Ergebnisse pro Zone
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&box=${zone.lat},${zone.lng},${zone.lat + gridStep},${zone.lng + gridStep}&include=location,images,player`;
                return fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } })
                    .then(r => r.ok ? r.json() : { webcams: [] })
                    .catch(() => ({ webcams: [] }));
            });

            const results = await Promise.all(promises);
            results.forEach(data => {
                if (data.webcams) allWebcams = allWebcams.concat(data.webcams);
            });
        }

        // Dubletten entfernen
        const uniqueMap = new Map();
        allWebcams.forEach(w => uniqueMap.set(w.webcamId, w));
        
        // Finaler Sonnenstand und Sortierung
        const finalSelection = Array.from(uniqueMap.values()).map(w => {
            const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            return { ...w, sunAlt: s.altitude * 180 / Math.PI };
        }).filter(w => w.sunAlt >= -7 && w.sunAlt <= 7)
          .sort((a, b) => Math.abs(a.sunAlt - (-1.5)) - Math.abs(b.sunAlt - (-1.5)));

        console.log(`✅ Scan abgeschlossen: ${finalSelection.length} Webcams gefunden.`);
        res.json({ webcams: finalSelection });

    } catch (error) {
        console.error("Backend Fehler:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Golden Hour Master-Server auf Port ${PORT}`));
