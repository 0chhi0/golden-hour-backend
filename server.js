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
        const activeGrids = [];
        const step = 8; // Dichteres Raster (8 statt 10 Grad) für mehr Abdeckung

        console.log("🚀 Starte globalen Grid-Scan...");

        // 1. Weltweit alle Regionen finden, die im Golden-Hour-Fenster liegen
        for (let lat = -70; lat <= 75; lat += step) {
            for (let lng = -180; lng <= 180; lng += step) {
                const sunPos = SunCalc.getPosition(now, lat, lng);
                const alt = sunPos.altitude * 180 / Math.PI;

                // Wir scannen etwas breiter (-7 bis +7), um mehr Kameras zu finden
                if (alt >= -7 && alt <= 7) {
                    activeGrids.push({ lat, lng });
                }
            }
        }

        console.log(`📍 ${activeGrids.length} potenzielle GH-Zonen gefunden.`);

        // 2. Windy API Abfragen mit Stacking (max 50 pro Request)
        let allWebcams = [];
        
        // Wir verarbeiten die Grids in Batches
        // Windy API erlaubt bis zu 50 Kameras pro Antwort. 
        // Wir fragen pro Zone die 10 besten ab und bündeln die Anfragen.
        const batchSize = 5; // 5 Zonen parallel abfragen
        for (let i = 0; i < activeGrids.length; i += batchSize) {
            const batch = activeGrids.slice(i, i + batchSize);
            
            const promises = batch.map(grid => {
                // radius=lat,lng,500km | limit=50 (Maximum laut API)
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&radius=${grid.lat},${grid.lng},500&include=location,images,player,urls`;
                return fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } })
                    .then(r => r.ok ? r.json() : { webcams: [] })
                    .catch(() => ({ webcams: [] }));
            });

            const results = await Promise.all(promises);
            results.forEach(data => {
                if (data.webcams) allWebcams = allWebcams.concat(data.webcams);
            });

            // Kleiner Delay, um Windy-Rate-Limits (Requests pro Sekunde) nicht zu sprengen
            if (i % 15 === 0) await new Promise(r => setTimeout(r, 300));
        }

        // 3. Dubletten entfernen (Kameras können in mehreren Radien liegen)
        const uniqueMap = new Map();
        allWebcams.forEach(w => uniqueMap.set(w.webcamId, w));
        let uniqueWebcams = Array.from(uniqueMap.values());

        // 4. Sonnenstand für jede Kamera präzise berechnen
        uniqueWebcams.forEach(w => {
            const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            w.sunAlt = s.altitude * 180 / Math.PI;
        });

        // 5. Finaler Filter: Nur was wirklich im Gürtel liegt (-6 bis +6)
        const finalSelection = uniqueWebcams.filter(w => w.sunAlt >= -6 && w.sunAlt <= 6);

        console.log(`✅ Scan abgeschlossen. ${finalSelection.length} Kameras gefunden.`);
        res.json({ webcams: finalSelection });

    } catch (error) {
        console.error("Fehler:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 High-Volume Server auf Port ${PORT}`));
