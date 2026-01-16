import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Sicherstellung der API-Key Variable
const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Cache-Logik zur Schonung deines Kontingents und für schnellere Ladezeiten
let webcamCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 20 * 60 * 1000; // 20 Minuten Cache

app.get('/api/webcams', async (req, res) => {
    const now = Date.now();
    if (webcamCache && (now - lastFetchTime < CACHE_DURATION)) {
        console.log("⚡ Daten aus Cache geladen.");
        return res.json({ webcams: webcamCache });
    }

    try {
        let allWebcams = [];
        // Fokus auf die 5 wichtigsten Kategorien für maximale Dichte
        const categories = ['city', 'mountain', 'beach', 'landscape', 'coast'];
        
        // Nutzung der stabilen Kontinent-Codes aus deiner PowerShell-Analyse
        const continents = [
            { id: 'NA', name: 'Nordamerika' },
            { id: 'EU', name: 'Europa' },
            { id: 'AS', name: 'Asien' },
            { id: 'OC', name: 'Ozeanien/Australien' },
            { id: 'SA', name: 'Südamerika' },
            { id: 'AF', name: 'Afrika' }
        ];

        console.log(`🌍 Starte globalen Kontinent-Scan...`);

        // Wir erstellen alle Anfragen parallel, um die Ladezeit zu minimieren
        const fetchPromises = [];

        for (const cont of continents) {
            for (const cat of categories) {
                // Wir nutzen den 'continent' Filter statt der ungenauen Bounding Box
                const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&category=${cat}&continent=${cont.id}&include=location,images,urls,player`;
                
                fetchPromises.push(
                    fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } })
                    .then(r => r.ok ? r.json() : { webcams: [] })
                    .catch(() => ({ webcams: [] }))
                );
            }
        }

        const results = await Promise.all(fetchPromises);

        results.forEach(data => {
            if (data.webcams && Array.isArray(data.webcams)) {
                // Smart-Filter: Prüft auf Flags ODER direkte Stream-URLs
                const valid = data.webcams.filter(w => {
                    if (!w.player) return false;
                    const hasLive = w.player.live === true || (typeof w.player.live === 'string' && w.player.live.length > 0);
                    const hasDay = w.player.day === true || (typeof w.player.day === 'string' && w.player.day.length > 0);
                    return hasLive || hasDay;
                });
                allWebcams = allWebcams.concat(valid);
            }
        });

        // Eindeutige IDs sicherstellen (da Cams in mehreren Kategorien sein können)
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());

        // Cache aktualisieren
        webcamCache = uniqueWebcams;
        lastFetchTime = now;

        console.log(`📊 Globaler Pool bereit: ${uniqueWebcams.length} hochwertige Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error('❌ Kritischer Fehler:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Reichweiten-Backend aktiv auf Port ${PORT}`);
    console.log(`🌎 Modus: Globaler Kontinent-Scan (NA, EU, AS, OC, SA, AF)`);
});
