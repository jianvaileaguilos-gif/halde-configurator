# Halde GT Configurator

A real-time 3D car configurator for **Halde**, a fictional electric grand tourer brand. Built as a portfolio piece in a 3D / WebGL + minimalist style.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
npm run deploy    # build and publish to GitHub Pages (gh-pages branch)
```

Live site: https://jianvaileaguilos-gif.github.io/halde-configurator/

The 3D model is loaded with `fetch`, so open the site through the dev or preview server, not by double-clicking `index.html`.

## Features

- Real-time 3D car (Three.js) with drag to rotate, pinch / scroll to zoom and auto-rotate
- Camera presets: Front, 3/4, Side, Rear, Top, plus an automatic cabin view when you change the interior
- Options: version, paint (gloss or satin), wheels, brake calipers and cabin, with smooth colour transitions
- Live price total and a build summary that feeds the reservation form
- Reservation form with inline validation, loading and success states (demo only, nothing is sent)
- Light and dark themes (follows the system, with a manual toggle)
- Fully responsive: side panel on desktop; on tablet and phone the 3D stage stays pinned while options scroll beneath
- Respects `prefers-reduced-motion`, keyboard accessible option groups, WebGL fallback message
- Your last build and theme are remembered in the browser

## Project structure

```
index.html            page markup
src/main.js           options, pricing, UI, theme, form
src/scene.js          Three.js scene, materials, camera views
src/style.css         design tokens and layout
public/models/        car model (Draco-compressed glTF) and ground shadow
public/draco/         Draco decoder used to load the model
public/images/        photography
public/favicon.svg    logo mark (also favicon-32.png, apple-touch-icon.png)
public/logo-mark.svg  logo mark for use elsewhere
```

## Credits

- **3D model:** "Ferrari 458 Italia" by [vicent091036](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6), as distributed with the [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf). All original badges and emblems are removed at load time in `src/scene.js` so the car reads as an unbadged Halde. Check the model's license before any commercial use.
- **Photography** (Unsplash License):
  - Valley road at dusk: https://unsplash.com/photos/WAxAr6mVJKw
  - Mountain road: https://unsplash.com/photos/33uqxfhy8pM
  - Black leather headrest: https://unsplash.com/photos/MOolrfZqtX0
  - Tan leather seats: https://unsplash.com/photos/EJDU3WSWqFM
- **Font:** Geist (SIL Open Font License) via Fontsource
- **Icons:** Phosphor Icons (MIT)

Halde is fictional. Prices and specifications on the site are illustrative.
