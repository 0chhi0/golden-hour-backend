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
        const categories = ['beach', 'city', 'mountain', 'lake', 'landscape'];
        
        // Definition der Weltzonen [Nord, West, Süd, Ost]
        const regions = [
            { name: 'Nordamerika', box: '72,-170,15,-50' },
            { name: 'Südamerika', box: '15,-95,-55,-30' },
            { name: 'Europa/Afrika', box: '71,-20,-35,45' },
            { name: 'Asien', box: '75,60,5,150' },
            { name: 'Ozeanien/Australien', box: '5,110,-45,180' }
        ];

        console.log(`🌍 Starte globalen Scan für ${regions.length} Weltregionen...`);

        for (const region of regions) {
            for (const cat of categories) {
                // Der Parameter 'area' zwingt die API in die jeweilige Region
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=40&category=${cat}&area=${region.box}&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    headers: { 'x-windy-api-key': WINDY_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams) {
                        // Smart-Filter: Findet auch Cams wie 1731969577 (URL-String Check)
                        const validVideos = data.webcams.filter(w => {
                            if (!w.player) return false;
                            const hasLive = w.player.live === true || (typeof w.player.live === 'string' && w.player.live.length > 0);
                            const hasDay = w.player.day === true || (typeof w.player.day === 'string' && w.player.day.length > 0);
                            return hasLive || hasDay;
                        });
                        allWebcams = allWebcams.concat(validVideos);
                    }
                }
            }
            console.log(`✅ Region ${region.name} abgeschlossen.`);
            await new Promise(resolve => setTimeout(resolve, 40));
        }

        // Dubletten entfernen und Ergebnis senden
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        console.log(`📊 Globaler Pool bereit: ${uniqueWebcams.length} Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error('❌ Fehler:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`));
