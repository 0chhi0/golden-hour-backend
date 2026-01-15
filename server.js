import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend aktiv - Reichweite: 500 Webcams');
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Starte großen Scan (10 Seiten à 50 Webcams)...');
        let allWebcams = [];
        
        // Wir fragen nun 10 Seiten ab (0 bis 450 in 50er Schritten)
        const offsets = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450];
        
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
                    console.log(`✅ Offset ${offset}: ${data.webcams.length} Kameras`);
                }
            } else {
                console.error(`❌ Fehler bei Offset ${offset}`);
            }
            
            // Ganz kurze Pause (optional), um die API nicht zu überlasten
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
