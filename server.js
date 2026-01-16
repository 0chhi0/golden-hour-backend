import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Kleinere, strategische Regionen + Offset-Paginierung
const REGIONS = [
    // Nordamerika - aufgeteilt für bessere Abdeckung
    { name: 'Alaska & Nordwest-Kanada', box: '70,-170,55,-120' },
    { name: 'Westküste USA', box: '49,-125,32,-110' },
    { name: 'Zentral-USA', box: '49,-110,30,-85' },
    { name: 'Ostküste USA', box: '47,-85,25,-65' },
    { name: 'Florida & Golf', box: '31,-90,24,-79' },
    { name: 'Mexiko', box: '32,-118,14,-86' },
    { name: 'Karibik', box: '27,-85,10,-60' },
    
    // Südamerika
    { name: 'Kolumbien & Venezuela', box: '13,-82,-5,-58' },
    { name: 'Brasilien Nord', box: '5,-75,-15,-35' },
    { name: 'Brasilien Süd', box: '-15,-55,-35,-34' },
    { name: 'Argentinien & Chile', box: '-20,-75,-56,-53' },
    
    // Europa - feinere Aufteilung
    { name: 'Island & Norwegen', box: '71,-25,58,12' },
    { name: 'UK & Irland', box: '60,-11,50,2' },
    { name: 'Frankreich', box: '51,-5,42,8' },
    { name: 'Spanien & Portugal', box: '44,-10,36,4' },
    { name: 'Deutschland & Benelux', box: '54,3,47,15' },
    { name: 'Alpen (CH, AT, IT Nord)', box: '48,5,45,17' },
    { name: 'Italien', box: '47,6,37,19' },
    { name: 'Griechenland & Balkan', box: '47,13,35,29' },
    { name: 'Skandinavien Ost', box: '70,10,55,32' },
    { name: 'Polen & Baltikum', box: '60,14,49,28' },
    
    // Mittlerer Osten & Nordafrika
    { name: 'Türkei', box: '42,26,36,45' },
    { name: 'Israel & Levante', box: '37,32,29,40' },
    { name: 'VAE & Oman', box: '27,51,22,60' },
    { name: 'Nordafrika', box: '37,-12,27,12' },
    { name: 'Südafrika', box: '-22,16,-35,33' },
    
    // Asien
    { name: 'Russland West', box: '70,30,45,60' },
    { name: 'Indien Nord', box: '37,68,22,88' },
    { name: 'Indien Süd', box: '22,68,8,88' },
    { name: 'Thailand & Myanmar', box: '21,92,5,106' },
    { name: 'Vietnam & Kambodscha', box: '24,102,8,110' },
    { name: 'Malaysia & Singapur', box: '8,99,-2,120' },
    { name: 'Indonesien West', box: '6,95,-11,120' },
    { name: 'Indonesien Ost', box: '2,120,-11,141' },
    { name: 'Philippinen', box: '21,116,4,127' },
    { name: 'China Ost', box: '42,110,18,123' },
    { name: 'China Süd', box: '30,100,18,115' },
    { name: 'Japan', box: '46,128,30,146' },
    { name: 'Korea', box: '43,124,33,131' },
    
    // Ozeanien
    { name: 'Australien Queensland', box: '-10,142,-29,154' },
    { name: 'Australien NSW & Victoria', box: '-28,140,-39,151' },
    { name: 'Australien West', box: '-15,112,-35,129' },
    { name: 'Neuseeland Nord', box: '-34,166,-42,179' },
    { name: 'Neuseeland Süd', box: '-40,166,-47,175' },
];

async function fetchWebcamsForRegion(region, maxPages = 3) {
    const webcams = [];
    
    for (let page = 0; page < maxPages; page++) {
        const offset = page * 50;
        const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&area=${region.box}&include=location,images,urls,player`;
        
        try {
            const response = await fetch(url, {
                headers: { 'x-windy-api-key': WINDY_KEY }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Wenn weniger als 50 zurückkommen, gibt's keine weiteren Seiten
                if (!data.webcams || data.webcams.length === 0) {
                    break;
                }
                
                webcams.push(...data.webcams.filter(w => w.images?.current));
                
                // Wenn weniger als 50, sind wir am Ende
                if (data.webcams.length < 50) {
                    break;
                }
            } else {
                console.log(`  ⚠️ HTTP ${response.status} bei Offset ${offset}`);
                break;
            }
            
            // Kleine Pause zwischen Seiten
            if (page < maxPages - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
        } catch (error) {
            console.error(`  ❌ Offset ${offset}: ${error.message}`);
            break;
        }
    }
    
    return webcams;
}

async function fetchAllWebcams() {
    const now = Date.now();
    
    if (webcamCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
        console.log(`📦 Cache: ${webcamCache.length} Webcams (${Math.floor((now - lastCacheUpdate) / 60000)}m alt)`);
        return webcamCache;
    }
    
    console.log('🌍 Starte weltweiten Scan mit Paginierung...');
    const allWebcams = new Map();
    let requestCount = 0;
    let regionsProcessed = 0;
    
    for (const region of REGIONS) {
        try {
            console.log(`📍 ${region.name}...`);
            
            const regionalWebcams = await fetchWebcamsForRegion(region, 3); // Max 3 Seiten = 150 Webcams pro Region
            
            requestCount += Math.ceil(regionalWebcams.length / 50);
            
            if (regionalWebcams.length > 0) {
                regionalWebcams.forEach(w => allWebcams.set(w.webcamId, w));
                console.log(`  ✅ ${regionalWebcams.length} gefunden (${allWebcams.size} gesamt)`);
            } else {
                console.log(`  ⚪ keine gefunden`);
            }
            
            regionsProcessed++;
            
            // Pause zwischen Regionen
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`  ❌ ${region.name}: ${error.message}`);
        }
    }
    
    webcamCache = Array.from(allWebcams.values());
    lastCacheUpdate = now;
    
    console.log(`\n🎉 Scan abgeschlossen:`);
    console.log(`   📊 ${webcamCache.length} einzigartige Webcams`);
    console.log(`   🌍 ${regionsProcessed}/${REGIONS.length} Regionen`);
    console.log(`   📡 ~${requestCount} API-Anfragen`);
    console.log(`   ⏱️  Cache gültig für ${CACHE_DURATION / 60000} Minuten\n`);
    
    return webcamCache;
}

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Golden Hour Backend läuft!',
        cache: {
            webcams: webcamCache.length,
            lastUpdate: new Date(lastCacheUpdate).toISOString(),
            ageMinutes: Math.floor((Date.now() - lastCacheUpdate) / 60000)
        },
        endpoints: {
            webcams: '/api/webcams',
            stats: '/api/stats'
        }
    });
});

// Hauptendpoint für Webcams
app.get('/api/webcams', async (req, res) => {
    try {
        const allWebcams = await fetchAllWebcams();
        res.json({ 
            webcams: allWebcams,
            meta: {
                total: allWebcams.length,
                cached: (Date.now() - lastCacheUpdate) < CACHE_DURATION,
                cacheAge: Math.floor((Date.now() - lastCacheUpdate) / 60000)
            }
        });
    } catch (error) {
        console.error('❌ Fehler:', error);
        res.status(500).json({ 
            error: error.message,
            webcams: [] 
        });
    }
});

// Stats Endpoint
app.get('/api/stats', async (req, res) => {
    const allWebcams = await fetchAllWebcams();
    
    // Statistiken berechnen
    const byCountry = {};
    const byContinent = {};
    
    allWebcams.forEach(w => {
        const country = w.location?.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    res.json({
        total: allWebcams.length,
        regions: REGIONS.length,
        byCountry: Object.entries(byCountry)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([country, count]) => ({ country, count })),
        cache: {
            lastUpdate: new Date(lastCacheUpdate).toISOString(),
            ageMinutes: Math.floor((Date.now() - lastCacheUpdate) / 60000)
        }
    });
});

// Cache manuell neu laden
app.post('/api/refresh', async (req, res) => {
    console.log('🔄 Manueller Cache-Refresh angefordert');
    webcamCache = [];
    lastCacheUpdate = 0;
    const webcams = await fetchAllWebcams();
    res.json({ 
        success: true, 
        webcams: webcams.length 
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
    console.log(`\n🌅 ========================================`);
    console.log(`   Golden Hour Backend gestartet`);
    console.log(`🌅 ========================================`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Regionen: ${REGIONS.length}`);
    console.log(`\n   Lade initiale Webcams...`);
    
    // Initiales Laden beim Start
    await fetchAllWebcams();
    
    console.log(`\n✅ Backend bereit!\n`);
});
