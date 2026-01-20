import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

// Falls du Render nutzt, stelle sicher, dass WINDY_API_KEY in den Environment Variables gesetzt ist
const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Hilfsfunktion: Findet den Längengrad für einen Breitengrad, wo die Sonne ideal steht
function findGoldenHourLng(lat, date) {
    for (let lng = -180; lng <= 180; lng += 1) {
        const sunPos = SunCalc.getPosition(date, lat, lng);
        const alt = sunPos.altitude * 180 / Math.PI;
        // Wir suchen den Übergangsbereich am Horizont (-1.5 Grad ist ideal für Farben)
        if (Math.abs(alt - (-1.5)) < 1.0) return lng;
    }
    return null;
}

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const perlen = [];
        
        console.log("🚀 Starte Master-Perlenketten-Scan (32 Punkte)...");

        // 1. Erzeuge engmaschige Perlenkette (alle 5 Breitengrade)
        // Von 80° Nord (Grönland/Arktis) bis 60° Süd (Antarktis-Rand)
        for (let lat = 80; lat >= -60; lat -= 5) {
            const lng = findGoldenHourLng(lat, now);
            if (lng !== null) {
                perlen.push({ lat, lng });
            }
        }

        // 2. Abfrage pro Perle in Batches (schneller und sicherer)
        let allWebcams = [];
        const batchSize = 5; 
        
        for (let i = 0; i < perlen.length; i += batchSize) {
            const batch = perlen.slice(i, i + batchSize);
            
            const batchPromises = batch.map(p => {
                // Radius auf 800km erhöht für lückenlose Abdeckung
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=15&radius=${p.lat},${p.lng},800&include=location,images,player,urls`;
                return fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } })
                    .then(r => r.ok ? r.json() : { webcams: [] })
                    .catch(() => ({ webcams: [] }));
            });

            const results = await Promise.all(batchPromises);
            results.forEach(data => {
                if (data.webcams) allWebcams = allWebcams.concat(data.webcams);
            });

            // Kleine Pause für API-Stabilität
            await new Promise(r => setTimeout(r, 300));
        }

        // 3. Dubletten entfernen (wichtig bei überlappenden Radien)
        const uniqueWebcams = Array.from(
            new Map(allWebcams.map(w => [w.webcamId, w])).values()
        );

        // 4. Sonnenstand für Frontend-Präzision vorberechnen
        uniqueWebcams.forEach(w => {
            const s = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            w.sunAlt = s.altitude * 180 / Math.PI;
        });

        console.log(`✅ Scan abgeschlossen: ${uniqueWebcams.length} Webcams weltweit gefunden.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error("❌ Kritischer Fehler:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Golden Hour Master-Server auf Port ${PORT}`));
