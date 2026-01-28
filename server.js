import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

// Key-Check: Nutzt Umgebungsvariable oder Fallback
const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Golden Hour Definition
const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;

// ========================================
// DEBUG-ROUTE (Test ohne Filter)
// ========================================
app.get('/debug-windy', async (req, res) => {
    try {
        console.log("--- DEBUG START: Japan Test ---");
        // Wir testen einen fixen Wert (Japan), um die Verbindung zu prüfen
        const url = "https://api.windy.com/webcams/api/v3/webcams?country=JP&limit=5&include=location,images,categories";
        
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });

        const data = await response.json();
        
        res.json({
            status: "Backend läuft",
            windy_api_status: response.status,
            key_preview: WINDY_KEY.substring(0, 5) + "...",
            ergebnisse: data.webcams || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// HAUPT-LOGIK (Mit Golden Hour Filter)
// ========================================
app.get('/webcams', async (req, res) => {
    try {
        // Hier simulieren wir einen Testpunkt in den USA (Kalifornien), 
        // falls dein Lon/Lat Filter aktuell nichts findet
        const testUrl = "https://api.windy.com/webcams/api/v3/webcams?nearby=34.05,-118.24,500&limit=10&include=location,images,categories";
        
        const response = await fetch(testUrl, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });

        const data = await response.json();
        const allWebcams = data.webcams || [];

        // Filtern nach Golden Hour
        const now = new Date();
        const goldenHourCams = allWebcams.filter(cam => {
            const sunPos = SunCalc.getPosition(now, cam.location.latitude, cam.location.longitude);
            const altitudeDeg = sunPos.altitude * (180 / Math.PI);
            return altitudeDeg >= GOLDEN_HOUR_MIN && altitudeDeg <= GOLDEN_HOUR_MAX;
        });

        res.json({
            info: "Abfrage USA Westküste",
            total_gefundene_cams: allWebcams.length,
            davon_in_golden_hour: goldenHourCams.length,
            webcams: goldenHourCams
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend aktiv auf Port ${PORT}`);
});
