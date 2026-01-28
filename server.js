// Temporärer Test-Endpunkt
app.get('/test-windy-nearby', async (req, res) => {
    try {
        const testUrl = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,200&limit=5&include=location";
        const response = await axios.get(testUrl, {
            headers: { 'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' }
        });
        
        // Wir senden das Ergebnis direkt an deinen Browser
        res.json({
            status: "Erfolg",
            point: "Tokio",
            results: response.data.webcams.map(c => ({
                title: c.title,
                country: c.location.country_code,
                coords: [c.location.latitude, c.location.longitude]
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            status: "Fehler", 
            message: error.message,
            details: error.response?.data 
        });
    }
});
