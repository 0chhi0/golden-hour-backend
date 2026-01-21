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
        const gridStep = 10; // 10 Grad Schritte für das Gitter
        const activeZones = [];

        // 1. SCHRITT: Weltweites Gitter scannen
        for (let lat = -70; lat <= 70; lat += gridStep) {
            for (let lng = -180; lng <= 180; lng += gridStep) {
                // Prüfe Sonnenstand in der Mitte des Quadrats
                const sunPos = SunCalc.getPosition(now, lat + (gridStep/2), lng + (gridStep/2));
                const alt = sunPos.altitude * 180 / Math.PI;

                // Golden Hour Fenster (großzügig -7 bis +7 für das Backend)
                if (alt >= -7 && alt <= 7) {
                    activeZones.push({ lat, lng });
                }
            }
        }

        console.log(`🔍 Scanne ${activeZones.length} aktive Gitter-Zonen...`);

        // 2. SCHRITT: Windy API Abfragen bündeln (Batching)
        let rawWebcams = [];
        const batchSize = 10; // 10 Zonen gleichzeitig abfragen
        
        for (let i = 0; i < activeZones.length; i += batchSize) {
            const batch = activeZones.slice(i, i + batchSize);
            const promises = batch.map(zone => {
                // Wir nutzen das "box" feature der Windy API (Süden, Westen, Norden, Osten)
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&box=${zone.lat},${zone.lng},${zone.lat + gridStep},${zone.lng + gridStep}&include=location,images,player`;
                return fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } })
                    .then(r => r.ok ? r.json() : { webcams: [] })
                    .catch(() => ({ webcams: [] }));
            });

            const results = await Promise.all(promises);
            results.forEach(data => {
                if (data.webcams) rawWebcams = rawWebcams.concat(data.webcams);
            });
        }

        // 3. SCHRITT: Dubletten entfernen & Präzise Sonnenstandsberechnung
        const uniqueWebcams = Array.from(new Map(rawWebcams.map(w => [w.webcamId, w])).values());
        
        const finalWebcams = uniqueWebcams.map(w => {
            const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            return { ...w, sunAlt: s.altitude * 180 / Math.PI };
        }).filter(w => w.sunAlt >= -6 && w.sunAlt <= 6); // Finaler Filter für das Frontend

        console.log(`✅ Gefunden: ${finalWebcams.length} Kameras.`);
        res.json({ webcams: finalWebcams });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server läuft auf Port ${PORT}`));
