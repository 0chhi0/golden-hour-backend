import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// Vollständige World Data Matrix
const worldData = [
    // Nordamerika
    { id: 'US', lon: -95.7 }, { id: 'CA', lon: -106.3 }, { id: 'MX', lon: -102.5 },
    { id: 'GT', lon: -90.2 }, { id: 'BZ', lon: -88.5 }, { id: 'SV', lon: -88.9 },
    { id: 'HN', lon: -86.2 }, { id: 'NI', lon: -85.2 }, { id: 'CR', lon: -84.1 },
    { id: 'PA', lon: -80.8 }, { id: 'CU', lon: -77.8 }, { id: 'JM', lon: -77.3 },
    { id: 'HT', lon: -72.3 }, { id: 'DO', lon: -70.2 }, { id: 'BS', lon: -77.4 },
    { id: 'TT', lon: -61.5 }, { id: 'BB', lon: -59.5 }, { id: 'GD', lon: -61.7 },
    { id: 'LC', lon: -60.9 }, { id: 'VC', lon: -61.2 }, { id: 'AG', lon: -61.8 },
    { id: 'DM', lon: -61.4 }, { id: 'KN', lon: -62.7 },
    
    // Südamerika
    { id: 'BR', lon: -47.9 }, { id: 'AR', lon: -63.6 }, { id: 'CL', lon: -71.5 },
    { id: 'CO', lon: -74.3 }, { id: 'PE', lon: -75.0 }, { id: 'VE', lon: -66.6 },
    { id: 'EC', lon: -78.2 }, { id: 'BO', lon: -63.6 }, { id: 'PY', lon: -58.4 },
    { id: 'UY', lon: -55.8 }, { id: 'GY', lon: -58.9 }, { id: 'SR', lon: -56.0 },
    { id: 'GF', lon: -53.1 },
    
    // Westeuropa
    { id: 'GB', lon: -3.4 }, { id: 'IE', lon: -8.2 }, { id: 'FR', lon: 2.2 },
    { id: 'ES', lon: -3.7 }, { id: 'PT', lon: -8.2 }, { id: 'AD', lon: 1.5 },
    { id: 'MC', lon: 7.4 }, { id: 'BE', lon: 4.5 }, { id: 'NL', lon: 5.3 },
    { id: 'LU', lon: 6.1 },
    
    // Mitteleuropa
    { id: 'DE', lon: 10.4 }, { id: 'CH', lon: 8.2 }, { id: 'AT', lon: 14.5 },
    { id: 'LI', lon: 9.5 }, { id: 'PL', lon: 19.1 }, { id: 'CZ', lon: 15.5 },
    { id: 'SK', lon: 19.7 }, { id: 'HU', lon: 19.5 }, { id: 'SI', lon: 14.9 },
    
    // Nordeuropa
    { id: 'SE', lon: 18.6 }, { id: 'NO', lon: 8.5 }, { id: 'FI', lon: 25.7 },
    { id: 'DK', lon: 9.5 }, { id: 'IS', lon: -19.0 }, { id: 'EE', lon: 25.0 },
    { id: 'LV', lon: 24.6 }, { id: 'LT', lon: 23.9 },
    
    // Südeuropa
    { id: 'IT', lon: 12.6 }, { id: 'GR', lon: 21.8 }, { id: 'HR', lon: 15.2 },
    { id: 'RS', lon: 21.0 }, { id: 'BA', lon: 17.7 }, { id: 'ME', lon: 19.4 },
    { id: 'MK', lon: 21.7 }, { id: 'AL', lon: 20.2 }, { id: 'BG', lon: 25.5 },
    { id: 'RO', lon: 24.9 }, { id: 'MD', lon: 28.4 }, { id: 'MT', lon: 14.4 },
    { id: 'CY', lon: 33.4 }, { id: 'SM', lon: 12.5 }, { id: 'VA', lon: 12.5 },
    
    // Osteuropa
    { id: 'RU', lon: 105.3 }, { id: 'UA', lon: 31.2 }, { id: 'BY', lon: 27.9 },
    
    // Naher Osten
    { id: 'TR', lon: 35.2 }, { id: 'SA', lon: 45.1 }, { id: 'AE', lon: 53.8 },
    { id: 'IL', lon: 34.9 }, { id: 'JO', lon: 36.2 }, { id: 'LB', lon: 35.9 },
    { id: 'SY', lon: 38.9 }, { id: 'IQ', lon: 43.7 }, { id: 'IR', lon: 53.7 },
    { id: 'KW', lon: 47.5 }, { id: 'QA', lon: 51.2 }, { id: 'BH', lon: 50.6 },
    { id: 'OM', lon: 55.9 }, { id: 'YE', lon: 48.5 }, { id: 'PS', lon: 35.2 },
    { id: 'AM', lon: 45.0 }, { id: 'AZ', lon: 47.6 }, { id: 'GE', lon: 43.4 },
    
    // Zentralasien
    { id: 'KZ', lon: 66.9 }, { id: 'UZ', lon: 64.6 }, { id: 'TM', lon: 59.6 },
    { id: 'KG', lon: 74.8 }, { id: 'TJ', lon: 71.3 }, { id: 'AF', lon: 67.7 },
    
    // Südasien
    { id: 'IN', lon: 78.9 }, { id: 'PK', lon: 69.3 }, { id: 'BD', lon: 90.4 },
    { id: 'LK', lon: 80.8 }, { id: 'NP', lon: 84.1 }, { id: 'BT', lon: 90.4 },
    { id: 'MV', lon: 73.5 },
    
    // Ostasien
    { id: 'CN', lon: 104.2 }, { id: 'JP', lon: 138.2 }, { id: 'KR', lon: 127.8 },
    { id: 'KP', lon: 127.5 }, { id: 'MN', lon: 103.8 }, { id: 'TW', lon: 120.9 },
    { id: 'HK', lon: 114.2 }, { id: 'MO', lon: 113.5 },
    
    // Südostasien
    { id: 'TH', lon: 100.9 }, { id: 'VN', lon: 108.3 }, { id: 'MY', lon: 101.9 },
    { id: 'SG', lon: 103.8 }, { id: 'ID', lon: 113.9 }, { id: 'PH', lon: 121.8 },
    { id: 'MM', lon: 96.2 }, { id: 'KH', lon: 104.9 }, { id: 'LA', lon: 102.5 },
    { id: 'BN', lon: 114.7 }, { id: 'TL', lon: 125.7 },
    
    // Ozeanien
    { id: 'AU', lon: 133.8 }, { id: 'NZ', lon: 174.9 }, { id: 'PG', lon: 143.9 },
    { id: 'FJ', lon: 178.1 }, { id: 'NC', lon: 165.6 }, { id: 'SB', lon: 160.2 },
    { id: 'VU', lon: 166.9 }, { id: 'WS', lon: -172.1 }, { id: 'TO', lon: -175.2 },
    { id: 'KI', lon: -168.7 }, { id: 'FM', lon: 158.2 }, { id: 'PW', lon: 134.6 },
    { id: 'MH', lon: 171.2 }, { id: 'NR', lon: 166.9 }, { id: 'TV', lon: 179.2 },
    
    // Nordafrika
    { id: 'EG', lon: 30.8 }, { id: 'LY', lon: 17.2 }, { id: 'TN', lon: 9.5 },
    { id: 'DZ', lon: 1.7 }, { id: 'MA', lon: -7.1 }, { id: 'SD', lon: 30.2 },
    { id: 'SS', lon: 31.3 }, { id: 'MR', lon: -10.9 }, { id: 'EH', lon: -12.9 },
    
    // Westafrika
    { id: 'NG', lon: 8.7 }, { id: 'GH', lon: -1.0 }, { id: 'CI', lon: -5.5 },
    { id: 'SN', lon: -14.5 }, { id: 'ML', lon: -3.5 }, { id: 'BF', lon: -1.5 },
    { id: 'NE', lon: 8.1 }, { id: 'TD', lon: 18.7 }, { id: 'GM', lon: -15.3 },
    { id: 'GW', lon: -15.2 }, { id: 'GN', lon: -9.7 }, { id: 'SL', lon: -11.8 },
    { id: 'LR', lon: -9.4 }, { id: 'TG', lon: 0.8 }, { id: 'BJ', lon: 2.3 },
    { id: 'CV', lon: -24.0 },
    
    // Zentralafrika
    { id: 'CM', lon: 12.4 }, { id: 'CF', lon: 20.9 }, { id: 'CG', lon: 15.8 },
    { id: 'CD', lon: 21.8 }, { id: 'GA', lon: 11.6 }, { id: 'GQ', lon: 10.3 },
    { id: 'ST', lon: 6.6 }, { id: 'AO', lon: 17.9 },
    
    // Ostafrika
    { id: 'KE', lon: 37.9 }, { id: 'ET', lon: 40.5 }, { id: 'SO', lon: 46.2 },
    { id: 'UG', lon: 32.3 }, { id: 'TZ', lon: 34.9 }, { id: 'RW', lon: 29.9 },
    { id: 'BI', lon: 29.9 }, { id: 'DJ', lon: 42.6 }, { id: 'ER', lon: 39.8 },
    { id: 'MG', lon: 46.9 }, { id: 'MU', lon: 57.6 }, { id: 'SC', lon: 55.5 },
    { id: 'KM', lon: 43.9 }, { id: 'YT', lon: 45.2 }, { id: 'RE', lon: 55.5 },
    
    // Südliches Afrika
    { id: 'ZA', lon: 22.9 }, { id: 'ZW', lon: 29.2 }, { id: 'ZM', lon: 27.8 },
    { id: 'MW', lon: 34.3 }, { id: 'MZ', lon: 35.5 }, { id: 'BW', lon: 24.7 },
    { id: 'NA', lon: 18.5 }, { id: 'LS', lon: 28.2 }, { id: 'SZ', lon: 31.5 }
];

// Funktion um alle Webcams für ein Land zu holen (mit Retry-Logik)
async function fetchAllWebcamsForCountry(country, retries = 3) {
    const allCamsForCountry = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;
    
    try {
        while (hasMore) {
            let success = false;
            let attempt = 0;
            
            // Retry-Logik für fehlgeschlagene Requests
            while (!success && attempt < retries) {
                try {
                    // ✅ WICHTIG: include=image hinzugefügt!
                    const response = await fetch(
                        `https://api.windy.com/webcams/api/v3/webcams?limit=${limit}&offset=${offset}&country=${country.id}&include=location,player,image`,
                        { 
                            headers: { 'x-windy-api-key': WINDY_KEY },
                            timeout: 10000 // 10 Sekunden Timeout
                        }
                    );
                    
                    if (!response.ok) {
    if (response.status === 429) {
        console.error(`🛑 RATE LIMIT BLOCK bei Land ${country.id}! Windy blockt uns.`);
    } else {
        console.error(`❌ API Fehler bei ${country.id}: Status ${response.status}`);
    }
    throw new Error(`HTTP ${response.status}`);
}
                    
                    const data = await response.json();
                    const cams = data.webcams || [];
                    
                    if (cams.length === 0) {
                        hasMore = false;
                    } else {
                        allCamsForCountry.push(...cams);
                        offset += limit;
                        
                        if (cams.length < limit) {
                            hasMore = false;
                        }
                    }
                    
                    success = true;
                    
                } catch (err) {
                    attempt++;
                    if (attempt >= retries) {
                        console.log(`❌ ${country.id}: Fehler nach ${retries} Versuchen - ${err.message}`);
                        hasMore = false;
                    } else {
                        console.log(`🔄 ${country.id}: Retry ${attempt}/${retries}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            if (hasMore) {
                // Kleine Pause zwischen Seiten
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }
        
        if (allCamsForCountry.length > 0) {
            console.log(`✅ ${country.id}: ${allCamsForCountry.length} Cams`);
        }
        
        return allCamsForCountry;
    } catch (err) {
        console.log(`❌ Kritischer Fehler bei ${country.id}:`, err.message);
        return [];
    }
}

// Batch-Verarbeitung: Verarbeite N Länder parallel
async function processBatch(countries, batchSize = 3) {
    const results = [];
    
    for (let i = 0; i < countries.length; i += batchSize) {
        const batch = countries.slice(i, i + batchSize);
        console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(countries.length / batchSize)}: Verarbeite ${batch.map(c => c.id).join(', ')}`);
        
        const batchResults = await Promise.all(
            batch.map(country => fetchAllWebcamsForCountry(country))
        );
        
        results.push(...batchResults);
        
        // Pause zwischen Batches
        if (i + batchSize < countries.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return results;
}

app.get('/api/webcams', async (req, res) => {
    try {
        const now = new Date();
        const targetCountries = worldData.filter(c => {
            const sunPos = SunCalc.getPosition(now, 0, c.lon);
            const altitude = sunPos.altitude * 180 / Math.PI;
            return (altitude >= -15 && altitude <= 15);
        });
        
        console.log(`\n📡 Golden Hour Scan gestartet`);
        console.log(`🌍 Gefilterte Länder: ${targetCountries.length}`);
        console.log(`⚡ Batch-Modus: 5 Länder parallel`);
        console.log(`⏱️ Erwartete Dauer: ~${Math.ceil(targetCountries.length / 5 * 2)} Sekunden\n`);
        
        const startTime = Date.now();
        
        // Batch-Verarbeitung
        const results = await processBatch(targetCountries, 5);
        const allWebcams = results.flat();
        
        // Dubletten entfernen
        const uniqueWebcams = Array.from(
            new Map(allWebcams.map(w => [w.webcamId, w])).values()
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\n✅ SCAN ABGESCHLOSSEN!`);
        console.log(`⏱️ Dauer: ${duration}s`);
        console.log(`📊 Ergebnis: ${uniqueWebcams.length} einzigartige Webcams`);
        console.log(`🌍 Aus: ${targetCountries.length} Ländern`);
        console.log(`📈 Durchschnitt: ${Math.round(uniqueWebcams.length / targetCountries.length)} pro Land\n`);
        
        res.json({ 
            webcams: uniqueWebcams,
            stats: {
                totalCountries: targetCountries.length,
                totalWebcams: uniqueWebcams.length,
                averagePerCountry: Math.round(uniqueWebcams.length / targetCountries.length),
                durationSeconds: parseFloat(duration),
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error("❌ Kritischer Backend-Fehler:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Golden Hour Backend v8 läuft auf Port ${PORT}`);
});
