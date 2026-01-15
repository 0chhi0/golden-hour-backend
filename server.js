import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Golden Hour Backend läuft! Nutze /api/webcams für Daten.' 
    });
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Starte erweiterten Scan (300 Webcams)...');
        let allWebcams = [];
        
        // Wir fragen 3 Seiten ab (3 x 100 Webcams = 300)
        // Das erhöht die Trefferquote für die Golden Hour Zone massiv
        const pages = [0, 100, 200]; 
        
        for (const offset of pages) {
            const url = `https://api.windy.com/webcams/api/v3/webcams?limit=100&offset=${offset}&include=location,images`;
            
            const response = await fetch(url, {
                headers: { 'x-windy-api-key': WINDY_KEY }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.webcams) {
                    allWebcams = allWebcams.concat(data.webcams);
                }
            }
            console.log(`✅ Seite mit Offset ${offset} geladen...`);
        }

        console.log(` Gesamtpool: ${allWebcams.length} Webcams geladen.`);
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Server Fehler:', error.message);
        res.status(500).json({ error: error.message, webcams: [] });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌅 Erweitertes Backend bereit auf Port ${PORT}`);
});
