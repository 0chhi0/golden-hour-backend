import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// DER TEST-ENDPUNKT
app.get('/test-windy-nearby', async (req, res) => {
    try {
        console.log("Starte Windy API Test für Tokio...");
        const testUrl = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,200&limit=5&include=location";
        
        const response = await axios.get(testUrl, {
            headers: { 'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' }
        });

        const cams = response.data.webcams || [];
        
        res.json({ 
            status: "Erfolg", 
            message: `Gefunden: ${cams.length} Webcams`,
            data: cams.map(c => ({
                title: c.title,
                country: c.location.country_code,
                lat: c.location.latitude,
                lon: c.location.longitude
            }))
        });
    } catch (error) {
        console.error("API Fehler:", error.message);
        res.status(500).json({ 
            status: "Fehler", 
            message: error.message,
            details: error.response?.data 
        });
    }
});

// BASIS ROUTE
app.get('/', (req, res) => {
    res.send('Golden Hour Backend läuft! Teste /test-windy-nearby');
});

app.listen(port, () => {
    console.log(`Server aktiv auf Port ${port}`);
});
