import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const ACTUAL_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// CACHING LOGIK
let webcamCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 Minuten in Millisekunden

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend aktiv - Status: ' + (webcamCache ? 'Cache gefüllt' : 'Warte auf ersten Scan'));
});

app.get('/api/webcams', async (req, res) => {
    const now = Date.now();

    // Wenn Cache gültig ist, Daten sofort senden
    if (webcamCache && (now - lastFetchTime < CACHE_DURATION)) {
        console.log("🟢 Daten aus Cache serviert");
        return res.json({ webcams: webcamCache });
    }

    try {
        let allWebcams = [];
        const limit = 50;
        const totalPackages = 6; 

        console.log(`🚀 Starte frischen Scan von ${totalPackages * limit} Webcams...`);

        for (let i = 0; i < totalPackages; i++) {
            const offset = i * limit;
            // Optimierte URL-Struktur für v3
            const url = `https://api.windy.com/api/webcams/v3/list?limit=${limit}&offset=${offset}&include=location,images,player,urls`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'x-windy-api-key': ACTUAL_KEY,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                // Falls 404 auftritt, loggen wir die URL zur Prüfung
                console.error(`❌ Paket ${i + 1} fehlgeschlagen: Status ${response.status} an URL: ${url}`);
                continue; 
            }

            const data = await response.json();
            
            if (data.webcams && data.webcams.length > 0) {
                const videoOnly = data.webcams.filter(w => 
                    w.player && (w.player.live || w.player.day)
                );
                allWebcams = allWebcams.concat(videoOnly);
            }
        }

        // Cache aktualisieren
        webcamCache = allWebcams;
        lastFetchTime = now;

        console.log(`📊 Scan beendet. ${allWebcams.length} Video-Webcams im Cache.`);
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Schwerer Serverfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Backend bereit auf Port ${PORT}`);
});
