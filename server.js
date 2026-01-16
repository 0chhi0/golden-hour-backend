import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const WINDY_KEY = process.env.WINDY_API_KEY;

// 🌍 WELTWEITE REGIONEN (realistisch & vollständig)
const regions = [
  { name: "Europa", box: "72,-25,34,45" },
  { name: "Nordamerika", box: "70,-170,15,-50" },
  { name: "Südamerika", box: "15,-90,-55,-30" },
  { name: "Afrika", box: "37,-20,-35,55" },
  { name: "Asien", box: "75,40,5,180" },
  { name: "Australien", box: "-10,110,-50,180" }
];

// 🔁 EIN Endpunkt für alle Webcams
app.get("/api/webcams", async (req, res) => {
  try {
    let allWebcams = [];

    for (const region of regions) {
      const url =
        `https://api.windy.com/webcams/api/v3/webcams` +
        `?limit=50` +
        `&area=${region.box}` +
        `&include=location,images,urls,player`;

      const response = await fetch(url, {
        headers: {
          "x-windy-api-key": WINDY_KEY
        }
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data?.result?.webcams) {
        const enriched = data.result.webcams.map(wc => ({
          ...wc,
          region: region.name
        }));
        allWebcams.push(...enriched);
      }
    }

    // 🔥 Duplikate entfernen (Windy liefert oft gleiche Webcams)
    const unique = [];
    const seen = new Set();

    for (const cam of allWebcams) {
      if (!seen.has(cam.id)) {
        seen.add(cam.id);
        unique.push(cam);
      }
    }

    res.json({
      count: unique.length,
      webcams: unique
    });

  } catch (err) {
    console.error("Backend Fehler:", err);
    res.status(500).json({ error: "Webcam API Fehler" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend läuft auf http://localhost:${PORT}`);
});
