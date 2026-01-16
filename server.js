import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import SunCalc from 'suncalc';

const app = express();
app.use(cors());

const WINDY_KEY = process.env.WINDY_API_KEY || 'z56DtDaWSj3HXsPI9PiBVnWTkf5nUdtL';

// ... (worldData Matrix wie gehabt) ...
const worldData = [{id:'AF',lon:67},{id:'AL',lon:20},{id:'DZ',lon:3},{id:'AS',lon:-170},{id:'AD',lon:1},{id:'AO',lon:18},{id:'AI',lon:-63},{id:'AQ',lon:0},{id:'AG',lon:-61},{id:'AR',lon:-63},{id:'AM',lon:45},{id:'AW',lon:-70},{id:'AU',lon:133},{id:'AT',lon:14},{id:'AZ',lon:47},{id:'BS',lon:-77},{id:'BH',lon:50},{id:'BD',lon:90},{id:'BB',lon:-59},{id:'BY',lon:27},{id:'BE',lon:4},{id:'BZ',lon:-88},{id:'BJ',lon:2},{id:'BM',lon:-64},{id:'BT',lon:90},{id:'BO',lon:-63},{id:'BA',lon:17},{id:'BW',lon:24},{id:'BR',lon:-51},{id:'BN',lon:114},{id:'BG',lon:25},{id:'BF',lon:-1},{id:'BI',lon:29},{id:'KH',lon:104},{id:'CM',lon:12},{id:'CA',lon:-106},{id:'CV',lon:-24},{id:'KY',lon:-80},{id:'CF',lon:20},{id:'TD',lon:18},{id:'CL',lon:-71},{id:'CN',lon:104},{id:'CX',lon:105},{id:'CC',lon:96},{id:'CO',lon:-74},{id:'KM',lon:43},{id:'CG',lon:15},{id:'CD',lon:23},{id:'CK',lon:-159},{id:'CR',lon:-84},{id:'CI',lon:-5},{id:'HR',lon:15},{id:'CU',lon:-79},{id:'CW',lon:-68},{id:'CY',lon:33},{id:'CZ',lon:15},{id:'DK',lon:9},{id:'DJ',lon:42},{id:'DM',lon:-61},{id:'DO',lon:-70},{id:'EC',lon:-78},{id:'EG',lon:30},{id:'SV',lon:-88},{id:'GQ',lon:10},{id:'ER',lon:39},{id:'EE',lon:25},{id:'ET',lon:39},{id:'FK',lon:-59},{id:'FO',lon:-6},{id:'FJ',lon:178},{id:'FI',lon:25},{id:'FR',lon:2},{id:'GF',lon:-53},{id:'PF',lon:-149},{id:'GA',lon:11},{id:'GM',lon:-15},{id:'GE',lon:43},{id:'DE',lon:10},{id:'GH',lon:-1},{id:'GI',lon:-5},{id:'GR',lon:21},{id:'GL',lon:-41},{id:'GD',lon:-61},{id:'GP',lon:-61},{id:'GU',lon:144},{id:'GT',lon:-90},{id:'GN',lon:-10},{id:'GW',lon:-15},{id:'GY',lon:-58},{id:'HT',lon:-72},{id:'HN',lon:-86},{id:'HK',lon:114},{id:'HU',lon:19},{id:'IS',lon:-19},{id:'IN',lon:78},{id:'ID',lon:113},{id:'IR',lon:53},{id:'IQ',lon:43},{id:'IE',lon:-8},{id:'IL',lon:34},{id:'IT',lon:12},{id:'JM',lon:-77},{id:'JP',lon:138},{id:'JO',lon:36},{id:'KZ',lon:66},{id:'KE',lon:37},{id:'KI',lon:173},{id:'KP',lon:127},{id:'KR',lon:127},{id:'KW',lon:47},{id:'KG',lon:74},{id:'LA',lon:102},{id:'LV',lon:24},{id:'LB',lon:35},{id:'LS',lon:28},{id:'LR',lon:-9},{id:'LY',lon:17},{id:'LI',lon:9},{id:'LT',lon:23},{id:'LU',lon:6},{id:'MO',lon:113},{id:'MK',lon:21},{id:'MG',lon:46},{id:'MW',lon:34},{id:'MY',lon:101},{id:'MV',lon:73},{id:'ML',lon:-3},{id:'MT',lon:14},{id:'MH',lon:171},{id:'MQ',lon:-61},{id:'MR',lon:-10},{id:'MU',lon:57},{id:'YT',lon:45},{id:'MX',lon:-102},{id:'FM',lon:150},{id:'MD',lon:28},{id:'MC',lon:7},{id:'MN',lon:103},{id:'ME',lon:19},{id:'MS',lon:-62},{id:'MA',lon:-7},{id:'MZ',lon:35},{id:'MM',lon:95},{id:'NA',lon:18},{id:'NR',lon:166},{id:'NP',lon:84},{id:'NL',lon:5},{id:'NC',lon:165},{id:'NZ',lon:174},{id:'NI',lon:-85},{id:'NE',lon:8},{id:'NG',lon:8},{id:'NU',lon:-169},{id:'NF',lon:167},{id:'MP',lon:145},{id:'NO',lon:8},{id:'OM',lon:55},{id:'PK',lon:69},{id:'PW',lon:134},{id:'PS',lon:35},{id:'PA',lon:-80},{id:'PG',lon:143},{id:'PY',lon:-58},{id:'PE',lon:-75},{id:'PH',lon:121},{id:'PN',lon:-128},{id:'PL',lon:19},{id:'PT',lon:-8},{id:'PR',lon:-66},{id:'QA',lon:51},{id:'RE',lon:55},{id:'RO',lon:24},{id:'RU',lon:105},{id:'RW',lon:29},{id:'WS',lon:-172},{id:'SM',lon:12},{id:'ST',lon:6},{id:'SA',lon:45},{id:'SN',lon:-14},{id:'RS',lon:21},{id:'SC',lon:55},{id:'SL',lon:-11},{id:'SG',lon:103},{id:'SX',lon:-63},{id:'SK',lon:19},{id:'SI',lon:15},{id:'SB',lon:160},{id:'SO',lon:46},{id:'ZA',lon:24},{id:'GS',lon:-36},{id:'SS',lon:30},{id:'ES',lon:-3},{id:'LK',lon:80},{id:'SD',lon:30},{id:'SR',lon:-56},{id:'SZ',lon:31},{id:'SE',lon:18},{id:'CH',lon:8},{id:'SY',lon:38},{id:'TW',lon:120},{id:'TJ',lon:71},{id:'TZ',lon:34},{id:'TH',lon:100},{id:'TL',lon:125},{id:'TG',lon:1},{id:'TK',lon:-172},{id:'TO',lon:-175},{id:'TT',lon:-61},{id:'TN',lon:9},{id:'TR',lon:35},{id:'TM',lon:59},{id:'TC',lon:-71},{id:'TV',lon:179},{id:'UG',lon:32},{id:'UA',lon:31},{id:'AE',lon:54},{id:'GB',lon:-2},{id:'US',lon:-95},{id:'UY',lon:-55},{id:'UZ',lon:64},{id:'VU',lon:166},{id:'VE',lon:-66},{id:'VN',lon:108},{id:'VG',lon:-64},{id:'VI',lon:-64},{id:'WF',lon:-176},{id:'EH',lon:-12},{id:'YE',lon:48},{id:'ZM',lon:27},{id:'ZW',lon:29}];

function getGoldenHourCountries() {
    const now = new Date();
    return worldData.filter(c => {
        const sunPos = SunCalc.getPosition(now, 0, c.lon);
        const altitude = sunPos.altitude * 180 / Math.PI;
        // Backend Puffer erhöht auf 15 Grad für maximale Trefferwahrscheinlichkeit
        return (altitude >= -15 && altitude <= 15);
    });
}

app.get('/api/webcams', async (req, res) => {
    try {
        const targetCountries = getGoldenHourCountries();
        console.log(`📡 Starte Abfrage für ${targetCountries.length} Länder...`);

        // WICHTIG: Promise.all stellt sicher, dass wir auf ALLE Länder warten
        const results = await Promise.all(targetCountries.map(async (country) => {
            try {
                const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams?limit=50&country=${country.id}&include=location,player`, {
                    headers: { 'x-windy-api-key': WIND_KEY }
                });
                if (!response.ok) return [];
                const data = await response.json();
                return data.webcams || [];
            } catch (e) {
                return [];
            }
        }));

        // Flache Liste aus allen Länder-Ergebnissen erstellen
        const allWebcams = results.flat();
        
        // Dubletten entfernen (falls Ländergrenzen sich überschneiden)
        const uniqueWebcams = Array.from(new Map(allWebcams.map(w => [w.webcamId, w])).values());
        
        console.log(`✅ TOTAL ERFASST: ${uniqueWebcams.length} Webcams.`);
        res.json({ webcams: uniqueWebcams });

    } catch (error) {
        console.error("Backend Fehler:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 High-Volume-Backend auf Port ${PORT}`));
