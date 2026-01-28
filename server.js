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

// ========================================
// LÄNDER-DEFINITIONEN
// ========================================

// Kleine/mittlere Länder → country parameter
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

// Große Länder → region parameter (mit Punkt-Notation!)
const LARGE_COUNTRIES = [
    {
        code: 'US',
        name: 'USA',
        minLon: -125.0,
        maxLon: -66.9,
        regions: [
            { code: 'US.CA', name: 'California', lat: 36.7, lon: -119.4 },
            { code: 'US.NY', name: 'New York', lat: 42.5, lon: -75.5 },
            { code: 'US.FL', name: 'Florida', lat: 27.6, lon: -81.5 },
            { code: 'US.TX', name: 'Texas', lat: 31.0, lon: -100.0 },
            { code: 'US.WA', name: 'Washington', lat: 47.4, lon: -121.4 },
            { code: 'US.CO', name: 'Colorado', lat: 39.0, lon: -105.5 },
            { code: 'US.AZ', name: 'Arizona', lat: 34.0, lon: -111.0 },
            { code: 'US.MA', name: 'Massachusetts', lat: 42.4, lon: -71.4 },
            { code: 'US.IL', name: 'Illinois', lat: 40.0, lon: -89.0 },
            { code: 'US.PA', name: 'Pennsylvania', lat: 40.9, lon: -77.8 },
            { code: 'US.GA', name: 'Georgia', lat: 32.7, lon: -83.5 },
            { code: 'US.NC', name: 'North Carolina', lat: 35.5, lon: -79.0 },
            { code: 'US.MI', name: 'Michigan', lat: 44.3, lon: -85.6 },
            { code: 'US.OR', name: 'Oregon', lat: 43.8, lon: -120.5 },
            { code: 'US.NV', name: 'Nevada', lat: 38.8, lon: -116.4 },
        ]
    },
    {
        code: 'CA',
        name: 'Kanada',
        minLon: -141.0,
        maxLon: -52.6,
        regions: [
            { code: 'CA.ON', name: 'Ontario', lat: 51.2, lon: -85.3 },
            { code: 'CA.QC', name: 'Quebec', lat: 52.9, lon: -73.5 },
            { code: 'CA.BC', name: 'British Columbia', lat: 53.7, lon: -127.6 },
            { code: 'CA.AB', name: 'Alberta', lat: 53.9, lon: -116.5 },
            { code: 'CA.MB', name: 'Manitoba', lat: 53.7, lon: -98.8 },
            { code: 'CA.SK', name: 'Saskatchewan', lat: 52.9, lon: -106.4 },
            { code: 'CA.NS', name: 'Nova Scotia', lat: 44.7, lon: -63.6 },
            { code: 'CA.NB', name: 'New Brunswick', lat: 46.5, lon: -66.2 },
        ]
    },
    {
        code: 'BR',
        name: 'Brasilien',
        minLon: -73.9,
        maxLon: -34.8,
        regions: [
            { code: 'BR.SP', name: 'São Paulo', lat: -23.5, lon: -46.6 },
            { code: 'BR.RJ', name: 'Rio de Janeiro', lat: -22.9, lon: -43.2 },
            { code: 'BR.MG', name: 'Minas Gerais', lat: -18.5, lon: -44.4 },
            { code: 'BR.BA', name: 'Bahia', lat: -12.9, lon: -41.7 },
            { code: 'BR.RS', name: 'Rio Grande do Sul', lat: -30.0, lon: -51.2 },
            { code: 'BR.PR', name: 'Paraná', lat: -25.3, lon: -51.2 },
            { code: 'BR.SC', name: 'Santa Catarina', lat: -27.2, lon: -50.2 },
            { code: 'BR.PE', name: 'Pernambuco', lat: -8.3, lon: -37.9 },
            { code: 'BR.CE', name: 'Ceará', lat: -5.5, lon: -39.3 },
            { code: 'BR.PA', name: 'Pará', lat: -3.0, lon: -52.0 },
        ]
    },
    {
        code: 'AU',
        name: 'Australien',
        minLon: 113.3,
        maxLon: 153.6,
        regions: [
            { code: 'AU.NSW', name: 'New South Wales', lat: -32.0, lon: 147.0 },
            { code: 'AU.VIC', name: 'Victoria', lat: -37.0, lon: 144.0 },
            { code: 'AU.QLD', name: 'Queensland', lat: -22.5, lon: 144.0 },
            { code: 'AU.WA', name: 'Western Australia', lat: -26.0, lon: 121.0 },
            { code: 'AU.SA', name: 'South Australia', lat: -30.0, lon: 135.0 },
            { code: 'AU.TAS', name: 'Tasmania', lat: -42.0, lon: 146.8 },
            { code: 'AU.NT', name: 'Northern Territory', lat: -19.5, lon: 133.0 },
            { code: 'AU.ACT', name: 'Australian Capital Territory', lat: -35.5, lon: 149.0 },
        ]
    },
    {
        code: 'AR',
        name: 'Argentinien',
        minLon: -73.6,
        maxLon: -53.6,
        regions: [
            { code: 'AR.C', name: 'Buenos Aires City', lat: -34.6, lon: -58.4 },
            { code: 'AR.B', name: 'Buenos Aires', lat: -36.7, lon: -60.0 },
            { code: 'AR.X', name: 'Córdoba', lat: -31.4, lon: -64.2 },
            { code: 'AR.M', name: 'Mendoza', lat: -34.0, lon: -68.5 },
            { code: 'AR.S', name: 'Santa Fe', lat: -31.0, lon: -61.0 },
            { code: 'AR.A', name: 'Salta', lat: -24.8, lon: -65.4 },
            { code: 'AR.T', name: 'Tucumán', lat: -26.8, lon: -65.2 },
        ]
    },
    {
        code: 'MX',
        name: 'Mexiko',
        minLon: -117.1,
        maxLon: -86.7,
        regions: [
            { code: 'MX.CMX', name: 'Mexico City', lat: 19.4, lon: -99.1 },
            { code: 'MX.JAL', name: 'Jalisco', lat: 20.7, lon: -103.4 },
            { code: 'MX.NLE', name: 'Nuevo León', lat: 25.6, lon: -100.0 },
            { code: 'MX.BCN', name: 'Baja California', lat: 30.0, lon: -115.0 },
            { code: 'MX.VER', name: 'Veracruz', lat: 19.5, lon: -96.4 },
            { code: 'MX.PUE', name: 'Puebla', lat: 19.0, lon: -98.2 },
            { code: 'MX.QRO', name: 'Querétaro', lat: 20.6, lon: -100.4 },
            { code: 'MX.GUA', name: 'Guanajuato', lat: 21.0, lon: -101.3 },
        ]
    },
    {
        code: 'IN',
        name: 'Indien',
        minLon: 68.2,
        maxLon: 97.4,
        regions: [
            { code: 'IN.DL', name: 'Delhi', lat: 28.7, lon: 77.1 },
            { code: 'IN.MH', name: 'Maharashtra', lat: 19.0, lon: 75.0 },
            { code: 'IN.TN', name: 'Tamil Nadu', lat: 11.0, lon: 78.0 },
            { code: 'IN.WB', name: 'West Bengal', lat: 23.8, lon: 87.8 },
            { code: 'IN.KA', name: 'Karnataka', lat: 15.3, lon: 75.7 },
            { code: 'IN.TG', name: 'Telangana', lat: 18.1, lon: 79.0 },
            { code: 'IN.GJ', name: 'Gujarat', lat: 22.3, lon: 71.6 },
            { code: 'IN.RJ', name: 'Rajasthan', lat: 27.0, lon: 74.0 },
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
    const sampleLat = 45;
    const westInGH = isInGoldenHour(sampleLat, country.minLon, now);
    const eastInGH = isInGoldenHour(sampleLat, country.maxLon, now);
    return westInGH || eastInGH;
}

// Finde aktive Regionen in großen Ländern
function getActiveRegionsInCountry(country, now) {
    return country.regions.filter(region => 
        isInGoldenHour(region.lat, region.lon, now)
    );
}

// ========================================
// API CALLS
// ========================================

async function fetchCountryWebcams(countryCode, limit = 50) {
    const url = `https://api.windy.com/webcams/api/v3/webcams?countries=${countryCode}&limit=${limit}`;
    
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

async function fetchRegionWebcams(regionCode, limit = 50) {
    const url = `https://api.windy.com/webcams/api/v3/webcams?regions=${regionCode}&limit=${limit}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result?.webcams || [];
        } else {
            console.error(`  ❌ ${regionCode}: HTTP ${response.status}`);
        }
    } catch (error) {
        console.error(`  ❌ ${regionCode}: ${error.message}`);
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
    console.log('   Golden Hour Webcam Scan v7.0');
    console.log('   Hybrid Country/Region Strategie');
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
        activeRegions: getActiveRegionsInCountry(country, currentTime)
    })).filter(country => country.activeRegions.length > 0);
    
    console.log(`📊 Länder-Analyse:`);
    console.log(`   Kleine Länder: ${activeSmallCountries.length}/${SMALL_COUNTRIES.length} aktiv`);
    console.log(`   Große Länder: ${activeLargeCountries.length}/${LARGE_COUNTRIES.length} aktiv`);
    console.log(`   Regionen in großen Ländern: ${activeLargeCountries.reduce((sum, c) => sum + c.activeRegions.length, 0)}\n`);
    
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
        console.log(`🗺️  Aktive große Länder:`);
        activeLargeCountries.forEach(c => {
            const regionNames = c.activeRegions.map(r => r.name).join(', ');
            console.log(`   • ${c.name}: ${c.activeRegions.length} Regionen (${regionNames})`);
        });
        console.log('');
    }
    
    // ========================================
    // SCHRITT 2: API Calls
    // ========================================
    
    const allWebcams = new Map();
    let totalRequests = 0;
    
    // 2a) Kleine Länder via country parameter
    if (activeSmallCountries.length > 0) {
        console.log('📦 Lade kleine Länder (country parameter)...\n');
        
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
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('');
    }
    
    // 2b) Große Länder via region parameter
    if (activeLargeCountries.length > 0) {
        console.log('🗺️  Lade große Länder (region parameter)...\n');
        
        for (const country of activeLargeCountries) {
            console.log(`  ${country.name}:`);
            
            for (const region of country.activeRegions) {
                const webcams = await fetchRegionWebcams(region.code);
                totalRequests++;
                
                if (webcams.length > 0) {
                    console.log(`    ✅ ${region.name}: ${webcams.length} Webcams`);
                    webcams.forEach(w => {
                        if (w.images?.current && w.player && (w.player.live || w.player.day) && w.status === 'active') {
                            allWebcams.set(w.webcamId, w);
                        }
                    });
                } else {
                    console.log(`    ⚪ ${region.name}: keine Webcams`);
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
        activeRegions: getActiveRegionsInCountry(country, currentTime).map(r => r.name)
    })).filter(country => country.activeRegions.length > 0);
    
    res.json({
        status: 'ok',
        message: 'Golden Hour Backend - Hybrid Country/Region Strategie',
        version: '7.0',
        strategy: {
            method: 'hybrid',
            description: 'country= für kleine Länder + region= für große Länder',
            smallCountriesTotal: SMALL_COUNTRIES.length,
            largeCountriesTotal: LARGE_COUNTRIES.length,
            activeSmallCountries: activeSmallCountries.length,
            activeLargeCountries: activeLargeCountries.length,
            activeRegions: activeLargeCountries.reduce((sum, c) => sum + c.activeRegions.length, 0)
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
        },
        testEndpoints: {
            singleCountry: '/api/test/country/:code (z.B. /api/test/country/US)',
            singleRegion: '/api/test/region/:code (z.B. /api/test/region/US.CA)',
            compare: '/api/test/compare'
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
                strategy: 'hybrid (country + region)',
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
        strategy: 'hybrid (country + region)',
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
// TEST ENDPOINTS
// ========================================

app.get('/api/test/country/:code', async (req, res) => {
    const { code } = req.params;
    const limit = req.query.limit || 50;
    const url = `https://api.windy.com/webcams/api/v3/webcams?countries=${code}&limit=${limit}`;
    
    console.log(`\n🧪 TEST: Single Country`);
    console.log(`   Code: ${code}`);
    console.log(`   URL: ${url}\n`);
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        const data = await response.json();
        const webcams = data.result?.webcams || [];
        
        const countries = {};
        const regions = {};
        webcams.forEach(w => {
            const country = w.location?.country || 'Unknown';
            const region = w.location?.region || 'Unknown';
            countries[country] = (countries[country] || 0) + 1;
            regions[region] = (regions[region] || 0) + 1;
        });
        
        console.log(`✅ Erfolg: ${webcams.length} Webcams`);
        console.log(`   Länder: ${Object.keys(countries).join(', ')}`);
        console.log(`   Regionen: ${Object.keys(regions).length}\n`);
        
        res.json({
            test: 'single_country',
            code: code,
            url: url,
            status: response.status,
            success: response.ok,
            total: data.result?.total || 0,
            returned: webcams.length,
            countries: countries,
            regions: Object.keys(regions).length,
            regionList: regions,
            sample: webcams.slice(0, 5).map(w => ({
                id: w.webcamId,
                title: w.title,
                location: `${w.location?.city}, ${w.location?.region}, ${w.location?.country}`,
                coordinates: `${w.location?.latitude.toFixed(2)}, ${w.location?.longitude.toFixed(2)}`,
                region_code: w.location?.region_code,
                hasLive: !!w.player?.live,
                hasDay: !!w.player?.day
            }))
        });
        
    } catch (error) {
        console.error(`❌ Fehler: ${error.message}\n`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/region/:code', async (req, res) => {
    const { code } = req.params;
    const limit = req.query.limit || 50;
    const url = `https://api.windy.com/webcams/api/v3/webcams?regions=${code}&limit=${limit}`;
    
    console.log(`\n🧪 TEST: Single Region`);
    console.log(`   Code: ${code}`);
    console.log(`   URL: ${url}\n`);
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        const data = await response.json();
        const webcams = data.result?.webcams || [];
        
        const regions = {};
        webcams.forEach(w => {
            const regionCode = w.location?.region_code || 'Unknown';
            regions[regionCode] = (regions[regionCode] || 0) + 1;
        });
        
        console.log(`✅ Erfolg: ${webcams.length} Webcams`);
        console.log(`   Region-Codes: ${Object.keys(regions).join(', ')}\n`);
        
        res.json({
            test: 'single_region',
            code: code,
            url: url,
            status: response.status,
            success: response.ok,
            total: data.result?.total || 0,
            returned: webcams.length,
            regionCodes: regions,
            sample: webcams.slice(0, 5).map(w => ({
                id: w.webcamId,
                title: w.title,
                region: w.location?.region,
                regionCode: w.location?.region_code,
                coordinates: `${w.location?.latitude.toFixed(2)}, ${w.location?.longitude.toFixed(2)}`
            }))
        });
        
    } catch (error) {
        console.error(`❌ Fehler: ${error.message}\n`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/compare', async (req, res) => {
    console.log(`\n🧪 TEST: Country vs Region Vergleich (USA)\n`);
    
    try {
        // Test 1: Country (ganzes Land)
        const countryUrl = `https://api.windy.com/webcams/api/v3/webcams?countries=US&limit=50`;
        const countryResponse = await fetch(countryUrl, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        const countryData = await countryResponse.json();
        const countryWebcams = countryData.result?.webcams || [];
        
        console.log(`🇺🇸 Country (US): ${countryWebcams.length} Webcams`);
        
        // Test 2: Region (California)
        const regionUrl = `https://api.windy.com/webcams/api/v3/webcams?regions=US.CA&limit=50`;
        const regionResponse = await fetch(regionUrl, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        const regionData = await regionResponse.json();
        const regionWebcams = regionData.result?.webcams || [];
        
        console.log(`🗺️  Region (US.CA): ${regionWebcams.length} Webcams`);
        
        // Analyse: Wie viele CA-Webcams sind im Country-Result?
        const caWebcamsInCountry = countryWebcams.filter(w => 
            w.location?.region_code === 'US.CA'
        ).length;
        
        console.log(`📊 CA-Webcams im Country-Result: ${caWebcamsInCountry}`);
        
        let conclusion = '';
        if (regionWebcams.length > countryWebcams.length * 0.5) {
            conclusion = `🎯 Region liefert viele Webcams (${regionWebcams.length}) - Region-Filter ist EFFEKTIV!`;
        } else if (regionWebcams.length > 0) {
            conclusion = `✅ Region funktioniert (${regionWebcams.length} Webcams)`;
        } else {
            conclusion = `❌ Region liefert keine Webcams - nutze country stattdessen`;
        }
        
        console.log(`${conclusion}\n`);
        
        res.json({
            test: 'country_vs_region',
            country: {
                method: 'country=US',
                total: countryWebcams.length,
                caWebcams: caWebcamsInCountry,
                url: countryUrl
            },
            region: {
                method: 'region=US.CA',
                total: regionWebcams.length,
                url: regionUrl
            },
            conclusion: conclusion,
            recommendation: regionWebcams.length > 0 ? 'regions' : 'country'
        });
        
    } catch (error) {
        console.error(`❌ Fehler: ${error.message}\n`);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Backend v7.0');
    console.log('   Hybrid Country/Region Strategie');
    console.log('🌅 ========================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   Kleine Länder: ${SMALL_COUNTRIES.length} (via country)`);
    console.log(`   Große Länder: ${LARGE_COUNTRIES.length} (via region)`);
    console.log(`   Golden Hour: ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`);
    console.log('\n   Lade initiale Webcams...\n');
    await fetchGoldenHourWebcams();
    console.log('\n✅ Backend bereit!\n');
});
