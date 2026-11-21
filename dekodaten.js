export const DEKO = [
  { id: "kiste", de: "Kiste", en: "Crate", solide: [[0, 0.6, 0, 0.6, 0.6, 0.6]] },
  { id: "fass", de: "Fass", en: "Barrel", solide: [[0, 0.5, 0, 0.4, 0.5, 0.4]] },
  { id: "container", de: "Container", en: "Container", solide: [[0, 1.3, 0, 3, 1.3, 1.2]] },
  { id: "zaun", de: "Zaun", en: "Fence", solide: null },
  { id: "sandsaecke", de: "Sandsäcke", en: "Sandbags", solide: [[0, 0.55, 0, 2, 0.55, 0.5]] },
  { id: "turm", de: "Wachturm", en: "Watchtower", solide: [[-1, 2.7, -1, 0.15, 2.7, 0.15], [1, 2.7, -1, 0.15, 2.7, 0.15], [-1, 2.7, 1, 0.15, 2.7, 0.15], [1, 2.7, 1, 0.15, 2.7, 0.15], [0, 5.4, 0, 1.4, 0.15, 1.4], [0, 6.4, 0, 1, 0.9, 1]] },
  { id: "zelt", de: "Zelt", en: "Tent", solide: null },
  { id: "busch", de: "Busch", en: "Bush", solide: null },
  { id: "kaktus", de: "Kaktus", en: "Cactus", solide: null },
  { id: "palme", de: "Palme", en: "Palm", solide: null },
  { id: "ruine", de: "Ruine", en: "Ruin", solide: [[-1.6, 1.2, 0, 1.2, 1.2, 0.2], [0.6, 0.8, 0, 1, 0.8, 0.2], [2, 1.6, 0.4, 0.2, 1.6, 0.8]] },
  { id: "tank", de: "Tanklager", en: "Storage tank", solide: [[0, 1.6, 0, 1.7, 1.6, 1.7]] },
  { id: "sperre", de: "Panzersperre", en: "Tank trap", solide: [[0, 0.7, 0, 0.9, 0.7, 0.9]] },
  { id: "mast", de: "Mast", en: "Lamp post", solide: [[0, 3, 0, 0.12, 3, 0.12]] },
  { id: "wrack", de: "Wrack", en: "Wreck", solide: [[0, 0.8, 0, 2, 0.8, 1]] },
  // pflanzen (gruppe "pflanze"): im editor eigene auswahl; busch, kaktus und palme (7 bis 9) gehoeren auch dazu
  { id: "strauch", de: "Strauch", en: "Shrub", solide: null, gruppe: "pflanze" },
  { id: "hecke", de: "Hecke", en: "Hedge", solide: null, gruppe: "pflanze" },
  { id: "farn", de: "Farn", en: "Fern", solide: null, gruppe: "pflanze" },
  { id: "brombeere", de: "Brombeere", en: "Bramble", solide: null, gruppe: "pflanze" },
  { id: "ginster", de: "Ginster", en: "Gorse", solide: null, gruppe: "pflanze" },
  { id: "heide", de: "Heidekraut", en: "Heather", solide: null, gruppe: "pflanze" },
  { id: "blumen", de: "Blumenwiese", en: "Flower patch", solide: null, gruppe: "pflanze" },
  { id: "schilf", de: "Schilf", en: "Reeds", solide: null, gruppe: "pflanze" },
  { id: "stamm", de: "Baumstamm", en: "Fallen log", solide: [[0, 0.4, 0, 1.9, 0.4, 0.4]], gruppe: "pflanze" },
  { id: "tannenbusch", de: "Jungtanne", en: "Young fir", solide: null, gruppe: "pflanze" }
];
// typen der pflanzen-auswahl im editor (die drei alten pflanzen plus die neuen)
export const PFLANZEN_TYPEN = DEKO.map((d, i) => (d.gruppe === "pflanze" || i === 7 || i === 8 || i === 9 ? i : -1)).filter(i => i >= 0);
