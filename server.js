import express from 'express';
import axios from 'axios';
// ... andere Imports

const app = express(); // <--- ERST HIER WIRD APP DEFINIERT

// JETZT kannst du den Test-Code einfügen:
app.get('/test-windy-nearby', async (req, res) => {
    try {
        const testUrl = "https://api.windy.com/webcams/api/v3/webcams?nearby=35.68,139.76,200&limit=5&include=location";
        const response = await axios.get(testUrl, {
            headers: { 'x-windy-api-key': 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL' }
        });
        res.json({ status: "Erfolg", results: response.data.webcams });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Erst ganz am Ende steht meistens:
// app.listen(port, ...)
