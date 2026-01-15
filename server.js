import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Nutzt den Key aus den Render-Einstellungen oder den Standard-Key
const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Rufe Windy API v3 ab...');
        
        // Korrigierter Endpoint: "images" statt "image"
        const response = await fetch('https://api.windy.com/webcams/api/v3/webcams?limit=50&include=location,images', {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });

        const status = response.status;
        const data = await response.json();

        if (status === 200) {
            // Wir senden die Webcams direkt an dein Frontend
            console.log(`✅ ${data.webcams?.length || 0} Webcams geladen`);
            return res.json(data);
        } else {
            console.error(`❌ API Fehler ${status}:`, data);
            return res.status(status).json({ 
                error: `Fehler: ${status}`, 
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
    console.log(`🌅 Backend bereit auf Port ${PORT}`);
});
