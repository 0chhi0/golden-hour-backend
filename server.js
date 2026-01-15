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
        // Wir fragen 6 verschiedene Kategorien ab statt nur Offset
        const categories = ['city', 'beach', 'mountain', 'pool', 'traffic', 'water'];
        
        console.log(`🚀 Starte Kategorie-Scan (6 Gruppen)...`);

        for (const cat of categories) {
            // Geänderter Endpunkt: /list/category=${cat} statt nur /list
            const url = `https://api.windy.com/api/webcams/v3/list/category=${cat}?limit=50&include=location,images,player,urls`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'x-windy-api-key': ACTUAL_KEY }
            });

            if (!response.ok) {
                console.error(`❌ Fehler bei Kategorie ${cat}: Status ${response.status}`);
                continue; 
            }

            const data = await response.json();
            if (data.webcams) {
                // Nur Kameras mit Video-Player (deine Priorisierung)
                const videoOnly = data.webcams.filter(w => w.player && (w.player.live || w.player.day));
                allWebcams = allWebcams.concat(videoOnly);
            }
        }

        // Dubletten entfernen (falls eine Cam in zwei Kategorien ist)
        webcamCache = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        lastFetchTime = now;

        console.log(`📊 Scan beendet. ${webcamCache.length} Video-Webcams gefunden.`);
        res.json({ webcams: webcamCache });

    } catch (error) {
        res.status(500).json({ error: 'Serverfehler' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Backend aktiv auf Port ${PORT}`));
