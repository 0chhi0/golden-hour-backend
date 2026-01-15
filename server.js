import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend ist aktiv. Limit: 50 pro Request.');
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Starte Scan (5 Seiten à 50 Webcams)...');
        let allWebcams = [];
        
        // Da Windy nur 50 pro Abfrage erlaubt, machen wir 5 kleine Schritte
        // Das ergibt am Ende 250 Webcams zum Filtern
        const offsets = [0, 50, 100, 150, 200];
        
        for (const offset of offsets) {
            const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&include=location,images`;
            
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
                    allWebcams = allWebcams.concat(data.webcams);
                    console.log(`✅ Offset ${offset}: ${data.webcams.length} Kameras geladen.`);
                }
            } else {
                const errorData = await response.json();
                console.error(`❌ Windy Fehler bei Offset ${offset}:`, errorData);
            }
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
    console.log(`🚀 Server läuft auf Port ${PORT}`);
});
