import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// ... Deine Welt-Matrix (worldData) hier einfügen ...

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        // 1. Welche Länder sind gerade in der Dämmerungszone?
        const targetCountries = worldData.filter(c => {
            const sunPos = SunCalc.getPosition(now, 0, c.lon);
            const altitude = sunPos.altitude * 180 / Math.PI;
            return (altitude >= -15 && altitude <= 15);
        });

        console.log(`📡 Stapel-Abfrage gestartet für ${targetCountries.length} Länder...`);

        // 2. STAPEL-LOGIK: Jedes Land liefert seinen eigenen 50er Block
        const promises = targetCountries.map(async (country) => {
            try {
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&country=${country.id}&include=location,player`;
                const resp = await fetch(url, { headers: { 'x-windy-api-key': WIND_KEY } });
                if (!resp.ok) return [];
                const data = await resp.json();
                return data.webcams || [];
            } catch (e) {
                return [];
            }
        });

        // 3. Warten auf alle Stapel
        const resultsArray = await Promise.all(promises);
        
        // 4. Alle Stapel zu einer langen Liste zusammenfügen (Flattening)
        let totalStapel = resultsArray.flat();

        // 5. Dubletten entfernen (falls IDs doppelt vorkommen)
        const uniqueWebcams = Array.from(new Map(totalStapel.map(w => [w.webcamId, w])).values());

        console.log(`✅ Stapel-Scan beendet: ${targetCountries.length} Länder x 50 Cams angefragt.`);
        console.log(`📊 Ergebnis: Insgesamt ${uniqueWebcams.length} Webcams im Speicher.`);

        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error("Fehler beim Stapeln:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Stapel-Backend aktiv auf Port ${PORT}`));
