import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || process.env.WINDY_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Golden Hour Definition
const GOLDEN_HOUR_MIN = -8;
const GOLDEN_HOUR_MAX = 8;
const PREMIUM_MIN = -6;
const PREMIUM_MAX = 6;

// Cache
let webcamCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 10 * 60 * 1000;

// Weltweite Sampling-Punkte (100+ strategische Städte)
const WORLD_SAMPLING_POINTS = [
    // Nordamerika
    { lat: 40.7128, lon: -74.0060, radius: 400, name: 'New York' },
    { lat: 34.0522, lon: -118.2437, radius: 400, name: 'Los Angeles' },
    { lat: 41.8781, lon: -87.6298, radius: 300, name: 'Chicago' },
    { lat: 29.7604, lon: -95.3698, radius: 300, name: 'Houston' },
    { lat: 33.4484, lon: -112.0740, radius: 300, name: 'Phoenix' },
    { lat: 39.7392, lon: -104.9903, radius: 300, name: 'Denver' },
    { lat: 47.6062, lon: -122.3321, radius: 300, name: 'Seattle' },
    { lat: 37.7749, lon: -122.4194, radius: 300, name: 'San Francisco' },
    { lat: 25.7617, lon: -80.1918, radius: 300, name: 'Miami' },
    { lat: 32.7157, lon: -117.1611, radius: 300, name: 'San Diego' },
    
    // Kanada
    { lat: 43.6532, lon: -79.3832, radius: 300, name: 'Toronto' },
    { lat: 45.5017, lon: -73.5673, radius: 300, name: 'Montreal' },
    { lat: 49.2827, lon: -123.1207, radius: 300, name: 'Vancouver' },
    { lat: 51.0447, lon: -114.0719, radius: 300, name: 'Calgary' },
    
    // Mittelamerika
    { lat: 19.4326, lon: -99.1332, radius: 300, name: 'Mexico City' },
    { lat: 23.6345, lon: -102.5528, radius: 400, name: 'Central Mexico' },
    
    // Südamerika
    { lat: -23.5505, lon: -46.6333, radius: 300, name: 'São Paulo' },
    { lat: -22.9068, lon: -43.1729, radius: 300, name: 'Rio de Janeiro' },
    { lat: -34.6037, lon: -58.3816, radius: 300, name: 'Buenos Aires' },
    { lat: -33.4489, lon: -70.6693, radius: 300, name: 'Santiago' },
    { lat: -12.0464, lon: -77.0428, radius: 300, name: 'Lima' },
    { lat: 4.7110, lon: -74.0721, radius: 300, name: 'Bogota' },
    { lat: -3.4653, lon: -62.2159, radius: 400, name: 'Amazon' },
    
    // Europa West
    { lat: 51.5074, lon: -0.1278, radius: 300, name: 'London' },
    { lat: 48.8566, lon: 2.3522, radius: 300, name: 'Paris' },
    { lat: 52.5200, lon: 13.4050, radius: 300, name: 'Berlin' },
    { lat: 50.1109, lon: 8.6821, radius: 300, name: 'Frankfurt' },
    { lat: 48.1351, lon: 11.5820, radius: 300, name: 'Munich' },
    { lat: 47.3769, lon: 8.5417, radius: 250, name: 'Zurich' },
    { lat: 46.9480, lon: 7.4474, radius: 250, name: 'Bern' },
    { lat: 52.3676, lon: 4.9041, radius: 250, name: 'Amsterdam' },
    { lat: 50.8503, lon: 4.3517, radius: 250, name: 'Brussels' },
    { lat: 55.6761, lon: 12.5683, radius: 250, name: 'Copenhagen' },
    
    // Europa Süd
    { lat: 41.9028, lon: 12.4964, radius: 300, name: 'Rome' },
    { lat: 45.4642, lon: 9.1900, radius: 300, name: 'Milan' },
    { lat: 40.4168, lon: -3.7038, radius: 300, name: 'Madrid' },
    { lat: 41.3851, lon: 2.1734, radius: 300, name: 'Barcelona' },
    { lat: 38.7223, lon: -9.1393, radius: 300, name: 'Lisbon' },
    { lat: 37.9838, lon: 23.7275, radius: 300, name: 'Athens' },
    { lat: 41.0082, lon: 28.9784, radius: 300, name: 'Istanbul' },
    
    // Europa Nord
    { lat: 59.9139, lon: 10.7522, radius: 300, name: 'Oslo' },
    { lat: 59.3293, lon: 18.0686, radius: 300, name: 'Stockholm' },
    { lat: 60.1699, lon: 24.9384, radius: 300, name: 'Helsinki' },
    { lat: 64.1466, lon: -21.9426, radius: 300, name: 'Reykjavik' },
    
    // Europa Ost
    { lat: 55.7558, lon: 37.6173, radius: 300, name: 'Moscow' },
    { lat: 52.2297, lon: 21.0122, radius: 300, name: 'Warsaw' },
    { lat: 50.0755, lon: 14.4378, radius: 250, name: 'Prague' },
    { lat: 48.2082, lon: 16.3738, radius: 250, name: 'Vienna' },
    { lat: 47.4979, lon: 19.0402, radius: 250, name: 'Budapest' },
    
    // Afrika Nord
    { lat: 30.0444, lon: 31.2357, radius: 300, name: 'Cairo' },
    { lat: 36.7538, lon: 3.0588, radius: 300, name: 'Algiers' },
    { lat: 33.9716, lon: -6.8498, radius: 300, name: 'Rabat' },
    { lat: 36.8065, lon: 10.1815, radius: 300, name: 'Tunis' },
    
    // Afrika Sub-Sahara
    { lat: -1.2921, lon: 36.8219, radius: 400, name: 'Nairobi' },
    { lat: -26.2041, lon: 28.0473, radius: 300, name: 'Johannesburg' },
    { lat: -33.9249, lon: 18.4241, radius: 300, name: 'Cape Town' },
    { lat: 6.5244, lon: 3.3792, radius: 300, name: 'Lagos' },
    
    // Mittlerer Osten
    { lat: 25.2048, lon: 55.2708, radius: 300, name: 'Dubai' },
    { lat: 24.7136, lon: 46.6753, radius: 300, name: 'Riyadh' },
    { lat: 32.0853, lon: 34.7818, radius: 250, name: 'Tel Aviv' },
    { lat: 33.8938, lon: 35.5018, radius: 250, name: 'Beirut' },
    { lat: 41.0082, lon: 28.9784, radius: 300, name: 'Istanbul' },
    
    // Südasien
    { lat: 28.7041, lon: 77.1025, radius: 400, name: 'New Delhi' },
    { lat: 19.0760, lon: 72.8777, radius: 400, name: 'Mumbai' },
    { lat: 13.0827, lon: 80.2707, radius: 300, name: 'Chennai' },
    { lat: 22.5726, lon: 88.3639, radius: 300, name: 'Kolkata' },
    { lat: 23.8103, lon: 90.4125, radius: 300, name: 'Dhaka' },
    { lat: 6.9271, lon: 79.8612, radius: 300, name: 'Colombo' },
    
    // Südostasien
    { lat: 13.7563, lon: 100.5018, radius: 300, name: 'Bangkok' },
    { lat: 21.0285, lon: 105.8542, radius: 300, name: 'Hanoi' },
    { lat: 10.8231, lon: 106.6297, radius: 300, name: 'Ho Chi Minh' },
    { lat: 3.1390, lon: 101.6869, radius: 300, name: 'Kuala Lumpur' },
    { lat: 1.3521, lon: 103.8198, radius: 250, name: 'Singapore' },
    { lat: 14.5995, lon: 120.9842, radius: 300, name: 'Manila' },
    { lat: -6.2088, lon: 106.8456, radius: 400, name: 'Jakarta' },
    { lat: -8.4095, lon: 115.1889, radius: 300, name: 'Bali' },
    
    // Ostasien
    { lat: 35.6762, lon: 139.6503, radius: 400, name: 'Tokyo' },
    { lat: 34.6937, lon: 135.5023, radius: 300, name: 'Osaka' },
    { lat: 37.5665, lon: 126.9780, radius: 300, name: 'Seoul' },
    { lat: 39.9042, lon: 116.4074, radius: 400, name: 'Beijing' },
    { lat: 31.2304, lon: 121.4737, radius: 400, name: 'Shanghai' },
    { lat: 23.1291, lon: 113.2644, radius: 300, name: 'Guangzhou' },
    { lat: 22.3193, lon: 114.1694, radius: 300, name: 'Hong Kong' },
    { lat: 25.0330, lon: 121.5654, radius: 300, name: 'Taipei' },
    
    // Ozeanien
    { lat: -33.8688, lon: 151.2093, radius: 400, name: 'Sydney' },
    { lat: -37.8136, lon: 144.9631, radius: 400, name: 'Melbourne' },
    { lat: -27.4698, lon: 153.0251, radius: 300, name: 'Brisbane' },
    { lat: -31.9505, lon: 115.8605, radius: 300, name: 'Perth' },
    { lat: -41.2865, lon: 174.7762, radius: 300, name: 'Wellington' },
    { lat: -36.8485, lon: 174.7633, radius: 300, name: 'Auckland' },
];

function isInGoldenHour(lat, lng, now) {
    const sunPos = SunCalc.getPosition(now, lat, lng);
    const altitude = sunPos.altitude * 180 / Math.PI;
    return altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX;
}

// Finde aktive Sampling-Punkte
function getActiveSamplingPoints(now) {
    return WORLD_SAMPLING_POINTS.filter(point => 
        isInGoldenHour(point.lat, point.lon, now)
    );
}

// Lade Webcams für einen Punkt
async function fetchNearbyWebcams(point, limit = 50) {
    const url = `https://api.windy.com/webcams/api/v3/list/nearby=${point.lat},${point.lon},${point.radius}?limit=${limit}&include=location,images,player,urls`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result?.webcams || [];
        }
    } catch (error) {
        console.error(`  ❌ ${point.name}: ${error.message}`);
    }
    
    return [];
}

async function fetchGoldenHourWebcams() {
    const now = Date.now();
    
    if (webcamCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
        console.log(`📦 Cache: ${webcamCache.length} Webcams (${Math.floor((now - lastCacheUpdate) / 60000)}m alt)`);
        return webcamCache;
    }
    
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Webcam Scan');
    console.log('   Nearby-Strategie mit Sampling-Punkten');
    console.log('🌅 ========================================\n');
    
    const currentTime = new Date();
    const activePoints = getActiveSamplingPoints(currentTime);
    
    console.log(`📍 ${activePoints.length}/${WORLD_SAMPLING_POINTS.length} Punkte in Golden Hour`);
    console.log(`🌍 Aktive Regionen: ${activePoints.map(p => p.name).slice(0, 10).join(', ')}${activePoints.length > 10 ? '...' : ''}\n`);
    
    const allWebcams = new Map();
    let totalRequests = 0;
    
    // Batch-Verarbeitung
    const BATCH_SIZE = 10;
    for (let i = 0; i < activePoints.length; i += BATCH_SIZE) {
        const batch = activePoints.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(activePoints.length / BATCH_SIZE);
        
        console.log(`📦 Batch ${batchNum}/${totalBatches}:`);
        
        const promises = batch.map(point => fetchNearbyWebcams(point));
        const results = await Promise.all(promises);
        
        results.forEach((webcams, idx) => {
            const point = batch[idx];
            totalRequests++;
            
            if (webcams.length > 0) {
                console.log(`  ✅ ${point.name}: ${webcams.length} Webcams`);
                webcams.forEach(w => {
                    if (w.images?.current && w.player && (w.player.live || w.player.day)) {
                        allWebcams.set(w.webcamId, w);
                    }
                });
            } else {
                console.log(`  ⚪ ${point.name}: keine Webcams`);
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Scan-Statistik:`);
    console.log(`   Punkte abgefragt: ${activePoints.length}`);
    console.log(`   API-Requests: ${totalRequests}`);
    console.log(`   Webcams gefunden: ${allWebcams.size}`);
    console.log('\n🔍 Führe PRÄZISE Filterung durch...\n');
    
    // Präzise Filterung
    const filtered = [];
    const premium = [];
    let filteredOut = 0;
    
    allWebcams.forEach(webcam => {
        const sunPos = SunCalc.getPosition(currentTime, webcam.location.latitude, webcam.location.longitude);
        const altitude = sunPos.altitude * 180 / Math.PI;
        
        if (altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX) {
            webcam.sunAlt = altitude;
            
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
    
    filtered.sort((a, b) => {
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        const optimalAngle = -1.5;
        return Math.abs(a.sunAlt - optimalAngle) - Math.abs(b.sunAlt - optimalAngle);
    });
    
    console.log(`✅ Nach Filterung: ${filtered.length} Webcams in Golden Hour`);
    console.log(`   ⭐ Premium: ${premium.length}`);
    console.log(`   🌅 Extended: ${filtered.length - premium.length}`);
    console.log(`🚫 Herausgefiltert: ${filteredOut}`);
    
    // Geografische Verteilung
    const byContinent = { 'Europa': 0, 'Asien': 0, 'Afrika': 0, 'Nordamerika': 0, 'Südamerika': 0, 'Ozeanien': 0 };
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
        if (count > 0) console.log(`   ${continent}: ${count}`);
    });
    
    webcamCache = filtered;
    lastCacheUpdate = now;
    console.log(`\n⏱️  Cache gültig für ${CACHE_DURATION / 60000} Minuten\n`);
    
    return filtered;
}

// APIs
app.get('/', async (req, res) => {
    const activePoints = getActiveSamplingPoints(new Date());
    res.json({
        status: 'ok',
        message: 'Golden Hour Backend - Nearby Strategie',
        version: '5.0',
        strategy: {
            method: 'nearby',
            samplingPoints: WORLD_SAMPLING_POINTS.length,
            activePoints: activePoints.length,
            activeRegions: activePoints.slice(0, 10).map(p => p.name)
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

app.get('/api/webcams', async (req, res) => {
    try {
        const webcams = await fetchGoldenHourWebcams();
        res.json({
            webcams: webcams,
            meta: {
                total: webcams.length,
                premium: webcams.filter(w => w.isPremium).length,
                cached: (Date.now() - lastCacheUpdate) < CACHE_DURATION,
                cacheAgeMinutes: Math.floor((Date.now() - lastCacheUpdate) / 60000),
                strategy: 'nearby',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Fehler:', error);
        res.status(500).json({ error: error.message, webcams: [] });
    }
});

app.get('/api/stats', async (req, res) => {
    const webcams = await fetchGoldenHourWebcams();
    const byCountry = {};
    webcams.forEach(w => {
        const country = w.location.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    res.json({
        total: webcams.length,
        premium: webcams.filter(w => w.isPremium).length,
        strategy: 'nearby sampling',
        samplingPoints: WORLD_SAMPLING_POINTS.length,
        byCountry: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([country, count]) => ({ country, count }))
    });
});

app.post('/api/refresh', async (req, res) => {
    webcamCache = [];
    lastCacheUpdate = 0;
    const webcams = await fetchGoldenHourWebcams();
    res.json({ success: true, webcams: webcams.length });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Backend v5.0');
    console.log('   Nearby-Strategie (Box-Filter defekt)');
    console.log('🌅 ========================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   Sampling-Punkte: ${WORLD_SAMPLING_POINTS.length}`);
    console.log(`   Golden Hour: ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`);
    console.log('\n   Lade initiale Webcams...\n');
    await fetchGoldenHourWebcams();
    console.log('\n✅ Backend bereit!\n');
});
