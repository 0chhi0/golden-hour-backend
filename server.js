import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const ACTUAL_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

let webcamCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000;

app.get('/api/webcams', async (req, res) => {
    const now = Date.now();
    if (webcamCache && (now - lastFetchTime < CACHE_DURATION)) {
        return res.json({ webcams: webcamCache });
    }

    try {
        let allWebcams = [];
        // Wir nutzen den 'list'-Endpunkt mit Kategorien als Filter-Parameter
        const categories = ['city', 'beach', 'mountain', 'pool', 'traffic', 'water'];
        
        console.log(`🚀 Starte robusten Filter-Scan...`);

        for (const cat of categories) {
            // Geänderte URL-Struktur: /list?category=${cat}
            // Dies ist oft kompatibler als der Pfad-Einschub /list/category=...
            const url = `https://api.windy.com/api/webcams/v3/list?category=${cat}&limit=50&include=location,images,player,urls`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'x-windy-api-key': ACTUAL_KEY,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`❌ Fehler bei ${cat}: ${response.status}`);
                continue; 
            }

            const data = await response.json();
            if (data.webcams) {
                const videoOnly = data.webcams.filter(w => w.player && (w.player.live || w.player.day));
                allWebcams = allWebcams.concat(videoOnly);
            }
        }

        webcamCache = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        lastFetchTime = now;
        res.json({ webcams: webcamCache });

    } catch (error) {
        console.error('❌ Schwerer Fehler:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Backend bereit`));
