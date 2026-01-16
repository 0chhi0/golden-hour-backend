import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// ... (worldData Matrix wie gehabt oben einfügen) ...

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const targetCountries = worldData.filter(c => {
            const sunPos = SunCalc.getPosition(now, 0, c.lon);
            const altitude = sunPos.altitude * 180 / Math.PI;
            // Großzügiger Scan-Bereich für das Backend
            return (altitude >= -15 && altitude <= 15);
        });

        console.log(`📡 Stapel-Scan: Starte Einzelabfrage für ${targetCountries.length} Länder...`);

        // Wir nutzen eine Map, die echte Promises zurückgibt
        const results = await Promise.all(targetCountries.map(async (country) => {
            try {
                const response = await fetch(
                    `https://api.windy.com/webcams/api/v3/webcams?limit=50&country=${country.id}&include=location,player`,
                    { headers: { 'x-windy-api-key': WIND_KEY } }
                );
                
                if (!response.ok) {
                    console.log(`⚠️ Land ${country.id}: API Fehler ${response.status}`);
                    return [];
                }
                
                const data = await response.json();
                const cams = data.webcams || [];
                // Kleines Log für jedes Land zur Kontrolle
                if (cams.length > 0) console.log(`📍 ${country.id}: ${cams.length} Cams gefunden.`);
                return cams;
            } catch (err) {
                console.log(`❌ Fehler bei Land ${country.id}`);
                return [];
            }
        }));

        // Stapel zusammenfügen
        const allWebcams = results.flat();
        
        // Dubletten entfernen
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());

        console.log(`✅ SCAN BEENDET. Gesamt-Stapelgröße: ${uniqueWebcams.length} Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error("Kritischer Backend-Fehler:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Stapel-Backend v5 (Stabil) aktiv.`));
