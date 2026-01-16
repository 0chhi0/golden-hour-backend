import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Nutzt den Key aus den Einstellungen oder den Fallback
const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

app.get('/api/webcams', async (req, res) => {
    try {
        let allWebcams = [];
        // Deine exakte Auswahl aus dem PowerShell-Test
        const categories = [
            'beach', 'city', 'coast', 'forest', 'lake', 
            'landscape', 'mountain', 'river', 'village'
        ];
        
        console.log(`🚀 Starte gezielten Kategorien-Scan (${categories.length} Gruppen)...`);

        for (const cat of categories) {
            // Wir nutzen den stabilen Pfad mit Kategorie- und Video-Filter
            const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&category=${cat}&property=live,day&include=location,images,urls,player`;
            
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
                    console.log(`✅ ${cat}: ${data.webcams.length} Video-Kameras gefunden.`);
                }
            } else {
                console.error(`❌ Fehler bei Kategorie ${cat}: Status ${response.status}`);
            }
            
            // Kurze Pause zwischen den Abfragen
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Dubletten entfernen (falls eine Cam in 'coast' und 'beach' gelistet ist)
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());

        console.log(`📊 Scan beendet. Gesamt: ${uniqueWebcams.length} Webcams in den Ziel-Kategorien.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error('❌ Server-Fehler:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`);
});
