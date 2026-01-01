# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Deploy/development stappen

1. Installeer afhankelijkheden en voer na configuratie `npm run build` uit. Dit genereert de productieklare `dist`-map.
2. Configureer je backend of statische server om `dist/index.html` en de gecompileerde assets te serveren. Een aangepaste `base` in Vite is niet nodig; de standaardwaarde volstaat.
3. Zorg dat eventuele API-endpoints die data leveren beschikbaar zijn op dezelfde host als waar je de frontend serveert. Zo kan de applicatie zonder extra proxy-instellingen laden.
