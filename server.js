import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * TEST-ENDPUNKT: Deep-Inspect
 * Dieser Endpunkt holt EINE Webcam aus Tokio mit allen verfügbaren Metadaten.
 * Ideal, um zu sehen, wonach wir später filtern können (Categories, Timezone, etc.)
 */
app.get('/test-windy-details', async (req, res) => {
    try {
        console.log("Starte Deep-Inspect Abfrage für Windy API...");
        
        // Wir fragen nach Webcams bei Tokio (nearby=35.68,139.76)
        // WICHTIG: include=location,images,urls,categories,property liefert alle Details
        const url = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,50&limit=1&include=location,images,urls,categories,property";
        
        const response = await axios.get(url, {
            headers: { 
                'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' 
            }
        });

        if (response.data.webcams && response.data.webcams.length > 0) {
            // Wir geben das komplette erste Objekt zurück
            res.json({
                beschreibung: "Komplettes Datenmodell einer Windy-Webcam",
                full_data: response.data.webcams[0]
            });
        } else {
            res.status(404).json({ message: "Keine Webcam an diesem Ort gefunden." });
        }
        
    } catch (error) {
        console.error("Fehler beim API-Abruf:", error.message);
        res.status(500).json({ 
            status: "Fehler", 
            message: error.message,
            details: error.response?.data 
        });
    }
});

// Basis Route zur Prüfung, ob der Server läuft
app.get('/', (req, res) => {
    res.send('Golden Hour Backend läuft! Teste die Details unter: /test-windy-details');
});

app.listen(port, () => {
    console.log(`Server ist aktiv auf Port ${port}`);
});
