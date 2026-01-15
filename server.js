import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Vereinheitlichter Key (Nutzt Umgebungsvariable oder Fallback)
const ACTUAL_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend aktiv - Reichweite: 300 Webcams (Video-Priorität)');
});

app.get('/api/webcams', async (req, res) => {
    try {
        let allWebcams = [];
        const limit = 50;
        const totalPackages = 6; 

        console.log(`🚀 Starte Scan von ${totalPackages * limit} Webcams...`);

        for (let i = 0; i < totalPackages; i++) {
            const offset = i * limit;
            const url = `https://api.windy.com/api/webcams/v3/list?limit=${limit}&offset=${offset}&include=location,images,player,urls`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'x-windy-api-key': ACTUAL_KEY, // Nutzt jetzt sicher den Key
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`❌ Paket ${i + 1} fehlgeschlagen: Status ${response.status}`);
                continue; 
            }

            const data = await response.json();
            
            if (data.webcams && data.webcams.length > 0) {
                // Filtert auf Video-Content
                const videoOnly = data.webcams.filter(w => 
                    w.player && (w.player.live || w.player.day)
                );
                
                allWebcams = allWebcams.concat(videoOnly);
            }
            console.log(`📦 Paket ${i + 1} fertig. (+${allWebcams.length} Cams)`);
        }

        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Serverfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Backend bereit auf Port ${PORT}`);
});
