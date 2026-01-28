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
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten

// Nearby Radius
const NEARBY_RADIUS = 300; // km

// ========================================
// LÄNDER-DEFINITIONEN
// ========================================

// Kleine/mittlere Länder → country code
const SMALL_COUNTRIES = [
    // Europa
    { code: 'AT', name: 'Österreich', minLon: 9.5, maxLon: 17.2 },
    { code: 'CH', name: 'Schweiz', minLon: 5.9, maxLon: 10.5 },
    { code: 'NL', name: 'Niederlande', minLon: 3.4, maxLon: 7.2 },
    { code: 'BE', name: 'Belgien', minLon: 2.5, maxLon: 6.4 },
    { code: 'DK', name: 'Dänemark', minLon: 8.0, maxLon: 15.2 },
    { code: 'NO', name: 'Norwegen', minLon: 4.5, maxLon: 31.1 },
    { code: 'SE', name: 'Schweden', minLon: 11.0, maxLon: 24.2 },
    { code: 'FI', name: 'Finnland', minLon: 20.5, maxLon: 31.6 },
    { code: 'IS', name: 'Island', minLon: -24.5, maxLon: -13.5 },
    { code: 'IE', name: 'Irland', minLon: -10.5, maxLon: -6.0 },
    { code: 'GB', name: 'Vereinigtes Königreich', minLon: -8.6, maxLon: 1.8 },
    { code: 'PT', name: 'Portugal', minLon: -9.5, maxLon: -6.2 },
    { code: 'ES', name: 'Spanien', minLon: -9.3, maxLon: 4.3 },
    { code: 'FR', name: 'Frankreich', minLon: -5.1, maxLon: 9.6 },
    { code: 'DE', name: 'Deutschland', minLon: 5.9, maxLon: 15.0 },
    { code: 'IT', name: 'Italien', minLon: 6.6, maxLon: 18.5 },
    { code: 'GR', name: 'Griechenland', minLon: 19.4, maxLon: 28.2 },
    { code: 'PL', name: 'Polen', minLon: 14.1, maxLon: 24.1 },
    { code: 'CZ', name: 'Tschechien', minLon: 12.1, maxLon: 18.9 },
    { code: 'HU', name: 'Ungarn', minLon: 16.1, maxLon: 22.9 },
    { code: 'RO', name: 'Rumänien', minLon: 20.3, maxLon: 29.7 },
    { code: 'BG', name: 'Bulgarien', minLon: 22.4, maxLon: 28.6 },
    { code: 'HR', name: 'Kroatien', minLon: 13.5, maxLon: 19.4 },
    { code: 'SI', name: 'Slowenien', minLon: 13.4, maxLon: 16.6 },
    { code: 'SK', name: 'Slowakei', minLon: 16.8, maxLon: 22.6 },
    { code: 'EE', name: 'Estland', minLon: 21.8, maxLon: 28.2 },
    { code: 'LV', name: 'Lettland', minLon: 21.0, maxLon: 28.2 },
    { code: 'LT', name: 'Litauen', minLon: 21.0, maxLon: 26.8 },
    
    // Naher Osten
    { code: 'IL', name: 'Israel', minLon: 34.3, maxLon: 35.9 },
    { code: 'JO', name: 'Jordanien', minLon: 34.9, maxLon: 39.3 },
    { code: 'LB', name: 'Libanon', minLon: 35.1, maxLon: 36.6 },
    { code: 'AE', name: 'VAE', minLon: 51.5, maxLon: 56.4 },
    { code: 'QA', name: 'Katar', minLon: 50.7, maxLon: 51.6 },
    { code: 'KW', name: 'Kuwait', minLon: 46.5, maxLon: 48.5 },
    { code: 'BH', name: 'Bahrain', minLon: 50.4, maxLon: 50.7 },
    { code: 'OM', name: 'Oman', minLon: 52.0, maxLon: 59.8 },
    
    // Afrika
    { code: 'ZA', name: 'Südafrika', minLon: 16.5, maxLon: 32.9 },
    { code: 'EG', name: 'Ägypten', minLon: 24.7, maxLon: 36.9 },
    { code: 'MA', name: 'Marokko', minLon: -13.2, maxLon: -1.0 },
    { code: 'TN', name: 'Tunesien', minLon: 7.5, maxLon: 11.6 },
    { code: 'DZ', name: 'Algerien', minLon: -8.7, maxLon: 12.0 },
    { code: 'KE', name: 'Kenia', minLon: 33.9, maxLon: 41.9 },
    { code: 'TZ', name: 'Tansania', minLon: 29.3, maxLon: 40.4 },
    { code: 'UG', name: 'Uganda', minLon: 29.6, maxLon: 35.0 },
    { code: 'NG', name: 'Nigeria', minLon: 2.7, maxLon: 14.7 },
    { code: 'GH', name: 'Ghana', minLon: -3.3, maxLon: 1.2 },
    
    // Asien
    { code: 'JP', name: 'Japan', minLon: 129.4, maxLon: 145.8 },
    { code: 'KR', name: 'Südkorea', minLon: 126.0, maxLon: 129.6 },
    { code: 'TW', name: 'Taiwan', minLon: 120.0, maxLon: 122.0 },
    { code: 'PH', name: 'Philippinen', minLon: 116.9, maxLon: 126.6 },
    { code: 'TH', name: 'Thailand', minLon: 97.3, maxLon: 105.6 },
    { code: 'VN', name: 'Vietnam', minLon: 102.1, maxLon: 109.5 },
    { code: 'MY', name: 'Malaysia', minLon: 99.6, maxLon: 119.3 },
    { code: 'SG', name: 'Singapur', minLon: 103.6, maxLon: 104.0 },
    { code: 'BD', name: 'Bangladesch', minLon: 88.0, maxLon: 92.7 },
    { code: 'LK', name: 'Sri Lanka', minLon: 79.7, maxLon: 81.9 },
    { code: 'NP', name: 'Nepal', minLon: 80.1, maxLon: 88.2 },
    
    // Ozeanien
    { code: 'NZ', name: 'Neuseeland', minLon: 166.4, maxLon: 178.6 },
    
    // Südamerika
    { code: 'UY', name: 'Uruguay', minLon: -58.4, maxLon: -53.1 },
    { code: 'PY', name: 'Paraguay', minLon: -62.6, maxLon: -54.3 },
    { code: 'EC', name: 'Ecuador', minLon: -81.0, maxLon: -75.2 },
    { code: 'PE', name: 'Peru', minLon: -81.3, maxLon: -68.7 },
    { code: 'BO', name: 'Bolivien', minLon: -69.6, maxLon: -57.5 },
    { code: 'CL', name: 'Chile', minLon: -75.6, maxLon: -66.4 },
    { code: 'VE', name: 'Venezuela', minLon: -73.4, maxLon: -59.8 },
    { code: 'CO', name: 'Kolumbien', minLon: -79.0, maxLon: -66.9 },
    
    // Mittelamerika
    { code: 'CR', name: 'Costa Rica', minLon: -85.9, maxLon: -82.5 },
    { code: 'PA', name: 'Panama', minLon: -83.0, maxLon: -77.2 },
    { code: 'GT', name: 'Guatemala', minLon: -92.2, maxLon: -88.2 },
    { code: 'HN', name: 'Honduras', minLon: -89.4, maxLon: -83.1 },
    { code: 'NI', name: 'Nicaragua', minLon: -87.7, maxLon: -83.1 },
    { code: 'SV', name: 'El Salvador', minLon: -90.1, maxLon: -87.7 },
    { code: 'BZ', name: 'Belize', minLon: -89.2, maxLon: -88.1 },
    { code: 'CU', name: 'Kuba', minLon: -84.9, maxLon: -74.1 },
    { code: 'DO', name: 'Dominikanische Republik', minLon: -72.0, maxLon: -68.3 },
    { code: 'JM', name: 'Jamaika', minLon: -78.4, maxLon: -76.2 },
];

// Große Länder → nearby queries mit Großstädten
const LARGE_COUNTRIES = [
    {
        code: 'US',
        name: 'USA',
        minLon: -125.0,
        maxLon: -66.9,
        cities: [
            { lat: 40.7128, lon: -74.0060, name: 'New York' },
            { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
            { lat: 41.8781, lon: -87.6298, name: 'Chicago' },
            { lat: 29.7604, lon: -95.3698, name: 'Houston' },
            { lat: 33.4484, lon: -112.0740, name: 'Phoenix' },
            { lat: 39.7392, lon: -104.9903, name: 'Denver' },
            { lat: 47.6062, lon: -122.3321, name: 'Seattle' },
            { lat: 37.7749, lon: -122.4194, name: 'San Francisco' },
            { lat: 25.7617, lon: -80.1918, name: 'Miami' },
            { lat: 32.7157, lon: -117.1611, name: 'San Diego' },
            { lat: 33.7490, lon: -84.3880, name: 'Atlanta' },
            { lat: 42.3601, lon: -71.0589, name: 'Boston' },
            { lat: 39.9526, lon: -75.1652, name: 'Philadelphia' },
            { lat: 36.1699, lon: -115.1398, name: 'Las Vegas' },
        ]
    },
    {
        code: 'CA',
        name: 'Kanada',
        minLon: -141.0,
        maxLon: -52.6,
        cities: [
            { lat: 43.6532, lon: -79.3832, name: 'Toronto' },
            { lat: 45.5017, lon: -73.5673, name: 'Montreal' },
            { lat: 49.2827, lon: -123.1207, name: 'Vancouver' },
            { lat: 51.0447, lon: -114.0719, name: 'Calgary' },
            { lat: 53.5461, lon: -113.4938, name: 'Edmonton' },
            { lat: 45.4215, lon: -75.6972, name: 'Ottawa' },
        ]
    },
    {
        code: 'BR',
        name: 'Brasilien',
        minLon: -73.9,
        maxLon: -34.8,
        cities: [
            { lat: -23.5505, lon: -46.6333, name: 'São Paulo' },
            { lat: -22.9068, lon: -43.1729, name: 'Rio de Janeiro' },
            { lat: -15.8267, lon: -47.9218, name: 'Brasília' },
            { lat: -12.9714, lon: -38.5014, name: 'Salvador' },
            { lat: -25.4284, lon: -49.2733, name: 'Curitiba' },
            { lat: -3.1190, lon: -60.0217, name: 'Manaus' },
            { lat: -1.4558, lon: -48.5044, name: 'Belém' },
        ]
    },
    {
        code: 'RU',
        name: 'Russland',
        minLon: 19.6,
        maxLon: 180.0,
        cities: [
            { lat: 55.7558, lon: 37.6173, name: 'Moskau' },
            { lat: 59.9343, lon: 30.3351, name: 'St. Petersburg' },
            { lat: 56.8389, lon: 60.6057, name: 'Jekaterinburg' },
            { lat: 55.0084, lon: 82.9357, name: 'Nowosibirsk' },
            { lat: 43.1155, lon: 131.8855, name: 'Wladiwostok' },
            { lat: 56.0153, lon: 92.8932, name: 'Krasnojarsk' },
        ]
    },
    {
        code: 'CN',
        name: 'China',
        minLon: 73.5,
        maxLon: 135.1,
        cities: [
            { lat: 39.9042, lon: 116.4074, name: 'Peking' },
            { lat: 31.2304, lon: 121.4737, name: 'Shanghai' },
            { lat: 23.1291, lon: 113.2644, name: 'Guangzhou' },
            { lat: 22.3193, lon: 114.1694, name: 'Hongkong' },
            { lat: 30.5728, lon: 104.0668, name: 'Chengdu' },
            { lat: 34.3416, lon: 108.9398, name: 'Xi\'an' },
            { lat: 45.7560, lon: 126.6426, name: 'Harbin' },
        ]
    },
    {
        code: 'AU',
        name: 'Australien',
        minLon: 113.3,
        maxLon: 153.6,
        cities: [
            { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
            { lat: -37.8136, lon: 144.9631, name: 'Melbourne' },
            { lat: -27.4698, lon: 153.0251, name: 'Brisbane' },
            { lat: -31.9505, lon: 115.8605, name: 'Perth' },
            { lat: -34.9285, lon: 138.6007, name: 'Adelaide' },
            { lat: -12.4634, lon: 130.8456, name: 'Darwin' },
        ]
    },
    {
        code: 'IN',
        name: 'Indien',
        minLon: 68.2,
        maxLon: 97.4,
        cities: [
            { lat: 28.7041, lon: 77.1025, name: 'Neu-Delhi' },
            { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
            { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
            { lat: 22.5726, lon: 88.3639, name: 'Kolkata' },
            { lat: 12.9716, lon: 77.5946, name: 'Bangalore' },
            { lat: 17.3850, lon: 78.4867, name: 'Hyderabad' },
        ]
    },
    {
        code: 'AR',
        name: 'Argentinien',
        minLon: -73.6,
        maxLon: -53.6,
        cities: [
            { lat: -34.6037, lon: -58.3816, name: 'Buenos Aires' },
            { lat: -31.4201, lon: -64.1888, name: 'Córdoba' },
            { lat: -32.8895, lon: -68.8458, name: 'Mendoza' },
            { lat: -24.7859, lon: -65.4117, name: 'Salta' },
            { lat: -38.9516, lon: -68.0591, name: 'Neuquén' },
        ]
    },
    {
        code: 'MX',
        name: 'Mexiko',
        minLon: -117.1,
        maxLon: -86.7,
        cities: [
            { lat: 19.4326, lon: -99.1332, name: 'Mexiko-Stadt' },
            { lat: 25.6866, lon: -100.3161, name: 'Monterrey' },
            { lat: 20.6597, lon: -103.3496, name: 'Guadalajara' },
            { lat: 21.8853, lon: -102.2916, name: 'Aguascalientes' },
            { lat: 32.5027, lon: -117.0038, name: 'Tijuana' },
        ]
    },
    {
        code: 'ID',
        name: 'Indonesien',
        minLon: 95.0,
        maxLon: 141.0,
        cities: [
            { lat: -6.2088, lon: 106.8456, name: 'Jakarta' },
            { lat: -8.4095, lon: 115.1889, name: 'Bali' },
            { lat: -7.2575, lon: 112.7521, name: 'Surabaya' },
            { lat: 3.5952, lon: 98.6722, name: 'Medan' },
            { lat: -0.9471, lon: 100.4172, name: 'Padang' },
        ]
    },
    {
        code: 'TR',
        name: 'Türkei',
        minLon: 26.0,
        maxLon: 44.8,
        cities: [
            { lat: 41.0082, lon: 28.9784, name: 'Istanbul' },
            { lat: 39.9334, lon: 32.8597, name: 'Ankara' },
            { lat: 38.4237, lon: 27.1428, name: 'Izmir' },
            { lat: 36.8969, lon: 30.7133, name: 'Antalya' },
        ]
    },
    {
        code: 'SA',
        name: 'Saudi-Arabien',
        minLon: 34.5,
        maxLon: 55.7,
        cities: [
            { lat: 24.7136, lon: 46.6753, name: 'Riad' },
            { lat: 21.3891, lon: 39.8579, name: 'Dschidda' },
            { lat: 26.4207, lon: 50.0888, name: 'Dammam' },
        ]
    },
];

// ========================================
// GOLDEN HOUR FUNKTIONEN
// ========================================

function isInGoldenHour(lat, lng, now) {
    const sunPos = SunCalc.getPosition(now, lat, lng);
    const altitude = sunPos.altitude * 180 / Math.PI;
    return altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX;
}

// Prüfe ob ein Land in Golden Hour ist (via Longitude)
function isCountryInGoldenHour(country, now) {
    // Prüfe ob IRGENDEIN Punkt des Landes in Golden Hour sein könnte
    // Wir prüfen die westlichste und östlichste Grenze
    
    // Sample mit mittlerer Latitude (z.B. 45° für gemäßigte Breiten)
    const sampleLat = 45;
    
    // Prüfe westlichste Grenze
    const westInGH = isInGoldenHour(sampleLat, country.minLon, now);
    
    // Prüfe östlichste Grenze
    const eastInGH = isInGoldenHour(sampleLat, country.maxLon, now);
    
    // Wenn eine der Grenzen in GH ist, ist das Land aktiv
    return westInGH || eastInGH;
}

// Finde aktive Städte in großen Ländern
function getActiveCitiesInCountry(country, now) {
    return country.cities.filter(city => 
        isInGoldenHour(city.lat, city.lon, now)
    );
}

// ========================================
// API CALLS
// ========================================

async function fetchCountryWebcams(countryCode, limit = 50) {
    const url = `https://api.windy.com/webcams/api/v3/list?countries=${countryCode}&limit=${limit}&include=location,images,player,urls`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result?.webcams || [];
        } else {
            console.error(`  ❌ ${countryCode}: HTTP ${response.status}`);
        }
    } catch (error) {
        console.error(`  ❌ ${countryCode}: ${error.message}`);
    }
    
    return [];
}

async function fetchNearbyWebcams(city, radius = NEARBY_RADIUS, limit = 50) {
    const url = `https://api.windy.com/webcams/api/v3/list?nearby=${city.lat},${city.lon},${radius}&limit=${limit}&include=location,images,player,urls`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result?.webcams || [];
        } else {
            console.error(`  ❌ ${city.name}: HTTP ${response.status}`);
        }
    } catch (error) {
        console.error(`  ❌ ${city.name}: ${error.message}`);
    }
    
    return [];
}

// ========================================
// HAUPT-LOGIK
// ========================================

async function fetchGoldenHourWebcams() {
    const now = Date.now();
    
    // Cache-Check
    if (webcamCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
        console.log(`📦 Cache: ${webcamCache.length} Webcams (${Math.floor((now - lastCacheUpdate) / 60000)}m alt)`);
        return webcamCache;
    }
    
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Webcam Scan');
    console.log('   Hybrid Country/Nearby Strategie');
    console.log('🌅 ========================================\n');
    
    const currentTime = new Date();
    
    // ========================================
    // SCHRITT 1: Finde Länder in Golden Hour
    // ========================================
    
    console.log('🔍 Analysiere Länder in Golden Hour...\n');
    
    const activeSmallCountries = SMALL_COUNTRIES.filter(country => 
        isCountryInGoldenHour(country, currentTime)
    );
    
    const activeLargeCountries = LARGE_COUNTRIES.map(country => ({
        ...country,
        activeCities: getActiveCitiesInCountry(country, currentTime)
    })).filter(country => country.activeCities.length > 0);
    
    console.log(`📊 Länder-Analyse:`);
    console.log(`   Kleine Länder: ${activeSmallCountries.length}/${SMALL_COUNTRIES.length} aktiv`);
    console.log(`   Große Länder: ${activeLargeCountries.length}/${LARGE_COUNTRIES.length} aktiv`);
    console.log(`   Städte in großen Ländern: ${activeLargeCountries.reduce((sum, c) => sum + c.activeCities.length, 0)}\n`);
    
    if (activeSmallCountries.length > 0) {
        console.log(`🌍 Aktive kleine Länder:`);
        activeSmallCountries.slice(0, 15).forEach(c => console.log(`   • ${c.name} (${c.code})`));
        if (activeSmallCountries.length > 15) {
            console.log(`   ... und ${activeSmallCountries.length - 15} weitere\n`);
        } else {
            console.log('');
        }
    }
    
    if (activeLargeCountries.length > 0) {
        console.log(`🏙️  Aktive große Länder:`);
        activeLargeCountries.forEach(c => {
            const cityNames = c.activeCities.map(city => city.name).join(', ');
            console.log(`   • ${c.name}: ${c.activeCities.length} Städte (${cityNames})`);
        });
        console.log('');
    }
    
    // ========================================
    // SCHRITT 2: API Calls
    // ========================================
    
    const allWebcams = new Map();
    let totalRequests = 0;
    
    // 2a) Kleine Länder via country code
    if (activeSmallCountries.length > 0) {
        console.log('📦 Lade kleine Länder (country codes)...\n');
        
        for (const country of activeSmallCountries) {
            const webcams = await fetchCountryWebcams(country.code);
            totalRequests++;
            
            if (webcams.length > 0) {
                console.log(`  ✅ ${country.name} (${country.code}): ${webcams.length} Webcams`);
                webcams.forEach(w => {
                    if (w.images?.current && w.player && (w.player.live || w.player.day) && w.status === 'active') {
                        allWebcams.set(w.webcamId, w);
                    }
                });
            } else {
                console.log(`  ⚪ ${country.name} (${country.code}): keine Webcams`);
            }
            
            // Kleine Pause zwischen Requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('');
    }
    
    // 2b) Große Länder via nearby
    if (activeLargeCountries.length > 0) {
        console.log('🏙️  Lade große Länder (nearby cities)...\n');
        
        for (const country of activeLargeCountries) {
            console.log(`  ${country.name}:`);
            
            for (const city of country.activeCities) {
                const webcams = await fetchNearbyWebcams(city);
                totalRequests++;
                
                if (webcams.length > 0) {
                    console.log(`    ✅ ${city.name}: ${webcams.length} Webcams`);
                    webcams.forEach(w => {
                        if (w.images?.current && w.player && (w.player.live || w.player.day) && w.status === 'active') {
                            allWebcams.set(w.webcamId, w);
                        }
                    });
                } else {
                    console.log(`    ⚪ ${city.name}: keine Webcams`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log('');
        }
    }
    
    console.log(`📊 API-Statistik:`);
    console.log(`   Requests: ${totalRequests}`);
    console.log(`   Unique Webcams: ${allWebcams.size}`);
    console.log('\n🔍 Führe PRÄZISE Golden Hour Filterung durch...\n');
    
    // ========================================
    // SCHRITT 3: Präzise Filterung
    // ========================================
    
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
    
    // Sortierung: Premium zuerst, dann nach optimalem Winkel
    filtered.sort((a, b) => {
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        const optimalAngle = -1.5;
        return Math.abs(a.sunAlt - optimalAngle) - Math.abs(b.sunAlt - optimalAngle);
    });
    
    console.log(`✅ Nach Filterung: ${filtered.length} Webcams in Golden Hour`);
    console.log(`   ⭐ Premium (${PREMIUM_MIN}° bis ${PREMIUM_MAX}°): ${premium.length}`);
    console.log(`   🌅 Extended (${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°): ${filtered.length - premium.length}`);
    console.log(`🚫 Herausgefiltert: ${filteredOut}`);
    
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
        if (count > 0) console.log(`   ${continent}: ${count}`);
    });
    
    webcamCache = filtered;
    lastCacheUpdate = now;
    console.log(`\n⏱️  Cache gültig für ${CACHE_DURATION / 60000} Minuten\n`);
    
    return filtered;
}

// ========================================
// EXPRESS ROUTES
// ========================================

app.get('/', async (req, res) => {
    const currentTime = new Date();
    
    const activeSmallCountries = SMALL_COUNTRIES.filter(country => 
        isCountryInGoldenHour(country, currentTime)
    );
    
    const activeLargeCountries = LARGE_COUNTRIES.map(country => ({
        name: country.name,
        code: country.code,
        activeCities: getActiveCitiesInCountry(country, currentTime).map(c => c.name)
    })).filter(country => country.activeCities.length > 0);
    
    res.json({
        status: 'ok',
        message: 'Golden Hour Backend - Hybrid Country/Nearby Strategie',
        version: '6.0',
        strategy: {
            method: 'hybrid',
            description: 'Country codes für kleine Länder + Nearby für große Länder',
            nearbyRadius: NEARBY_RADIUS,
            smallCountriesTotal: SMALL_COUNTRIES.length,
            largeCountriesTotal: LARGE_COUNTRIES.length,
            activeSmallCountries: activeSmallCountries.length,
            activeLargeCountries: activeLargeCountries.length,
            activeCities: activeLargeCountries.reduce((sum, c) => sum + c.activeCities.length, 0)
        },
        goldenHour: {
            range: `${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`,
            premiumRange: `${PREMIUM_MIN}° bis ${PREMIUM_MAX}°`
        },
        activeRegions: {
            smallCountries: activeSmallCountries.slice(0, 10).map(c => c.name),
            largeCountries: activeLargeCountries
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
                strategy: 'hybrid (country + nearby)',
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
        strategy: 'hybrid (country + nearby)',
        nearbyRadius: NEARBY_RADIUS,
        smallCountries: SMALL_COUNTRIES.length,
        largeCountries: LARGE_COUNTRIES.length,
        byCountry: Object.entries(byCountry)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([country, count]) => ({ country, count }))
    });
});

app.post('/api/refresh', async (req, res) => {
    webcamCache = [];
    lastCacheUpdate = 0;
    const webcams = await fetchGoldenHourWebcams();
    res.json({ success: true, webcams: webcams.length });
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Backend v6.0');
    console.log('   Hybrid Country/Nearby Strategie');
    console.log('🌅 ========================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   Kleine Länder: ${SMALL_COUNTRIES.length} (via country code)`);
    console.log(`   Große Länder: ${LARGE_COUNTRIES.length} (via nearby)`);
    console.log(`   Nearby Radius: ${NEARBY_RADIUS}km`);
    console.log(`   Golden Hour: ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`);
    console.log('\n   Lade initiale Webcams...\n');
    await fetchGoldenHourWebcams();
    console.log('\n✅ Backend bereit!\n');
});
