async function loadWebcams() {
    document.getElementById('backendStatus').textContent = '⏳ Grid-Scan...';
    try {
        const response = await fetch(`${BACKEND_URL}/api/webcams`);
        const data = await response.json();
        const now = new Date();

        // Da das Backend nun exakt dasselbe Raster nutzt, 
        // müssen wir hier nur noch sortieren und Dubletten-Checks machen.
        currentWebcams = (data.webcams || []).filter(w => {
            // Nochmaliger Check zur Sicherheit (synchron zum aktuellen Gürtel)
            const sunPos = SunCalc.getPosition(now, w.location.latitude, w.location.longitude);
            const alt = sunPos.altitude * 180 / Math.PI;
            return alt >= -6.5 && alt <= 6.5; // Kleiner Puffer für die Erdrotation
        }).sort((a, b) => {
            // Schönstes Licht (-1.5°) zuerst
            return Math.abs(a.sunAlt - (-1.5)) - Math.abs(b.sunAlt - (-1.5));
        });

        document.getElementById('backendStatus').textContent = '🟢 ' + currentWebcams.length + ' Cams';
        
        updateMarkers(); // Deine Marker-Funktion
        if (currentWebcams.length > 0) {
            currentIndex = 0;
            displayCam();
        }
    } catch (e) {
        document.getElementById('backendStatus').textContent = '🔴 Fehler';
    }
}
