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
        const categories = ['beach', 'city', 'mountain', 'lake', 'landscape']; // Fokus auf Top-Kategorien
        
        // Definition von Bounding Boxes für eine globale Verteilung
        // [nord, west, süd, ost]
        const regions = [
            { name: 'Europa', box: '71, -10, 35, 30' },
            { name: 'Nordamerika', box: '72, -170, 15, -50' },
            { name: 'Asien/Ozeanien', box: '75, 60, -45, 180' },
            { name: 'Südamerika/Afrika', box: '35, -90, -55, 60' }
        ];

        console.log(`🌍 Starte globalen Scan für ${regions.length} Regionen...`);

        for (const region of regions) {
            for (const cat of categories) {
                // Abfrage pro Region UND Kategorie
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=30&category=${cat}&area=${region.box}&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    headers: { 'x-windy-api-key': WIND_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams) {
                        // Dein bewährter Smart-Filter für Video-URLs
                        const validVideos = data.webcams.filter(w => {
                            if (!w.player) return false;
                            return (w.player.live || w.player.day);
                        });
                        allWebcams = allWebcams.concat(validVideos);
                    }
                }
            }
            console.log(`✅ Region ${region.name} abgeschlossen.`);
        }

        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`));
