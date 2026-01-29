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

// Vor-Check: Großzügigeres Fenster für API-Calls
const PRE_CHECK_MIN = -12;
const PRE_CHECK_MAX = 12;

// Cache
let webcamCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten

// ========================================
// ZIEL-DEFINITIONEN (Länder + Regionen)
// ========================================

const TARGETS = [
    // ========================================
    // EUROPA (Länder)
    // ========================================
    { type: 'country', code: 'AT', name: 'Österreich', refLat: 47.5, refLon: 13.5 },
    { type: 'country', code: 'CH', name: 'Schweiz', refLat: 46.8, refLon: 8.2 },
    { type: 'country', code: 'DE', name: 'Deutschland', refLat: 51.0, refLon: 10.5 },
    { type: 'country', code: 'FR', name: 'Frankreich', refLat: 46.6, refLon: 2.3 },
    { type: 'country', code: 'IT', name: 'Italien', refLat: 42.8, refLon: 12.5 },
    { type: 'country', code: 'ES', name: 'Spanien', refLat: 40.4, refLon: -3.7 },
    { type: 'country', code: 'PT', name: 'Portugal', refLat: 39.4, refLon: -8.2 },
    { type: 'country', code: 'GB', name: 'Vereinigtes Königreich', refLat: 54.0, refLon: -2.5 },
    { type: 'country', code: 'IE', name: 'Irland', refLat: 53.4, refLon: -8.0 },
    { type: 'country', code: 'NL', name: 'Niederlande', refLat: 52.1, refLon: 5.3 },
    { type: 'country', code: 'BE', name: 'Belgien', refLat: 50.5, refLon: 4.5 },
    { type: 'country', code: 'DK', name: 'Dänemark', refLat: 56.3, refLon: 9.5 },
    { type: 'country', code: 'NO', name: 'Norwegen', refLat: 60.5, refLon: 8.5 },
    { type: 'country', code: 'SE', name: 'Schweden', refLat: 60.1, refLon: 18.6 },
    { type: 'country', code: 'FI', name: 'Finnland', refLat: 61.9, refLon: 25.7 },
    { type: 'country', code: 'IS', name: 'Island', refLat: 64.9, refLon: -19.0 },
    { type: 'country', code: 'PL', name: 'Polen', refLat: 51.9, refLon: 19.1 },
    { type: 'country', code: 'CZ', name: 'Tschechien', refLat: 49.8, refLon: 15.5 },
    { type: 'country', code: 'HU', name: 'Ungarn', refLat: 47.2, refLon: 19.5 },
    { type: 'country', code: 'RO', name: 'Rumänien', refLat: 45.9, refLon: 24.9 },
    { type: 'country', code: 'GR', name: 'Griechenland', refLat: 39.1, refLon: 21.8 },
    { type: 'country', code: 'HR', name: 'Kroatien', refLat: 45.1, refLon: 15.2 },
    { type: 'country', code: 'SI', name: 'Slowenien', refLat: 46.1, refLon: 14.9 },
    { type: 'country', code: 'SK', name: 'Slowakei', refLat: 48.7, refLon: 19.7 },
    { type: 'country', code: 'BG', name: 'Bulgarien', refLat: 42.7, refLon: 25.5 },
    { type: 'country', code: 'EE', name: 'Estland', refLat: 58.6, refLon: 25.0 },
    { type: 'country', code: 'LV', name: 'Lettland', refLat: 56.9, refLon: 24.6 },
    { type: 'country', code: 'LT', name: 'Litauen', refLat: 55.2, refLon: 23.9 },
    
    // ========================================
    // NORDAMERIKA
    // ========================================
    
    // USA (Regionen für bessere Abdeckung)
    { type: 'region', code: 'US.CA', name: 'Kalifornien', refLat: 36.7, refLon: -119.4 },
    { type: 'region', code: 'US.NY', name: 'New York', refLat: 42.5, refLon: -75.5 },
    { type: 'region', code: 'US.FL', name: 'Florida', refLat: 27.6, refLon: -81.5 },
    { type: 'region', code: 'US.TX', name: 'Texas', refLat: 31.0, refLon: -100.0 },
    { type: 'region', code: 'US.WA', name: 'Washington', refLat: 47.4, refLon: -121.4 },
    { type: 'region', code: 'US.CO', name: 'Colorado', refLat: 39.0, refLon: -105.5 },
    { type: 'region', code: 'US.AZ', name: 'Arizona', refLat: 34.0, refLon: -111.0 },
    { type: 'region', code: 'US.MA', name: 'Massachusetts', refLat: 42.4, refLon: -71.4 },
    { type: 'region', code: 'US.IL', name: 'Illinois', refLat: 40.0, refLon: -89.0 },
    { type: 'region', code: 'US.PA', name: 'Pennsylvania', refLat: 40.9, refLon: -77.8 },
    { type: 'region', code: 'US.HI', name: 'Hawaii', refLat: 21.3, refLon: -157.8 },
    { type: 'region', code: 'US.AK', name: 'Alaska', refLat: 64.0, refLon: -152.0 },
    
    // Kanada (Regionen)
    { type: 'region', code: 'CA.ON', name: 'Ontario', refLat: 51.2, refLon: -85.3 },
    { type: 'region', code: 'CA.QC', name: 'Quebec', refLat: 52.9, refLon: -73.5 },
    { type: 'region', code: 'CA.BC', name: 'British Columbia', refLat: 53.7, refLon: -127.6 },
    { type: 'region', code: 'CA.AB', name: 'Alberta', refLat: 53.9, refLon: -116.5 },
    
    // Mittelamerika & Karibik
    { type: 'country', code: 'MX', name: 'Mexiko', refLat: 23.6, refLon: -102.5 },
    { type: 'country', code: 'CR', name: 'Costa Rica', refLat: 9.7, refLon: -84.0 },
    { type: 'country', code: 'PA', name: 'Panama', refLat: 8.5, refLon: -80.8 },
    { type: 'country', code: 'CU', name: 'Kuba', refLat: 21.5, refLon: -77.8 },
    { type: 'country', code: 'DO', name: 'Dominikanische Republik', refLat: 18.7, refLon: -70.2 },
    { type: 'country', code: 'JM', name: 'Jamaika', refLat: 18.1, refLon: -77.3 },
    
    // ========================================
    // SÜDAMERIKA
    // ========================================
    
    // Brasilien (Regionen)
    { type: 'region', code: 'BR.SP', name: 'São Paulo', refLat: -23.5, refLon: -46.6 },
    { type: 'region', code: 'BR.RJ', name: 'Rio de Janeiro', refLat: -22.9, refLon: -43.2 },
    { type: 'region', code: 'BR.MG', name: 'Minas Gerais', refLat: -18.5, refLon: -44.4 },
    { type: 'region', code: 'BR.BA', name: 'Bahia', refLat: -12.9, refLon: -41.7 },
    { type: 'region', code: 'BR.RS', name: 'Rio Grande do Sul', refLat: -30.0, refLon: -51.2 },
    { type: 'region', code: 'BR.PR', name: 'Paraná', refLat: -25.3, refLon: -51.2 },
    
    // Argentinien (Regionen)
    { type: 'region', code: 'AR.C', name: 'Buenos Aires', refLat: -34.6, refLon: -58.4 },
    { type: 'region', code: 'AR.X', name: 'Córdoba', refLat: -31.4, refLon: -64.2 },
    { type: 'region', code: 'AR.M', name: 'Mendoza', refLat: -34.0, refLon: -68.5 },
    
    // Andere Südamerika
    { type: 'country', code: 'CL', name: 'Chile', refLat: -35.7, refLon: -71.5 },
    { type: 'country', code: 'PE', name: 'Peru', refLat: -9.2, refLon: -75.0 },
    { type: 'country', code: 'CO', name: 'Kolumbien', refLat: 4.6, refLon: -74.1 },
    { type: 'country', code: 'VE', name: 'Venezuela', refLat: 6.4, refLon: -66.6 },
    { type: 'country', code: 'EC', name: 'Ecuador', refLat: -1.8, refLon: -78.2 },
    { type: 'country', code: 'UY', name: 'Uruguay', refLat: -32.5, refLon: -55.8 },
    
    // ========================================
    // ASIEN
    // ========================================
    
    { type: 'country', code: 'JP', name: 'Japan', refLat: 36.2, refLon: 138.3 },
    { type: 'country', code: 'KR', name: 'Südkorea', refLat: 35.9, refLon: 127.8 },
    { type: 'country', code: 'CN', name: 'China', refLat: 35.9, refLon: 104.2 },
    { type: 'country', code: 'TW', name: 'Taiwan', refLat: 23.7, refLon: 121.0 },
    { type: 'country', code: 'TH', name: 'Thailand', refLat: 15.9, refLon: 100.9 },
    { type: 'country', code: 'VN', name: 'Vietnam', refLat: 14.1, refLon: 108.3 },
    { type: 'country', code: 'PH', name: 'Philippinen', refLat: 12.9, refLon: 121.8 },
    { type: 'country', code: 'MY', name: 'Malaysia', refLat: 4.2, refLon: 101.9 },
    { type: 'country', code: 'SG', name: 'Singapur', refLat: 1.4, refLon: 103.8 },
    { type: 'country', code: 'ID', name: 'Indonesien', refLat: -0.8, refLon: 113.9 },
    
    // Indien (Regionen für große Abdeckung)
    { type: 'region', code: 'IN.DL', name: 'Delhi', refLat: 28.7, refLon: 77.1 },
    { type: 'region', code: 'IN.MH', name: 'Maharashtra', refLat: 19.0, refLon: 75.0 },
    { type: 'region', code: 'IN.KA', name: 'Karnataka', refLat: 15.3, refLon: 75.7 },
    { type: 'region', code: 'IN.TN', name: 'Tamil Nadu', refLat: 11.0, refLon: 78.0 },
    
    // Naher Osten
    { type: 'country', code: 'TR', name: 'Türkei', refLat: 38.9, refLon: 35.2 },
    { type: 'country', code: 'IL', name: 'Israel', refLat: 31.0, refLon: 34.9 },
    { type: 'country', code: 'AE', name: 'VAE', refLat: 23.4, refLon: 53.8 },
    { type: 'country', code: 'SA', name: 'Saudi-Arabien', refLat: 23.9, refLon: 45.1 },
    { type: 'country', code: 'JO', name: 'Jordanien', refLat: 30.6, refLon: 36.2 },
    
    // ========================================
    // AFRIKA
    // ========================================
    
    { type: 'country', code: 'ZA', name: 'Südafrika', refLat: -30.6, refLon: 22.9 },
    { type: 'country', code: 'EG', name: 'Ägypten', refLat: 26.8, refLon: 30.8 },
    { type: 'country', code: 'MA', name: 'Marokko', refLat: 31.8, refLon: -7.1 },
    { type: 'country', code: 'TN', name: 'Tunesien', refLat: 33.9, refLon: 9.5 },
    { type: 'country', code: 'KE', name: 'Kenia', refLat: -0.0, refLon: 37.9 },
    { type: 'country', code: 'NG', name: 'Nigeria', refLat: 9.1, refLon: 8.7 },
    
    // ========================================
    // OZEANIEN
    // ========================================
    
    // Australien (Regionen)
    { type: 'region', code: 'AU.NSW', name: 'New South Wales', refLat: -32.0, refLon: 147.0 },
    { type: 'region', code: 'AU.VIC', name: 'Victoria', refLat: -37.0, refLon: 144.0 },
    { type: 'region', code: 'AU.QLD', name: 'Queensland', refLat: -22.5, refLon: 144.0 },
    { type: 'region', code: 'AU.WA', name: 'Western Australia', refLat: -26.0, refLon: 121.0 },
    
    { type: 'country', code: 'NZ', name: 'Neuseeland', refLat: -40.9, refLon: 174.9 },
];

// ========================================
// GOLDEN HOUR FUNKTIONEN
// ========================================

function getSunAltitude(lat, lon, time) {
    const sunPos = SunCalc.getPosition(time, lat, lon);
    return sunPos.altitude * 180 / Math.PI;
}

function isInPreCheckWindow(altitude) {
    return altitude >= PRE_CHECK_MIN && altitude <= PRE_CHECK_MAX;
}

function isInGoldenHour(altitude) {
    return altitude >= GOLDEN_HOUR_MIN && altitude <= GOLDEN_HOUR_MAX;
}

function isInPremiumWindow(altitude) {
    return altitude >= PREMIUM_MIN && altitude <= PREMIUM_MAX;
}

// Finde aktive Ziele (Vor-Check mit großzügigem Fenster)
function getActiveTargets(time) {
    return TARGETS.filter(target => {
        const altitude = getSunAltitude(target.refLat, target.refLon, time);
        return isInPreCheckWindow(altitude);
    });
}

// ========================================
// API CALLS
// ========================================

async function fetchWebcamsForTarget(target, limit = 50) {
    const param = target.type === 'country' ? 'countries' : 'regions';
    const url = `https://api.windy.com/webcams/api/v3/webcams?${param}=${target.code}&limit=${limit}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'x-windy-api-key': WINDY_KEY }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result?.webcams || [];
        } else {
            console.error(`  ❌ ${target.name}: HTTP ${response.status}`);
        }
    } catch (error) {
        console.error(`  ❌ ${target.name}: ${error.message}`);
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
    console.log('   Golden Hour Webcam Scan v8.0');
    console.log('   Astronomischer Vor-Check Strategie');
    console.log('🌅 ========================================\n');
    
    const currentTime = new Date();
    
    // ========================================
    // SCHRITT 1: Astronomischer Vor-Check
    // ========================================
    
    console.log('🔍 Astronomischer Vor-Check (-12° bis +12°)...\n');
    
    const activeTargets = getActiveTargets(currentTime);
    
    const countriesCount = activeTargets.filter(t => t.type === 'country').length;
    const regionsCount = activeTargets.filter(t => t.type === 'region').length;
    
    console.log(`📊 Aktive Ziele (${activeTargets.length}/${TARGETS.length}):`);
    console.log(`   Länder: ${countriesCount}`);
    console.log(`   Regionen: ${regionsCount}\n`);
    
    if (activeTargets.length > 0) {
        console.log(`🌍 Top 15 aktive Ziele:`);
        activeTargets.slice(0, 15).forEach(t => {
            const alt = getSunAltitude(t.refLat, t.refLon, currentTime);
            console.log(`   • ${t.name} (${t.code}): ${alt.toFixed(1)}°`);
        });
        if (activeTargets.length > 15) {
            console.log(`   ... und ${activeTargets.length - 15} weitere`);
        }
        console.log('');
    }
    
    // ========================================
    // SCHRITT 2: Parallele API Calls
    // ========================================
    
    console.log(`🚀 Starte ${activeTargets.length} parallele API-Anfragen...\n`);
    
    const startTime = Date.now();
    const promises = activeTargets.map(target => fetchWebcamsForTarget(target));
    const results = await Promise.all(promises);
    const apiDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`⏱️  API-Calls abgeschlossen in ${apiDuration}s\n`);
    
    // Zusammenführen und Deduplizieren
    const allWebcams = new Map();
    let totalFetched = 0;
    
    results.forEach((webcams, idx) => {
        const target = activeTargets[idx];
        totalFetched += webcams.length;
        
        if (webcams.length > 0) {
            console.log(`  ✅ ${target.name}: ${webcams.length} Webcams`);
            webcams.forEach(w => {
                if (w.status === 'active' && w.player && (w.player.live || w.player.day)) {
                    allWebcams.set(w.webcamId, w);
                }
            });
        } else {
            console.log(`  ⚪ ${target.name}: keine Webcams`);
        }
    });
    
    console.log(`\n📊 API-Statistik:`);
    console.log(`   Anfragen: ${activeTargets.length}`);
    console.log(`   Webcams abgerufen: ${totalFetched}`);
    console.log(`   Unique Webcams: ${allWebcams.size}`);
    console.log('\n🔍 Präzise Golden Hour Filterung (-8° bis +8°)...\n');
    
    // ========================================
    // SCHRITT 3: Präzise Filterung
    // ========================================
    
    const filtered = [];
    const premium = [];
    let filteredOut = 0;
    
    allWebcams.forEach(webcam => {
        const altitude = getSunAltitude(
            webcam.location.latitude, 
            webcam.location.longitude, 
            currentTime
        );
        
        if (isInGoldenHour(altitude)) {
            webcam.sunAlt = altitude;
            
            if (isInPremiumWindow(altitude)) {
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
    console.log(`📈 Effizienz: ${((filtered.length / allWebcams.size) * 100).toFixed(1)}% der abgerufenen Webcams nutzbar`);
    
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
        else if (lng >= 25 && lng <= 150 && lat >= 0) byContinent['Asien']++;
        else if (lng >= -20 && lng <= 55 && lat < 35 && lat > -35) byContinent['Afrika']++;
        else if (lng >= -170 && lng <= -50 && lat >= 15) byContinent['Nordamerika']++;
        else if (lng >= -85 && lng <= -35 && lat < 15) byContinent['Südamerika']++;
        else if (lng >= 110 || lat < -10) byContinent['Ozeanien']++;
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
    const activeTargets = getActiveTargets(currentTime);
    
    res.json({
        status: 'ok',
        message: 'Golden Hour Backend - Astronomischer Vor-Check',
        version: '8.0',
        strategy: {
            method: 'astronomical_precheck',
            description: 'Vor-Check mit SunCalc (-12° bis +12°), dann präzise Filterung (-8° bis +8°)',
            totalTargets: TARGETS.length,
            activeTargets: activeTargets.length,
            preCheckWindow: `${PRE_CHECK_MIN}° bis ${PRE_CHECK_MAX}°`,
            goldenHourWindow: `${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`
        },
        targets: {
            total: TARGETS.length,
            countries: TARGETS.filter(t => t.type === 'country').length,
            regions: TARGETS.filter(t => t.type === 'region').length,
            active: activeTargets.length
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
                strategy: 'astronomical_precheck',
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
        strategy: 'astronomical_precheck',
        targets: {
            total: TARGETS.length,
            countries: TARGETS.filter(t => t.type === 'country').length,
            regions: TARGETS.filter(t => t.type === 'region').length
        },
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

app.get('/api/debug/targets', async (req, res) => {
    const currentTime = new Date();
    const activeTargets = getActiveTargets(currentTime);
    
    res.json({
        totalTargets: TARGETS.length,
        activeTargets: activeTargets.length,
        active: activeTargets.map(t => ({
            name: t.name,
            code: t.code,
            type: t.type,
            sunAltitude: getSunAltitude(t.refLat, t.refLon, currentTime).toFixed(2)
        })),
        inactive: TARGETS.filter(t => !activeTargets.includes(t)).slice(0, 10).map(t => ({
            name: t.name,
            code: t.code,
            sunAltitude: getSunAltitude(t.refLat, t.refLon, currentTime).toFixed(2)
        }))
    });
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🌅 ========================================');
    console.log('   Golden Hour Backend v8.0');
    console.log('   Astronomischer Vor-Check');
    console.log('🌅 ========================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   Ziele: ${TARGETS.length} (Länder + Regionen)`);
    console.log(`   Vor-Check: ${PRE_CHECK_MIN}° bis ${PRE_CHECK_MAX}°`);
    console.log(`   Golden Hour: ${GOLDEN_HOUR_MIN}° bis ${GOLDEN_HOUR_MAX}°`);
    console.log('\n   Lade initiale Webcams...\n');
    await fetchGoldenHourWebcams();
    console.log('\n✅ Backend bereit!\n');
});
