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
        
        console.log(`🚀 Starte Deep-Scan für ${categories.length} Kategorien...`);

        for (const cat of categories) {
            // Wir laden pro Kategorie 2 Pakete (Offset 0 und 50), um mehr als nur 50 Cams zu erhalten
            for (let offset of [0, 50]) {
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&category=${cat}&property=live,day&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'x-windy-api-key': WINDY_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams) {
                        allWebcams = allWebcams.concat(data.webcams);
                    }
                }
            }
            console.log(`✅ Kategorie ${cat} verarbeitet.`);
            // Kurze Pause, um das API-Limit nicht zu sprengen
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Dubletten entfernen (wichtig, da eine Cam in 'beach' und 'coast' sein kann)
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());

        console.log(`📊 Scan beendet. Gesamtpool: ${uniqueWebcams.length} Video-Webcams.`);
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
