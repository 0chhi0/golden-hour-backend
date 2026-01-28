import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

// Wir nutzen deinen Key direkt als Fallback
const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// ========================================
// 1. DER DEBUG-LINK (Muss funktionieren!)
// ========================================
app.get('/debug', async (req, res) => {
    try {
        console.log("Sende Test-Anfrage an Windy...");
        // Wir fragen einfach 10 Kameras aus den USA ab, ohne Zeitfilter
        const url = "https://api.windy.com/webcams/api/v3/webcams?country=US&limit=10&include=location,images";
        
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });

        const data = await response.json();
        res.json({
            status: "Backend ist online",
            key_verwendet: WINDY_KEY.substring(0, 5) + "...",
            windy_antwort_code: response.status,
            webcams: data.webcams || []
        });
    } catch (error) {
        res.status(500).json({ fehler: error.message });
    }
});

// ========================================
// 2. DIE GOLDEN HOUR LOGIK
// ========================================
app.get('/webcams', async (req, res) => {
    try {
        // Wir nehmen eine Region, die groß genug ist (z.B. Kalifornien)
        const url = "https://api.windy.com/webcams/api/v3/webcams?region=US.CA&limit=50&include=location,images";
        
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });

        const data = await response.json();
        const now = new Date();
        
        // Filterung nach Sonnenstand (deine Original-Logik)
        const goldenHourCams = (data.webcams || []).filter(cam => {
            const sunPos = SunCalc.getPosition(now, cam.location.latitude, cam.location.longitude);
            const altitudeDeg = sunPos.altitude * (180 / Math.PI);
            // Golden Hour: -8 bis +8 Grad
            return altitudeDeg >= -8 && altitudeDeg <= 8;
        });

        res.json({
            region: "California",
            gefundene_kameras_total: data.webcams?.length || 0,
            davon_in_golden_hour: goldenHourCams.length,
            webcams: goldenHourCams
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend läuft auf Port ${PORT}`);
});
