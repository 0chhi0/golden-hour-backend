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
    try {
        console.log(`🚀 Versuche globalen Basis-Scan...`);

        // Wir nutzen den absolut einfachsten v3 Endpunkt ohne Offset-Spielereien
        const url = `https://api.windy.com/api/webcams/v3/list?limit=100&include=location,images,player,urls`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'x-windy-api-key': ACTUAL_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            // Wenn das auch 404 gibt, ist der Key definitiv nicht für Webcams v3
            console.error(`❌ Basis-Scan fehlgeschlagen: Status ${response.status}`);
            return res.status(response.status).json({ error: "API Key abgelehnt" });
        }

        const data = await response.json();
        let webcams = data.webcams || [];

        // Filter für Video (Live oder Day)
        const videoOnly = webcams.filter(w => w.player && (w.player.live || w.player.day));

        console.log(`✅ Erfolg! ${videoOnly.length} Video-Webcams gefunden.`);
        res.json({ webcams: videoOnly });

    } catch (error) {
        console.error('❌ Fehler:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Backend bereit`));
