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
        let allWebcams = [];
        const limit = 50;
        const totalPackages = 6; // Deine gewünschten 300 Cams

        console.log(`🚀 Starte Wiederherstellung: 6 Pakete à 50...`);

        for (let i = 0; i < totalPackages; i++) {
            const offset = i * limit;
            
            // Wir nutzen hier die absolut einfachste URL-Struktur OHNE Kategorien-Pfad
            // Das 'include' Feld ist wichtig für die Bilder und den Player
            const url = `https://api.windy.com/api/webcams/v3/list?limit=${limit}&offset=${offset}&include=location,images,player,urls`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'x-windy-api-key': ACTUAL_KEY,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`❌ Paket ${i + 1} (Offset ${offset}) fehlgeschlagen: Status ${response.status}`);
                continue; 
            }

            const data = await response.json();
            
            if (data.webcams && data.webcams.length > 0) {
                // Wir filtern HIER im Code, nicht in der API-URL
                // Das stellt sicher, dass wir nur Cams mit Video/Live-Inhalt nehmen
                const videoOnly = data.webcams.filter(w => 
                    w.player && (w.player.live || w.player.day)
                );
                
                allWebcams = allWebcams.concat(videoOnly);
                console.log(`✅ Paket ${i + 1}: ${videoOnly.length} Video-Cams hinzugefügt.`);
            }
        }

        console.log(`📊 Fertig! Gesamtpool: ${allWebcams.length} Webcams.`);
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Serverfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Backend bereit`));
