// 1. IMPORTE (Ganz oben)
import express from 'express';
import axios from 'axios';
import cors from 'cors';

// 2. INITIALISIERUNG
const app = express();
const port = process.env.PORT || 3000;

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());

// --- START NEUER TEST-CODE ---
app.get('/test-windy-nearby', async (req, res) => {
    try {
        const testUrl = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,200&limit=5&include=location";
        const response = await axios.get(testUrl, {
            headers: { 'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' }
        });
        res.json({ 
            status: "Erfolg", 
            message: "Nearby-Abfrage an Tokio gesendet",
            data: response.data.webcams.map(c => ({
                title: c.title,
                country: c.location.country_code,
                coords: [c.location.latitude, c.location.longitude]
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: error.response?.data || "Keine weiteren Details"
        });
    }
});
// --- ENDE NEUER TEST-CODE ---

// 4. DEINE BESTEHENDEN ROUTEN (Falls du schon welche hast)
app.get('/', (req, res) => {
    res.send('Server läuft!');
});

// 5. SERVER STARTEN (Ganz unten)
app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
