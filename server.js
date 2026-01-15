import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Nutzt den Key aus den Einstellungen oder den Fallback
const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend aktiv - Reichweite: 500 Webcams (Video-Filter aktiv)');
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Starte Scan über stabilen Pfad (10 Seiten)...');
        let allWebcams = [];
        const offsets = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450];
        
        for (const offset of offsets) {
            // Wir nutzen EXAKT deine funktionierende URL
            const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&include=location,images,urls,player`;
            
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
                    // WICHTIG: Wir filtern hier nach Video-Inhalt, damit die Markerfarben im Frontend stimmen
                    const filtered = data.webcams.filter(w => 
                        w.player && (w.player.live || w.player.day)
                    );
                    allWebcams = allWebcams.concat(filtered);
                    console.log(`✅ Offset ${offset}: ${filtered.length} Video-Kameras gefunden`);
                }
            } else {
                console.error(`❌ Fehler bei Offset ${offset}: Status ${response.status}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`📊 Scan beendet. Gesamtpool: ${allWebcams.length} Webcams.`);
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Server-Fehler:', error.message);
        res.status(500).json({ error: error.message, webcams: [] });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`);
});
