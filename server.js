import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// EXAKTE Golden Hour Definition (wie im Frontend)
const GOLDEN_HOUR_MIN = -6;  // Sonnenaufgang
const GOLDEN_HOUR_MAX = 6;   // Sonnenuntergang

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

// Finde Golden Hour Zonen auf der Welt (BREITERE Zonen für mehr Abdeckung)
function findGoldenHourZones(now) {
    const zones = [];
    const latStep = 20;  // 20° statt 15° (weniger, aber größere Zonen)
    const lngStep = 20;  // 20° statt 15°
    
    console.log('🔍 Scanne Weltkarte für Golden Hour Zonen...');
    
    for (let lat = -70; lat <= 70; lat += latStep) {
        for (let lng = -180; lng < 180; lng += lngStep) {
            // Prüfe Mittelpunkt der Zone
            const midLat = lat + latStep / 2;
            const midLng = lng + lngStep / 2;
            
            if (isInGoldenHour(midLat, midLng, now)) {
                zones.push({
                    lat1: lat,
                    lng1: lng,
                    lat2: lat + latStep,
                    lng2: lng + lngStep,
                    box: `${lat},${lng},${lat + latStep},${lng + lngStep}`
                });
            }
        }
    }
    
    console.log(`📍 ${zones.length} aktive Golden Hour Zonen gefunden`);
    return zones;
}

// Lade Webcams für eine Zone (mit Offset für mehr Ergebnisse)
async function fetchZoneWebcams(zone, limit = 50, offset = 0) {
    const url = `https://api.windy.com/webcams/api/v3/webcams?limit=${limit}&offset=${offset}&box=${zone.box}&include=location,images,player,urls`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.webcams || [];
        }
    } catch (error) {
        console.error(`❌ Zone ${zone.box}: ${error.message}`);
    }
    
    return [];
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
    console.log('   Golden Hour Webcam Scan');
    console.log('🌅 ========================================\n');
    
    const currentTime = new Date();
    const zones = findGoldenHourZones(currentTime);
    
    if (zones.length === 0) {
        console.log('⚠️  Keine Golden Hour Zonen gefunden (sollte nicht passieren)');
        return [];
    }
    
    const allWebcams = new Map();
    let zoneCount = 0;
    
    // Batch-Verarbeitung: 3 Zonen gleichzeitig (weniger parallel = weniger Duplikate)
    for (let i = 0; i < zones.length; i += 3) {
        const batch = zones.slice(i, i + 3);
        
        // Pro Zone: 2 Seiten à 50 = 100 Webcams
        const promises = batch.flatMap(zone => [
            fetchZoneWebcams(zone, 50, 0),  // Seite 1
            fetchZoneWebcams(zone, 50, 50)  // Seite 2
        ]);
        
        const results = await Promise.all(promises);
        
        // Verarbeite die Ergebnisse paarweise (je 2 pro Zone)
        for (let j = 0; j < results.length; j += 2) {
            const page1 = results[j] || [];
            const page2 = results[j + 1] || [];
            const zoneWebcams = [...page1, ...page2];
            
            if (zoneWebcams.length > 0) {
                zoneCount++;
                const zoneIdx = i + Math.floor(j / 2);
                console.log(`  ✅ Zone ${zoneIdx + 1}: ${zoneWebcams.length} Webcams`);
                
                zoneWebcams.forEach(w => {
                    // Nur Webcams mit Bildern UND Video/Stream
                    if (w.images?.current && w.player && (w.player.live || w.player.day)) {
                        allWebcams.set(w.webcamId, w);
                    }
                });
            }
        }
        
        // Längere Pause zwischen Batches
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n📊 Gesamt vor Filterung: ${allWebcams.size} einzigartige Webcams`);
    console.log('🔍 Führe PRÄZISE Filterung durch...\n');
    
    // KRITISCHER SCHRITT: Präzise Filterung jeder einzelnen Webcam
    const filtered = [];
    let filteredOut = 0;
    
    allWebcams.forEach(webcam => {
        const sunPos = SunCalc.getPosition(currentTime, webcam.location.latitude, webcam.location.longitude);
        const altitude = sunPos.altitude * 180 / Math.PI;
        
        // NUR Webcams in der EXAKTEN Golden Hour Range
        if (altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX) {
            // Speichere Sonnenstand für Frontend
            webcam.sunAlt = altitude;
            filtered.push(webcam);
        } else {
            filteredOut++;
        }
    });
    
    // Sortiere nach optimalem Sonnenstand (nahe -1.5° ist ideal)
    filtered.sort((a, b) => {
        const optimalAngle = -1.5;  // Kurz nach Sonnenaufgang / vor Sonnenuntergang
        return Math.abs(a.sunAlt - optimalAngle) - Math.abs(b.sunAlt - optimalAngle);
    });
    
    console.log(`✅ Nach Filterung: ${filtered.length} Webcams in Golden Hour`);
    console.log(`🚫 Herausgefiltert: ${filteredOut} Webcams (außerhalb ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°)`);
    
    // Statistik
    const byCountry = {};
    filtered.forEach(w => {
        const country = w.location.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    console.log('\n🌍 Top 10 Länder:');
    Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([country, count]) => {
            console.log(`   ${country}: ${count}`);
        });
    
    webcamCache = filtered;
    lastCacheUpdate = now;
    
    console.log(`\n⏱️  Cache gültig für ${CACHE_DURATION / 60000} Minuten\n`);
    
    return filtered;
}

// Health Check
app.get('/', async (req, res) => {
    res.json({
        status: 'ok',
        message: 'Golden Hour Backend - Präzise Filterung',
        version: '2.0',
        goldenHour: {
            range: `${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`,
            description: 'Sonnenstand für optimale Golden Hour'
        },
        cache: {
            webcams: webcamCache.length,
            lastUpdate: webcamCache.length > 0 ? new Date(lastCacheUpdate).toISOString() : null,
            ageMinutes: webcamCache.length > 0 ? Math.floor((Date.now() - lastCacheUpdate) / 60000) : null
        },
        endpoints: {
            webcams: '/api/webcams',
            stats: '/api/stats',
            refresh: '/api/refresh (POST)'
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
    
    const byCountry = {};
    const altitudeDistribution = { '-6to-4': 0, '-4to-2': 0, '-2to0': 0, '0to2': 0, '2to4': 0, '4to6': 0 };
    
    webcams.forEach(w => {
        // Länder
        const country = w.location.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
        
        // Sonnenstand-Verteilung
        const alt = w.sunAlt;
        if (alt >= -6 && alt < -4) altitudeDistribution['-6to-4']++;
        else if (alt >= -4 && alt < -2) altitudeDistribution['-4to-2']++;
        else if (alt >= -2 && alt < 0) altitudeDistribution['-2to0']++;
        else if (alt >= 0 && alt < 2) altitudeDistribution['0to2']++;
        else if (alt >= 2 && alt < 4) altitudeDistribution['2to4']++;
        else if (alt >= 4 && alt <= 6) altitudeDistribution['4to6']++;
    });
    
    res.json({
        total: webcams.length,
        goldenHourRange: `${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`,
        cacheAge: Math.floor((Date.now() - lastCacheUpdate) / 60000),
        byCountry: Object.entries(byCountry)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([country, count]) => ({ country, count })),
        altitudeDistribution: altitudeDistribution,
        sampleWebcams: webcams.slice(0, 5).map(w => ({
            title: w.title,
            country: w.location.country,
            sunAltitude: w.sunAlt.toFixed(2) + '°'
        }))
    });
});

// Manueller Cache-Refresh
app.post('/api/refresh', async (req, res) => {
    console.log('🔄 Manueller Cache-Refresh');
    webcamCache = [];
    lastCacheUpdate = 0;
    
    const webcams = await fetchGoldenHourWebcams();
    
    res.json({
        success: true,
        webcams: webcams.length,
        message: 'Cache erfolgreich aktualisiert'
    });
});

// Server starten
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Backend v2.0');
    console.log('🌅 ========================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   Golden Hour: ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`);
    console.log('   Präzise Filterung: AKTIV');
    console.log('\n   Lade initiale Webcams...\n');
    
    // Initial laden
    await fetchGoldenHourWebcams();
    
    console.log('\n✅ Backend bereit!\n');
});
