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
        const limit = 50;
        const totalPackages = 10; // Erhöht auf 10 Pakete (500 Cams Reichweite)

        console.log(`🚀 Starte priorisierten Scan: ${totalPackages} Pakete mit Filter property=live,day...`);

        for (let i = 0; i < totalPackages; i++) {
            const offset = i * limit;
            
            // Nutzt den stabilen Pfad und den Eigenschafts-Filter für Video-Priorisierung
            const url = `https://api.windy.com/webcams/api/v3/webcams?limit=${limit}&offset=${offset}&property=live,day&include=location,images,urls,player`;
            
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
                    console.log(`✅ Paket ${i + 1} (Offset ${offset}): ${data.webcams.length} Video-Kameras erhalten.`);
                }
            } else {
                // Falls ein Paket fehlschlägt (z.B. 404), wird es geloggt, aber der Scan geht weiter
                console.error(`❌ Fehler bei Paket ${i + 1}: Status ${response.status}`);
            }
            
            // Kurze Pause zur API-Schonung
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`📊 Scan beendet. Gesamtpool: ${allWebcams.length} reine Video-Webcams.`);
        res.json({ webcams: allWebcams });

    } catch (error) {
        console.error('❌ Server-Fehler:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend bereit auf Port ${PORT}`);
});
