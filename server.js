import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Wir nutzen direkt den Key, der in deinen Environment Variables steht
const ACTUAL_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend - Einfacher Modus aktiv');
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log("🚀 Rufe Webcams im Standard-Modus ab...");

        // Die absolut einfachste URL-Struktur ohne Offset-Schleifen
        const url = `https://api.windy.com/api/webcams/v3/list?limit=50&include=location,images,player,urls`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'x-windy-api-key': ACTUAL_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ API Fehler: Status ${response.status}`);
            return res.status(response.status).json({ error: "Windy API nicht erreichbar" });
        }

        const data = await response.json();
        
        // Wir filtern nur noch im Code, um sicherzustellen, dass die API nicht durch Parameter verwirrt wird
        const webcams = data.webcams || [];
        const videoOnly = webcams.filter(w => w.player && (w.player.live || w.player.day));

        console.log(`✅ Erfolg! ${videoOnly.length} Video-Webcams geladen.`);
        res.json({ webcams: videoOnly });

    } catch (error) {
        console.error('❌ Serverfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Backend bereit auf Port ${PORT}`));
