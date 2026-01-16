import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Nutzt den Key aus den Einstellungen oder den Fallback
const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/api/webcams', async (req, res) => {
    try {
        let allWebcams = [];
        const categories = ['beach', 'city', 'coast', 'forest', 'lake', 'landscape', 'mountain', 'river', 'village'];
        
        console.log(`🚀 Starte Smart-Scan für ${categories.length} Kategorien...`);

        for (const cat of categories) {
            // Wir scannen 3 Pakete pro Kategorie, um eine hohe Dichte zu erreichen
            for (let offset of [0, 50, 100]) {
                // WICHTIG: property=live,day wurde ENTFERNT, um nichts zu übersehen
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&category=${cat}&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'x-windy-api-key': WIND_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams) {
                        // SMART-FILTER: Wir prüfen manuell auf Video-Inhalte
                        const validVideos = data.webcams.filter(w => {
                            if (!w.player) return false;
                            
                            // Erfasst Kameras mit Boolean-Flags ODER mit direkten URLs (wie deine Beispiel-Cam)
                            const hasLive = w.player.live === true || (typeof w.player.live === 'string' && w.player.live.length > 0);
                            const hasDay = w.player.day === true || (typeof w.player.day === 'string' && w.player.day.length > 0);
                            
                            return hasLive || hasDay;
                        });
                        
                        allWebcams = allWebcams.concat(validVideos);
                    }
                }
            }
            console.log(`✅ Kategorie ${cat} mit Smart-Filter verarbeitet.`);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Dubletten entfernen
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());

        console.log(`📊 Scan beendet. Gesamtpool: ${uniqueWebcams.length} Webcams (inkl. URL-basierte Streams).`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error('❌ Fehler:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`);
});
