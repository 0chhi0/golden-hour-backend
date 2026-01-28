import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * TEST-ENDPUNKT: Deep-Inspect (Korrektur)
 * Wir nutzen nur die von Windy erlaubten include-Parameter.
 */
app.get('/test-windy-details', async (req, res) => {
    try {
        console.log("Starte korrigierte Deep-Inspect Abfrage...");
        
        // Korrigierte URL: 'property' wurde entfernt
        const url = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,50&limit=1&include=location,images,urls,categories,player";
        
        const response = await axios.get(url, {
            headers: { 
                'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' 
            }
        });

        if (response.data.webcams && response.data.webcams.length > 0) {
            res.json({
                status: "Erfolg",
                message: "Hier sind alle verfügbaren Details der Kamera",
                full_data: response.data.webcams[0]
            });
        } else {
            res.status(404).json({ message: "Keine Webcam gefunden." });
        }
        
    } catch (error) {
        console.error("API Fehler:", error.message);
        res.status(500).json({ 
            status: "Fehler", 
            message: error.message,
            details: error.response?.data 
        });
    }
});

app.get('/', (req, res) => res.send('Server online! Teste /test-windy-details'));

app.listen(port, () => console.log(`Server aktiv auf Port ${port}`));
