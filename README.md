Autonomous Factory Inspection Robot — Dashboard Prototype

<img width="1861" height="950" alt="Screenshot 2026-06-12 184440" src="https://github.com/user-attachments/assets/9349d4f5-7a2d-4d1d-8f3b-269851fd1258" />


Files:
- index.html — main prototype UI
- styles.css — theme tokens and layout
- app.js — interactions and mock live data (Chart.js)

How to open:
1. Open `index.html` in a modern browser.
2. No build step required; Chart.js is loaded via CDN.

What this prototype includes:
- Dark industrial visual theme with neon accents
- Sidebar navigation and header with live datetime
- Four sensor overview cards with live-updating mock values
- Live line chart (temperature, gas, distance) using Chart.js
- Camera video placeholder
- Robot control pad and STOP button with animations
- Alerts list with dismiss and clear actions

Next steps I can take:
- Export a Figma component set
- Wire real sensor data via WebSocket or REST
- Add full-screen camera + WebRTC integration
