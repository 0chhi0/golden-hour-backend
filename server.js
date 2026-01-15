import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Dein funktionierender Key aus dem Screenshot
const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.send('🌅 Golden Hour Backend ist aktiv. Nutze /api/webcams für Daten.');
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Starte Scan von 300 Webcams...');
        let allWebcams = [];
        
        // Wir nutzen Offsets, um mehr Kameras zu erhalten
        const offsets = [0, 100, 200];
        
        for (const offset of offsets) {
            // WICHTIG: Die URL exakt so wie im funktionierenden Browser-Test
            const url = `https://api.windy.com/webcams/api/v3/webcams?limit=100&offset=${offset}&include=location,images`;
            
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
                    console.log(`✅ Seite (Offset ${offset}) geladen: ${data.webcams.length} Kameras`);
                }
            } else {
                const errorText = await response.text();
                console.error(`❌ Windy Fehler bei Offset ${offset}:`, errorText);
            }
        }

        console.log(`📊 Scan beendet. Gesamtpool: ${allWebcams.length} Webcams.`);
        
        // Wir senden das Objekt exakt so, wie das Frontend es erwartet
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Kritischer Server-Fehler:', error.message);
        res.status(500).json({ error: error.message, webcams: [] });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
});
