import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Starte API-Abfrage...');
        
        // Wir versuchen den modernsten Endpoint zuerst
        const response = await fetch('https://api.windy.com/webcams/api/v3/webcams?limit=50&include=location,image', {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });

        const status = response.status;
        const data = await response.json();

        if (status === 200) {
            // Windy v3 Format Mapping
            const webcams = data.webcams || [];
            console.log(`✅ ${webcams.length} Webcams erfolgreich geladen`);
            return res.json({ webcams: webcams });
        } else {
            // Wenn es schief geht, senden wir den Fehler als Info
            console.error(`❌ Windy API Fehler: ${status}`);
            return res.status(status).json({ 
                error: `Windy API antwortet mit Status ${status}`,
                details: data,
                webcams: [] 
            });
        }
    } catch (error) {
        console.error('❌ Server Fehler:', error.message);
        res.status(500).json({ error: error.message, webcams: [] });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌅 Backend aktiv auf Port ${PORT}`);
});
