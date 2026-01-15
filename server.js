import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Golden Hour Backend läuft!',
        endpoints: {
            webcams: '/api/webcams'
        }
    });
});

app.get('/api/webcams', async (req, res) => {
    try {
        console.log('📡 Rufe Windy API ab...');
        
        const endpoints = [
            'https://api.windy.com/api/webcams/v2/list/limit=50?show=webcams:image,location',
            'https://api.windy.com/webcams/api/v2/list/limit=50?show=webcams:image,location'
        ];
        
        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'x-windy-key': WINDY_KEY
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ ${data.result?.webcams?.length || 0} Webcams geladen`);
                    return res.json(data);
                }
                
                lastError = `HTTP ${response.status}`;
                console.log(`❌ Fehler: ${lastError}`);
            } catch (err) {
                lastError = err.message;
            }
        }
        
        console.log('⚠️  API nicht verfügbar, sende leere Antwort');
        res.json({ webcams: [] });
        
    } catch (error) {
        console.error('❌ Fehler:', error.message);
        res.status(500).json({ error: error.message, webcams: [] });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌅 Golden Hour Backend läuft auf Port ${PORT}`);
});
