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
        // Deine verifizierten Kategorien aus der PowerShell
        const categories = ['beach', 'city', 'coast', 'forest', 'lake', 'landscape', 'mountain', 'river', 'village'];
        
        console.log(`🚀 Starte Maximum-Density Scan (6 Pakete pro Kategorie)...`);

        for (const cat of categories) {
            // Wir erhöhen auf 6 Pakete pro Kategorie, um tiefer in die Datenbank zu greifen
            const offsets = [0, 50, 100, 150, 200, 250];
            
            for (let offset of offsets) {
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&category=${cat}&property=live,day&include=location,images,urls,player`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 
                        'x-windy-api-key': WINDY_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.webcams && Array.isArray(data.webcams)) {
                        // Ergebnisse hinzufügen
                        allWebcams = allWebcams.concat(data.webcams);
                    }
                }
            }
            console.log(`✅ Kategorie ${cat} tiefengescannt.`);
            // Kurze Pause, um Rate-Limiting zu vermeiden
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // WICHTIG: Eindeutige IDs sicherstellen, da Cams oft in mehreren Kategorien sind
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());

        console.log(`📊 Scan beendet. Neuer Gesamtpool: ${uniqueWebcams.length} Video-Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error('❌ Fehler im Deep-Scan:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`);
});
