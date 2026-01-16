import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Korrigierte Key-Zuweisung passend zu deinen Render-Einstellungen
const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/api/webcams', async (req, res) => {
    try {
        let allWebcams = [];
        const categories = ['beach', 'city', 'mountain', 'landscape'];

        // Gezielte Boxen für eine echte Weltabdeckung
        const regions = [
            { name: 'USA & Kanada', box: '60,-125,25,-65' },
            { name: 'Europa', box: '65,-10,35,30' },
            { name: 'Asien & Japan', box: '50,120,20,150' },
            { name: 'Australien', box: '-10,110,-40,155' }
        ];

        console.log(`🌍 Starte priorisierten globalen Scan...`);

        for (const region of regions) {
            console.log(`🔍 Scanne Region: ${region.name}...`);
            
            for (const cat of categories) {
                // Wir nutzen limit=50 pro Kategorie in JEDER Region
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&category=${cat}&area=${region.box}&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    headers: { 'x-windy-api-key': WINDY_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams) {
                        // Dein Smart-Filter für Stream-URLs
                        const validVideos = data.webcams.filter(w => {
                            if (!w.player) return false;
                            return (w.player.live || w.player.day);
                        });
                        allWebcams = allWebcams.concat(validVideos);
                    }
                }
            }
            // Längere Pause zwischen Regionen, um API-Sperren zu vermeiden
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        console.log(`📊 Fertig! Welt-Pool: ${uniqueWebcams.length} Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`));
