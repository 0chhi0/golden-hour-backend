import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Cache, da dieser riesige Scan ca. 30-40 Sekunden dauert
let globalWebcamCache = null;
let lastCacheUpdate = 0;

app.get('/api/webcams', async (req, res) => {
    // Cache für 30 Minuten nutzen
    if (globalWebcamCache && (Date.now() - lastCacheUpdate < 30 * 60 * 1000)) {
        return res.json({ webcams: globalWebcamCache });
    }

    try {
        console.log("🌍 Rufe Länderliste von Windy ab...");
        const countryRes = await fetch('https://api.windy.com/webcams/api/v3/regions?type=country', {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        const countryData = await countryRes.json();
        const countries = countryData.regions || [];

        console.log(`🚀 Starte Scan für ${countries.length} Länder (20 Cams/Land)...`);

        let allWebcams = [];
        const batchSize = 15; // Moderate Batch-Größe gegen API-Sperren

        for (let i = 0; i < countries.length; i += batchSize) {
            const batch = countries.slice(i, i + batchSize);
            const promises = batch.map(c => 
                fetch(`https://api.windy.com/webcams/api/v3/webcams?limit=20&country=${c.id}&include=location,player`, {
                    headers: { 'x-windy-api-key': WINDY_KEY }
                }).then(r => r.ok ? r.json() : { webcams: [] })
                .catch(() => ({ webcams: [] }))
            );

            const results = await Promise.all(promises);
            results.forEach(data => {
                if (data.webcams) {
                    // Smart-Filter: Erfasst auch Cams wie 1731969577 (URL-String Check)
                    const valid = data.webcams.filter(w => {
                        if (!w.player) return false;
                        const hasLive = w.player.live === true || (typeof w.player.live === 'string' && w.player.live.length > 0);
                        const hasDay = w.player.day === true || (typeof w.player.day === 'string' && w.player.day.length > 0);
                        return hasLive || hasDay;
                    });
                    allWebcams = allWebcams.concat(valid);
                }
            });
            
            // Kurze Pause zwischen Batches, um API-Limits einzuhalten
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        
        globalWebcamCache = uniqueWebcams;
        lastCacheUpdate = Date.now();

        console.log(`📊 Globaler Scan beendet: ${uniqueWebcams.length} Webcams erfasst.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error('❌ Fehler beim Full-Scan:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Full-World Backend auf Port ${PORT}`));
