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
        // Deine verifizierten Kategorien aus der PowerShell
        const categories = ['beach', 'city', 'coast', 'forest', 'lake', 'landscape', 'mountain', 'river', 'village'];
        
        console.log(`🚀 Starte Smart-Scan für ${categories.length} Kategorien...`);

        for (const cat of categories) {
            // Wir scannen 3 Pakete pro Kategorie (Offset 0, 50, 100)
            for (let offset of [0, 50, 100]) {
                // Ohne property-Filter, um auch Cams ohne Boolean-Flag zu finden
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&category=${cat}&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'x-windy-api-key': WINDY_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams && Array.isArray(data.webcams)) {
                        // SMART-FILTER: Findet Cams via Flags ODER via URL-Strings
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
            console.log(`✅ Kategorie ${cat} verarbeitet.`);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        console.log(`📊 Scan beendet. Gesamtpool: ${uniqueWebcams.length} Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        // Loggt den Fehler präzise im Render-Dashboard
        console.error('❌ Fehler im Backend:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`));
