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
        let allWebcams = [];
        const limit = 50;
        const totalPackages = 6; // 300 Kameras insgesamt

        console.log(`🚀 Starte Scan von ${totalPackages * limit} Webcams mit Video-Filter...`);

        for (let i = 0; i < totalPackages; i++) {
            const offset = i * limit;
            
            // Wir nutzen 'category=city,beach' oder ähnliches NICHT, 
            // sondern filtern über die property-Parameter nach Video-Inhalten.
            const url = `https://api.windy.com/api/webcams/v3/list?limit=${limit}&offset=${offset}&include=location,images,player,urls`;

            const response = await fetch(url, {
                headers: { 'x-windy-api-key': process.env.WINDY_API_KEY }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`❌ Windy Fehler bei Paket ${i + 1}:`, errorData);
                continue; // Springe zum nächsten Paket, falls eines fehlschlägt
            }

            const data = await response.json();
            
            if (data.webcams && data.webcams.length > 0) {
                // PRIORISIERUNG: Wir nehmen nur Kameras, die ENTWEDER live ODER day (Video) haben
                const videoOnly = data.webcams.filter(w => 
                    (w.player && (w.player.live || w.player.day))
                );
                
                allWebcams = allWebcams.concat(videoOnly);
            }
            
            console.log(`📦 Paket ${i + 1} verarbeitet. Aktuelle Auswahl: ${allWebcams.length} Video-Cams.`);
        }

        console.log(`📊 Scan beendet. Gesamtpool mit Video-Priorität: ${allWebcams.length} Webcams.`);
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Schwerer Serverfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`);
});
