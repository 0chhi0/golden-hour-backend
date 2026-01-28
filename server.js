import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/test-windy-details', async (req, res) => {
    try {
        // Wir nutzen exakt die erlaubten Kategorien laut Fehlermeldung:
        // categories, images, location, player, urls
        const url = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,50&limit=1&include=categories,images,location,player,urls";
        
        const response = await axios.get(url, {
            headers: { 'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' }
        });

        // Wir schicken das komplette Objekt zurück, damit du jedes Feld prüfen kannst
        res.json({
            info: "Das ist alles, was Windy zu dieser Kamera liefert",
            raw_data: response.data.webcams[0]
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            windy_feedback: error.response?.data 
        });
    }
});

app.get('/', (req, res) => res.send('Server bereit. Nutze /test-windy-details'));

app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
