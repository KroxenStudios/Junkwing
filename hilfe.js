// hilfe: tutorial, das sich an gerät, eingabeart, browser und spielstand anpasst und nur zeigt, was gerade relevant ist
const SCHLUESSEL = "bastelkarre-hilfe";

// erkennt gerät, betriebssystem, browser und eingabearten ohne externe dienste
export function erkenneGeraet() {
  const ua = navigator.userAgent || "";
  const touchPunkte = navigator.maxTouchPoints || 0;
  const mac = /Macintosh|Mac OS X/.test(ua);
  const ipad = /iPad/.test(ua) || (mac && touchPunkte > 1);
  const ios = /iPhone|iPod/.test(ua) || ipad;
  const android = /Android/.test(ua);
  const os = ios ? (ipad ? "ipados" : "ios") : android ? "android" : mac ? "macos" : /Windows/.test(ua) ? "windows" : /Linux|X11/.test(ua) ? "linux" : "unbekannt";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const grob = matchMedia("(pointer: coarse)").matches;
  const fein = matchMedia("(pointer: fine)").matches;
  const kurz = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  let typ = "pc";
  if (ipad || (android && kurz >= 600)) typ = "tablet";
  else if (ios || android || (grob && !fein && kurz < 600)) typ = "handy";
  else if (grob && !fein) typ = "tablet";
  else if (mac && touchPunkte === 0 && /MacBook/.test(ua)) typ = "laptop";
  else if (innerWidth < 1400 && (os === "macos" || os === "windows" || os === "linux") && (navigator.getBattery || mac)) typ = "laptop";
  const schwach = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  return { os, browser, typ, touchHauptsaechlich: grob && !fein, mausDa: fein, trackpad: mac && !ipad, schwach, standalone, hochformat: innerHeight > innerWidth };
}

const NAMEN = {
  de: { ipados: "iPad", ios: "iPhone", android: "Android", macos: "Mac", windows: "Windows", linux: "Linux", unbekannt: "dein Gerät", handy: "Handy", tablet: "Tablet", laptop: "Laptop", pc: "PC" },
  en: { ipados: "iPad", ios: "iPhone", android: "Android", macos: "Mac", windows: "Windows", linux: "Linux", unbekannt: "your device", handy: "phone", tablet: "tablet", laptop: "laptop", pc: "PC" }
};

// seiten: zeige(k) entscheidet, ob die seite zum kontext passt, text(k) liefert die absätze als [de, en]
const SEITEN = [
  {
    id: "du", titel: ["Für dich", "For you"], zeige: () => true,
    text: k => {
      const a = [];
      const g = k.geraet;
      a.push([`Erkannt: ${NAMEN.de[g.typ]}, ${NAMEN.de[g.os]}, ${g.browser}. ${k.touch ? "Du steuerst mit Touch." : k.pad ? "Du steuerst mit Gamepad." : "Du steuerst mit Maus und Tastatur."} Diese Hilfe zeigt nur, was dazu passt.`,
        `Detected: ${NAMEN.en[g.typ]}, ${NAMEN.en[g.os]}, ${g.browser}. ${k.touch ? "You play with touch." : k.pad ? "You play with a gamepad." : "You play with mouse and keyboard."} This help only shows what fits.`]);
      if (k.leer) a.push(["Dein Bauplan ist noch leer. Tippe unten ein Teil an (zum Beispiel einen Block) und setze es in das Raster. Ein Fahrzeug braucht Räder, einen Motor und einen Sitz.", "Your blueprint is empty. Pick a part at the bottom (for example a block) and place it on the grid. A vehicle needs wheels, an engine and a seat."]);
      else {
        if (!k.sitz) a.push(["⚠ Dir fehlt ein Sitz. Ohne Sitz gehst du nur zu Fuß, und im Kampf zählt der Sitz als dein Leben.", "⚠ You have no seat. Without one you only walk, and in combat the seat is your life."]);
        if (!k.motor) a.push(["⚠ Es ist kein Motor eingebaut, das Fahrzeug rollt nur.", "⚠ There is no engine, the vehicle will only roll."]);
        if (k.fight && !k.waffe) a.push(["Im Kampf hast du noch keine Waffe. Baue einen Geschützverschluss mit einem Rohr (Gruppe Kampf).", "You have no weapon for combat yet. Build a gun breech with a barrel (group Combat)."]);
        if (k.fight && k.waffe && !k.richt && (k.touch || k.pad)) a.push(["Tipp: Für Auto-Zielen braucht das Geschütz einen Richtmotor (Servo oder Mikro mit der Option „Richtmotor“).", "Tip: for auto-aim the cannon needs an aiming motor (servo or micro with the “aim motor” option)."]);
        if (k.tank) a.push(["Dein Fahrzeug hat einen Tank. Ein voller Tank explodiert, wenn er getroffen wird. Baue ihn mit Panzerung ringsum.", "Your vehicle has a tank. A full tank explodes when hit. Surround it with armour."]);
      }
      if (g.schwach) a.push(["Dein Gerät ist eher schwach. Weniger Teile und Effekte machen das Spiel flüssiger.", "Your device looks low-powered. Fewer parts and effects make the game smoother."]);
      if ((g.os === "ios" || g.os === "ipados") && !g.standalone) a.push(["Tipp für Vollbild: In Safari auf Teilen tippen und „Zum Home-Bildschirm“ wählen. Dann verschwindet die Browserleiste.", "Tip for fullscreen: in Safari tap Share and choose “Add to Home Screen”. The browser bar disappears."]);
      if (g.os === "android" && !g.standalone) a.push(["Tipp für Vollbild: Im Browser-Menü „Zum Startbildschirm hinzufügen“ wählen.", "Tip for fullscreen: choose “Add to Home screen” in the browser menu."]);
      if (!k.touch && (g.os === "windows" || g.os === "linux" || g.os === "macos") && g.browser !== "Safari") a.push(["Tipp für Vollbild: F11 (am Mac Ctrl+Cmd+F).", "Tip for fullscreen: F11 (on a Mac Ctrl+Cmd+F)."]);
      if (g.touchHauptsaechlich && g.hochformat) a.push(["Drehe das Gerät ins Querformat, dann hast du mehr Platz für Joystick und Knöpfe.", "Turn the device to landscape for more room for the joystick and buttons."]);
      return a;
    }
  },
  {
    id: "bauen", titel: ["Bauen", "Building"], zeige: k => k.modus === "bau" || k.leer,
    text: k => {
      const a = [["Im Bau-Modus setzt du Teile in ein Raster: Blöcke, Räder, Motor, Sitz, Geschütze. Die Ausrichtung stellst du mit „Drehen“ und „Kippen“ ein.", "In build mode you place parts on a grid: blocks, wheels, engine, seat, cannons. Set the orientation with “Rotate” and “Tilt”."]];
      if (k.touch) a.push(["Tippe ein Teil in der Leiste unten an und tippe dann in die Szene, um es zu setzen. Mit „Entfernen“ wechselst du das Werkzeug. Kamera: mit zwei Fingern ziehen und zusammenziehen.", "Tap a part in the bar at the bottom, then tap the scene to place it. Switch the tool to “Remove” to delete. Camera: drag with two fingers and pinch."]);
      else if (k.geraet.trackpad) a.push(["Mit dem Trackpad: Klick setzt, Zwei-Finger-Klick (oder Ctrl+Klick) entfernt. „Einstellen“ öffnet die Eigenschaften eines Teils. Kamera: mit zwei Fingern ziehen.", "With a trackpad: click places, two-finger click (or Ctrl+click) removes. “Adjust” opens a part's properties. Camera: drag with two fingers."]);
      else a.push(["Mit der Maus: Linksklick setzt, Rechtsklick entfernt, Mittelklick oder Alt+Klick öffnet die Eigenschaften. Kamera: rechte Maustaste ziehen, Mausrad zoomt. R dreht, T kippt, Strg+Z macht rückgängig.", "With a mouse: left click places, right click removes, middle click or Alt+click opens properties. Camera: drag right mouse button, wheel zooms. R rotates, T tilts, Ctrl+Z undoes."]);
      a.push(["Wenn du zufrieden bist, drückst du SPIELEN. Für Tests wähle den Modus „Test“, für Gefechte „Fight“.", "When you are done press PLAY. Pick “Test” mode to try things out and “Fight” for battles."]);
      return a;
    }
  },
  {
    id: "fahren", titel: ["Fahren", "Driving"], zeige: k => k.modus === "fahr" || k.fight,
    text: k => {
      const a = [];
      if (k.touch) a.push(["Touch: Der Joystick links fährt und lenkt, die Knöpfe rechts gehören zu deinen Teilen. Der Knopf „Aus/Ein“ steigt aus oder ein, „Neu starten“ setzt dich zurück.", "Touch: the joystick on the left drives and steers, the buttons on the right belong to your parts. “Exit/Enter” gets you out or in, “Restart” resets you."]);
      if (k.pad) a.push(["Gamepad: linker Stick fährt, rechter Trigger oder A feuert, linker Trigger oder B bremst, X wechselt die Munition, Y steigt aus oder ein, Start startet neu.", "Gamepad: left stick drives, right trigger or A fires, left trigger or B brakes, X switches ammo, Y exits or enters, Start restarts."]);
      if (!k.touch) a.push(["Tastatur: W/S Gas und Rückwärts, A/D lenken, Leertaste bremst, C wechselt die Kamera, X steigt aus oder ein, Backspace startet neu. Alle Tasten deiner Teile stehen in der Liste „Steuerung“.", "Keyboard: W/S throttle and reverse, A/D steer, Space brakes, C switches camera, X exits or enters, Backspace restarts. All keys of your parts are in the “Controls” list."]);
      if (!k.touch && k.richt && k.fight) a.push(["Zielen: Zeige mit der Maus auf das Ziel, das Geschütz folgt dem Fadenkreuz.", "Aiming: point at the target with the mouse, the cannon follows the crosshair."]);
      return a;
    }
  },
  {
    id: "runde", titel: ["Eine Runde", "A round"], zeige: k => k.fight,
    text: k => {
      const a = [["Eine Runde dauert 3 Minuten. Danach siehst du die Rangliste, dann startet automatisch die nächste. „Andere Karte“ wechselt die Arena.", "A round lasts 3 minutes. Then you see the ranking and the next round starts automatically. “Another map” switches the arena."],
        ["Punkte: Ein Abschuss gibt 3 Punkte, eine gehaltene Zone 1 Punkt pro Sekunde. Wer führt, steht oben im Display (♛).", "Points: a kill gives 3 points, a held zone gives 1 point per second. The leader is shown in the top display (♛)."]];
      if (k.touch || k.pad) a.push(["Zielen und Feuern: Das Fahrzeug zielt automatisch auf den nächsten Gegner" + (k.touch ? ", du hältst nur den großen FEUER-Knopf." : "; du hältst nur den rechten Trigger."), "Aiming and firing: the vehicle aims at the nearest enemy by itself" + (k.touch ? ", you only hold the big FIRE button." : "; you only hold the right trigger.")]);
      else a.push(["Munition wechseln: HE sprengt Panzerung weg, AP durchschlägt, HEAT ist gut gegen dicke Wände. Die Wechseltaste steht in der Liste „Steuerung“.", "Switching ammo: HE blasts armour away, AP penetrates, HEAT is good against thick walls. The switch key is in the “Controls” list."]);
      return a;
    }
  },
  {
    id: "tod", titel: ["Leben und Tod", "Lives and death"], zeige: k => k.fight,
    text: () => [
      ["Du hast 3 Leben. Jeder direkte Treffer auf Sitz oder Figur kostet eins.", "You have 3 lives. Every direct hit on the seat or character costs one."],
      ["Du bist auch raus, wenn dein Fahrzeug nicht mehr zusammenhängt: Sitz abgetrennt oder mehr als 40 % der Teile weg.", "You are also out when your vehicle no longer holds together: seat cut off or more than 40 % of the parts gone."],
      ["Nach 3 Sekunden geht es automatisch weiter, mit 2 Sekunden Schutz. Rote Herzen auf der Karte geben ein Leben zurück, blaue Schilde 5 Sekunden Schutz.", "After 3 seconds you continue automatically with 2 seconds of protection. Red hearts on the map give a life back, blue shields give 5 seconds of protection."]
    ]
  },
  {
    id: "bumm", titel: ["Explosionen", "Explosions"], zeige: k => k.fight || k.tank,
    text: () => [
      ["Tanks und Munition explodieren wie Sprengstoff: je voller, desto größer. Ein Munitionsträger ist eine Bombe, auch für dich selbst.", "Tanks and ammo explode like explosives: the fuller, the bigger. An ammo carrier is a bomb, also for yourself."],
      ["Jede Explosion schickt eine Druckwelle los. Sie läuft mit Schallgeschwindigkeit, wird schwächer und erreicht auch weit entfernte Fahrzeuge. Ein Schild fängt sie ab, dicke Panzerung hält mehr aus."]
        .concat(["Every explosion sends out a blast wave. It travels at the speed of sound, weakens and still reaches far-away vehicles. A shield absorbs it, thick armour withstands more."])
    ]
  },
  {
    id: "karten", titel: ["Karten und Regeln", "Maps and rules"], zeige: k => k.fight,
    text: () => [
      ["Jede Karte hat eine Regel: „Basen“ (Zonen halten), „König des Hügels“ (nur eine Zone zählt, sie wechselt alle 25 Sekunden), „Arena“ (nur Abschüsse zählen).", "Every map has a rule: “Bases” (hold zones), “King of the hill” (only one zone counts, it changes every 25 seconds), “Arena” (only kills count)."],
      ["Wer die Arena verlässt, hat 6 Sekunden Zeit zurückzukehren.", "If you leave the arena you have 6 seconds to return."],
      ["Manche Runden haben eine Besonderheit: „Schnelllader“ oder „Glaskanone“ (nur 2 Leben). „Schnelles Spiel“ im Moduswähler startet sofort.", "Some rounds have a twist: “Quick loader” or “Glass cannon” (only 2 lives). “Quick game” in the mode picker starts at once."]
    ]
  }
];

export function startHilfe({ en = false, tr = s => s, kontext = () => ({}) } = {}) {
  const geraet = erkenneGeraet();
  const sp = en ? 1 : 0;
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.id = "hilfeKnopf";
  knopf.textContent = "?";
  knopf.title = en ? "Help and tutorial" : "Hilfe und Tutorial";
  knopf.setAttribute("aria-label", knopf.title);
  (document.querySelector("#hudLinks") || document.body).prepend(knopf);

  const dialog = document.createElement("div");
  dialog.id = "hilfeSeite";
  dialog.hidden = true;
  const kasten = document.createElement("div");
  kasten.className = "hilfeKasten";
  dialog.append(kasten);
  document.body.append(dialog);

  let alle = false, seite = 0, k = null;

  function holeKontext() {
    const x = kontext() || {};
    return { ...x, geraet, touch: !!x.touch, pad: !!x.pad };
  }
  const sichtbar = () => SEITEN.filter(s => alle || s.zeige(k));

  function zeichne() {
    k = holeKontext();
    const liste = sichtbar();
    if (seite >= liste.length) seite = 0;
    kasten.replaceChildren();
    const kopf = document.createElement("div");
    kopf.className = "hilfeKopf";
    const h = document.createElement("h2");
    h.textContent = en ? "How it works" : "So funktioniert es";
    const zu = document.createElement("button");
    zu.type = "button";
    zu.className = "hilfeZu";
    zu.textContent = "✕";
    zu.setAttribute("aria-label", en ? "Close" : "Schließen");
    zu.onclick = schliesse;
    kopf.append(h, zu);

    const reiter = document.createElement("div");
    reiter.className = "hilfeReiter";
    liste.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s.titel[sp];
      if (i === seite) b.className = "an";
      b.onclick = () => { seite = i; zeichne(); };
      reiter.append(b);
    });
    const umschalter = document.createElement("button");
    umschalter.type = "button";
    umschalter.className = "hilfeAlle";
    umschalter.textContent = alle ? (en ? "Only what fits me" : "Nur was zu mir passt") : (en ? "Show everything" : "Alles zeigen");
    umschalter.onclick = () => { alle = !alle; seite = 0; zeichne(); };
    reiter.append(umschalter);

    const s = liste[seite];
    const inhalt = document.createElement("div");
    inhalt.className = "hilfeInhalt";
    const t = document.createElement("h3");
    t.textContent = s.titel[sp];
    inhalt.append(t);
    for (const absatz of s.text(k)) {
      const p = document.createElement("p");
      p.textContent = absatz[sp] ?? absatz[0];
      inhalt.append(p);
    }

    const fuss = document.createElement("div");
    fuss.className = "hilfeFuss";
    const zurueck = document.createElement("button");
    zurueck.type = "button";
    zurueck.textContent = en ? "Back" : "Zurück";
    zurueck.disabled = seite === 0;
    zurueck.onclick = () => { seite--; zeichne(); };
    const letzte = seite === liste.length - 1;
    const weiter = document.createElement("button");
    weiter.type = "button";
    weiter.textContent = letzte ? (en ? "Done" : "Fertig") : (en ? "Next" : "Weiter");
    weiter.onclick = () => { if (letzte) schliesse(); else { seite++; zeichne(); } };
    fuss.append(zurueck, weiter);
    kasten.append(kopf, reiter, inhalt, fuss);
  }

  function oeffne() {
    seite = 0;
    zeichne();
    dialog.hidden = false;
  }
  function schliesse() {
    dialog.hidden = true;
    try { localStorage.setItem(SCHLUESSEL, "1"); } catch {}
  }

  knopf.onclick = oeffne;
  dialog.onclick = e => { if (e.target === dialog) schliesse(); };
  window.addEventListener("keydown", e => { if (e.key === "Escape" && !dialog.hidden) schliesse(); });

  return {
    oeffne,
    geraet,
    // beim ersten kampf einmal automatisch zeigen
    ersterKampf() {
      let gesehen = false;
      try { gesehen = localStorage.getItem(SCHLUESSEL) === "1"; } catch {}
      if (!gesehen) oeffne();
    }
  };
}
