import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// ERWEITERTE Golden Hour Definition (realistisch für gutes Licht)
const GOLDEN_HOUR_MIN = -8;  // Erweitert für mehr Abdeckung
const GOLDEN_HOUR_MAX = 8;   // Erweitert für mehr Abdeckung

// Premium Golden Hour (besonders gutes Licht)
const PREMIUM_MIN = -6;
const PREMIUM_MAX = 6;

// Grid-Konfiguration - OPTIMIERT
const GRID_SIZE = 5;  // 5° × 5° Boxen (550km × 550km)
const PAGES_PER_BOX = 2;  // 2 Seiten à 50 = 100 Webcams max pro Box
const BATCH_SIZE = 8;  // 8 Boxen parallel für schnelleren Scan

// Cache
let webcamCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten

// Prüfe ob Koordinate in Golden Hour ist
function isInGoldenHour(lat, lng, now) {
    const sunPos = SunCalc.getPosition(now, lat, lng);
    const altitude = sunPos.altitude * 180 / Math.PI;
    return altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX;
}

// Generiere 10° Grid Boxen
function generateGridBoxes() {
    const boxes = [];
    
    for (let lat = -80; lat < 80; lat += GRID_SIZE) {
        for (let lng = -180; lng < 180; lng += GRID_SIZE) {
            boxes.push({
                lat1: lat,
                lng1: lng,
                lat2: lat + GRID_SIZE,
                lng2: lng + GRID_SIZE,
                centerLat: lat + GRID_SIZE / 2,
                centerLng: lng + GRID_SIZE / 2,
                box: `${lat},${lng},${lat + GRID_SIZE},${lng + GRID_SIZE}`
            });
        }
    }
    
    return boxes;
}

// Finde aktive Grid-Boxen (die in Golden Hour sind)
function findActiveBoxes(now) {
    const allBoxes = generateGridBoxes();
    
    const activeBoxes = allBoxes.filter(box => {
        // Prüfe Zentrum der Box
        return isInGoldenHour(box.centerLat, box.centerLng, now);
    });
    
    console.log(`📍 ${activeBoxes.length} von ${allBoxes.length} Boxen in Golden Hour (${GRID_SIZE}° Grid)`);
    return activeBoxes;
}

// Lade Webcams für eine Box mit Paginierung
async function fetchBoxWebcams(box, maxPages = PAGES_PER_BOX) {
    const webcams = [];
    
    for (let page = 0; page < maxPages; page++) {
        const offset = page * 50;
        const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&box=${box.box}&include=location,images,player,urls`;
        
        try {
            const response = await fetch(url, {
                headers: { 'x-windy-api-key': WINDY_KEY }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (!data.webcams || data.webcams.length === 0) {
                    break;  // Keine weiteren Seiten
                }
                
                // Nur Webcams mit Bildern UND Player
                const valid = data.webcams.filter(w => 
                    w.images?.current && w.player && (w.player.live || w.player.day)
                );
                
                webcams.push(...valid);
                
                // Wenn weniger als 50, sind wir am Ende
                if (data.webcams.length < 50) {
                    break;
                }
            } else {
                console.log(`    ⚠️ HTTP ${response.status} bei Offset ${offset}`);
                break;
            }
            
            // Kleine Pause zwischen Seiten
            if (page < maxPages - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
        } catch (error) {
            console.error(`    ❌ Offset ${offset}: ${error.message}`);
            break;
        }
    }
    
    return webcams;
}

// Hauptfunktion: Lade und filtere Webcams
async function fetchGoldenHourWebcams() {
    const now = Date.now();
    
    // Cache prüfen
    if (webcamCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
        console.log(`📦 Cache: ${webcamCache.length} Webcams (${Math.floor((now - lastCacheUpdate) / 60000)}m alt)`);
        return webcamCache;
    }
    
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Webcam Scan - 10° Grid');
    console.log('🌅 ========================================\n');
    console.log(`   Grid-Größe: ${GRID_SIZE}° × ${GRID_SIZE}°`);
    console.log(`   Pages pro Box: ${PAGES_PER_BOX}`);
    console.log(`   Batch-Größe: ${BATCH_SIZE}\n`);
    
    const currentTime = new Date();
    const activeBoxes = findActiveBoxes(currentTime);
    
    if (activeBoxes.length === 0) {
        console.log('⚠️  Keine aktiven Boxen gefunden');
        return [];
    }
    
    const allWebcams = new Map();
    let boxesProcessed = 0;
    let totalRequests = 0;
    
    console.log('🔄 Starte Batch-Verarbeitung...\n');
    
    // Batch-Verarbeitung
    for (let i = 0; i < activeBoxes.length; i += BATCH_SIZE) {
        const batch = activeBoxes.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(activeBoxes.length / BATCH_SIZE);
        
        console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} Boxen):`);
        
        const promises = batch.map(box => fetchBoxWebcams(box));
        const results = await Promise.all(promises);
        
        results.forEach((webcams, idx) => {
            const box = batch[idx];
            boxesProcessed++;
            
            if (webcams.length > 0) {
                totalRequests += Math.ceil(webcams.length / 50);
                console.log(`  ✅ Box [${box.lat1}°,${box.lng1}°]: ${webcams.length} Webcams`);
                
                webcams.forEach(w => allWebcams.set(w.webcamId, w));
            } else {
                console.log(`  ⚪ Box [${box.lat1}°,${box.lng1}°]: leer`);
            }
        });
        
        // Pause zwischen Batches
        if (i + BATCH_SIZE < activeBoxes.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    console.log(`\n📊 Scan-Statistik:`);
    console.log(`   Boxen verarbeitet: ${boxesProcessed}`);
    console.log(`   API-Requests: ~${totalRequests}`);
    console.log(`   Webcams gefunden: ${allWebcams.size}`);
    console.log('\n🔍 Führe PRÄZISE Filterung durch...\n');
    
    // PRÄZISE Filterung: Jede Webcam einzeln prüfen
    const filtered = [];
    const premium = [];
    let filteredOut = 0;
    
    allWebcams.forEach(webcam => {
        const sunPos = SunCalc.getPosition(currentTime, webcam.location.latitude, webcam.location.longitude);
        const altitude = sunPos.altitude * 180 / Math.PI;
        
        if (altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX) {
            webcam.sunAlt = altitude;
            
            // Markiere Premium Golden Hour
            if (altitude >= PREMIUM_MIN && altitude <= PREMIUM_MAX) {
                webcam.isPremium = true;
                premium.push(webcam);
            } else {
                webcam.isPremium = false;
            }
            
            filtered.push(webcam);
        } else {
            filteredOut++;
        }
    });
    
    // Sortiere: Premium zuerst, dann nach optimalem Sonnenstand
    filtered.sort((a, b) => {
        // Premium Golden Hour zuerst
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
        // Dann nach optimalem Winkel
        const optimalAngle = -1.5;
        return Math.abs(a.sunAlt - optimalAngle) - Math.abs(b.sunAlt - optimalAngle);
    });
    
    console.log(`✅ Nach Filterung: ${filtered.length} Webcams in Golden Hour`);
    console.log(`   ⭐ Premium (${PREMIUM_MIN}° bis ${PREMIUM_MAX}°): ${premium.length}`);
    console.log(`   🌅 Extended (${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°): ${filtered.length - premium.length}`);
    console.log(`🚫 Herausgefiltert: ${filteredOut} Webcams (außerhalb ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°)`);
    
    // Geografische Verteilung
    const byContinent = {
        'Europa': 0,
        'Asien': 0,
        'Afrika': 0,
        'Nordamerika': 0,
        'Südamerika': 0,
        'Ozeanien': 0
    };
    
    filtered.forEach(w => {
        const lng = w.location.longitude;
        const lat = w.location.latitude;
        
        if (lng >= -25 && lng <= 40 && lat >= 35) byContinent['Europa']++;
        else if (lng >= 25 && lng <= 150) byContinent['Asien']++;
        else if (lng >= -20 && lng <= 55 && lat < 35 && lat > -35) byContinent['Afrika']++;
        else if (lng >= -170 && lng <= -50 && lat >= 15) byContinent['Nordamerika']++;
        else if (lng >= -85 && lng <= -35 && lat < 15) byContinent['Südamerika']++;
        else if (lng >= 110 || (lng >= -180 && lng <= -160)) byContinent['Ozeanien']++;
    });
    
    console.log('\n🌍 Geografische Verteilung:');
    Object.entries(byContinent).forEach(([continent, count]) => {
        if (count > 0) {
            console.log(`   ${continent}: ${count} Webcams`);
        }
    });
    
    webcamCache = filtered;
    lastCacheUpdate = now;
    
    console.log(`\n⏱️  Cache gültig für ${CACHE_DURATION / 60000} Minuten\n`);
    
    return filtered;
}

// Health Check
app.get('/', async (req, res) => {
    const activeBoxes = findActiveBoxes(new Date());
    
    res.json({
        status: 'ok',
        message: 'Golden Hour Backend - 5° Grid System',
        version: '4.0',
        grid: {
            size: `${GRID_SIZE}° × ${GRID_SIZE}°`,
            activeBoxes: activeBoxes.length,
            totalBoxes: (160 / GRID_SIZE) * (360 / GRID_SIZE),
            pagesPerBox: PAGES_PER_BOX
        },
        goldenHour: {
            range: `${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`,
            premiumRange: `${PREMIUM_MIN}° bis ${PREMIUM_MAX}°`
        },
        cache: {
            webcams: webcamCache.length,
            premium: webcamCache.filter(w => w.isPremium).length,
            lastUpdate: webcamCache.length > 0 ? new Date(lastCacheUpdate).toISOString() : null,
            ageMinutes: webcamCache.length > 0 ? Math.floor((Date.now() - lastCacheUpdate) / 60000) : null
        }
    });
});

// Webcams API
app.get('/api/webcams', async (req, res) => {
    try {
        const webcams = await fetchGoldenHourWebcams();
        
        res.json({
            webcams: webcams,
            meta: {
                total: webcams.length,
                cached: (Date.now() - lastCacheUpdate) < CACHE_DURATION,
                cacheAgeMinutes: Math.floor((Date.now() - lastCacheUpdate) / 60000),
                goldenHourRange: `${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`,
                gridSize: `${GRID_SIZE}°`,
                timestamp: new Date().toISOString()
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

// Statistik API
app.get('/api/stats', async (req, res) => {
    const webcams = await fetchGoldenHourWebcams();
    const activeBoxes = findActiveBoxes(new Date());
    
    const byCountry = {};
    webcams.forEach(w => {
        const country = w.location.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    res.json({
        total: webcams.length,
        grid: {
            size: `${GRID_SIZE}°`,
            activeBoxes: activeBoxes.length
        },
        byCountry: Object.entries(byCountry)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([country, count]) => ({ country, count })),
        sampleWebcams: webcams.slice(0, 10).map(w => ({
            title: w.title,
            country: w.location.country,
            sunAltitude: w.sunAlt.toFixed(2) + '°',
            coordinates: `${w.location.latitude.toFixed(2)}, ${w.location.longitude.toFixed(2)}`
        }))
    });
});

// Cache-Refresh
app.post('/api/refresh', async (req, res) => {
    console.log('🔄 Manueller Cache-Refresh');
    webcamCache = [];
    lastCacheUpdate = 0;
    
    const webcams = await fetchGoldenHourWebcams();
    
    res.json({
        success: true,
        webcams: webcams.length
    });
});

// Server starten
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Backend v4.0');
    console.log('   5° Precision Grid + Extended Range');
    console.log('🌅 ========================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   Grid: ${GRID_SIZE}° × ${GRID_SIZE}° (550km × 550km)`);
    console.log(`   Golden Hour: ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`);
    console.log(`   Premium: ${PREMIUM_MIN}° bis ${PREMIUM_MAX}° ⭐`);
    console.log('\n   Lade initiale Webcams...\n');
    
    await fetchGoldenHourWebcams();
    
    console.log('\n✅ Backend bereit!\n');
});
