import "./killswitch.js";
import * as THREE from "three";
import RAPIER from "./lib/rapier.mjs";
import * as BAU from "./bau.js";
import * as PH from "./physik.js";
import {
  fahrzeugGrafik, teilModell, trenneGrafik, setzeRaeder, geistModell, schirmModell, spielfigur, figurAktualisieren, setzeSitzen, textSprite, namensSprite, aktualisiereNamen, entsorge, mat, teilVonTreffer, faerbeInstanz
} from "./teile3d.js";
import { lookAus } from "./look.js";
import { Partikel } from "./partikel.js";
import { ladeWeltDaten, baueGelaende, hoeheBei } from "./gelaende.js";
import { meerRand, baueMeer, hafenStart, WASSER_Y } from "./meer.js";
import * as FK from "./fightkarten.js";
import { erzeugeNpcSteuerung } from "./npc.js";
import * as TON from "./ton.js";
import * as KE from "./karteneditor.js";
import { startKarten, oeffneKarten } from "./karten.js";
import { Konto } from "./accounts.js";
import { startModelle } from "./modelle.js";
import { zeigeProfil } from "./profil.js";
import { startRaeume, raumName, raumTitel } from "./raeume.js";
import { startShop } from "./shop.js";
import { sitzRechte, filtereEingabe, fremdeEingabe, mischeEingaben } from "./eingabe.js";
import { messeSensoren, animiereSensoren, erzeugeSensorHud } from "./sensorik.js";
import { richtMotoren, richtTasten } from "./zielen.js";
import { erzeugeRunde } from "./kampfrunde.js";
import { startHilfe } from "./hilfe.js";
import { setzePlaetze, plaetzeListe, lotIds, erzeugeHaeuser, kleinerPlatz, hausPos, KLEIN_K, VARIANTEN as HAUS_DEFS, EIGEN as HAUS_EIGEN } from "./haus.js";
import * as HE from "./hauseditor.js";
import { bereinigeHaus, defAusDoc } from "./hausformat.js";
import { erzeugeHausWahl } from "./hauswahl.js";
import { baueWohngegend, flacheWohngegendAb, aufWohngegend } from "./wohngegend.js";
import { startMenue } from "./menue.js";
import { bereinigeWelt } from "./weltplatz.js";
import { ebneGrundstuecke, baueGrundstuecke, baueWeltAssets } from "./grundstuecke.js";
import { erzeugeWeltEditor } from "./welteditor.js";
import { Behaelter, erzeugeInventarUi, hash53, neuerCode } from "./inventar.js";

const $ = s => document.querySelector(s);

const EN = !!window.WG && WG.lang === "en";
const TEXTE = {
  "Unfall": "Accident",
  "Runde": "Round",
  "Ergebnis": "Result",
  "Punkte": "Points",
  "Platz": "Rank",
  "Sieger": "Winner",
  "Runde vorbei": "Round over",
  "Nächste Runde in": "Next round in",
  "Andere Karte": "Another map",
  "Zurück in die Arena!": "Back into the arena!",
  "Schutz 5 s": "Shield 5 s",
  "FEUER": "FIRE",
  "Arena verlassen": "Left the arena",
  "Basen": "Bases",
  "König des Hügels": "King of the hill",
  "Arena": "Arena",
  "Schnelllader": "Quick loader",
  "Glaskanone": "Glass cannon",
  "Ring": "Ring",
  "Schrottplatz": "Scrapyard",
  "Leben": "Lives",
  "Dreimal getroffen": "Hit three times",
  "Fahrzeug zerrissen": "Vehicle torn apart",
  "Block": "Block", "Glas": "Glass","Stufe (halb)": "Slab (half)", "Schräge": "Wedge", "Eckschräge": "Corner wedge", "Sitz": "Seat",
  "Lenkrad (lenkbar)": "Steerable wheel", "Starres Rad": "Fixed wheel", "Einkaufswagenrad": "Caster wheel",
  "Auspuff": "Exhaust", "Nebelgenerator": "Fog generator", "Triebwerk": "Jet engine", "Raketentriebwerk": "Rocket engine",
  "Tragfläche": "Wing", "Steuerfläche": "Control surface", "Kamera": "Camera", "Fallschirm": "Parachute",
  "Stellmotor": "Servo motor", "Sollbruchstelle": "Breakaway joint", "Explosive": "Explosive", "Panzerblock": "Armoured block",
  "Sehr schwer und explosionssicher: Seine Verbindungen halten auch bei Sprengungen, und ein Körper mit Panzerblock wird nicht weggeschleudert.": "Very heavy and blast-proof: its connections hold even in explosions, and a body containing an armoured block is not thrown away.",
  "Zünden": "Detonate", "Sprengen": "Detonate", "Reichweite": "Range", "Kraft": "Force",
  "Einmal zünden: ein Blitz trennt alle Verbindungen im Umkreis (Reichweite in Metern) und drückt die Teile mit der eingestellten Kraft von der Ladung weg. Nach einem Neustart ist sie wieder scharf.": "Detonates once: a flash severs every connection within the range (in metres) and pushes the parts away from the charge with the set force. Armed again after a restart.",
  "Verkleidung": "Body", "Fahrer": "Driver", "Räder": "Wheels", "Effekte": "Effects", "Antrieb": "Drive",
  "Mechanik": "Mechanics", "Flug": "Flight", "Struktur": "Structure", "Kampf": "Combat",
  "Sensorik": "Sensors", "Maus links": "Left mouse", "Maus Mitte": "Middle mouse", "Maus rechts": "Right mouse", "Maus Zurück": "Mouse back", "Maus Vor": "Mouse forward", "Richtmotor (zielt mit Maus/Finger)": "Aiming motor (aims with mouse/finger)", "Taste oder Maustaste drücken …": "Press a key or mouse button …", "Vorschau beenden": "End preview", "Messweite": "Range", "Alarm unter": "Alarm below", "Alarm ab": "Alarm above", "Anzeigefarbe": "Display colour", "Lidar-Kuppel": "Lidar dome", "Ortungsradar": "Tracking radar", "Gyro-Kugel": "Gyro sphere", "Radar-Höhenmesser": "Radar altimeter", "G-Kraft-Kristall": "G-force crystal",
  "Sensorik: Der rotierende Laser misst den Abstand zum nächsten Hindernis in Richtung der Oberseite (einstellbar bis 500 m). Der Wert erscheint im Sensor-Display, solange du fährst.":
    "Sensors: the spinning laser measures the distance to the nearest obstacle in the direction of the top side (adjustable up to 500 m). The value appears on the sensor display while you drive.",
  "Sensorik: Der Ortungsradar zeigt andere Fahrzeuge im Umkreis von 250 m auf einem Rundum-Scope (dein Fahrzeug zeigt nach oben). Ein Strich am Punkt zeigt, dass der andere deutlich höher oder tiefer ist.":
    "Sensors: the tracking radar shows other vehicles within 250 m on a round scope (your vehicle points up). A tick on a dot means the other one is clearly higher or lower.",
  "Sensorik: Die Gyro-Kugel zeigt Nick- und Rolllage als künstlichen Horizont plus den Kurs. Die Ringe kreisen schneller, wenn das Fahrzeug dreht.":
    "Sensors: the gyro sphere shows pitch and roll as an artificial horizon plus the heading. The rings spin faster when the vehicle turns.",
  "Sensorik: Der Radar-Höhenmesser misst die Höhe über dem Boden (senkrecht nach unten, bis 400 m). Je näher der Boden, desto schneller laufen die Ping-Ringe.":
    "Sensors: the radar altimeter measures the height above ground (straight down, up to 400 m). The closer the ground, the faster the ping rings run.",
  "Sensorik: Der Kristall spürt die Kräfte am Fahrzeug in g (1 g = ruhig stehen). Er leuchtet grün, bei Last bernsteinfarben und bei Stössen rot.":
    "Sensors: the crystal feels the forces on the vehicle in g (1 g = standing still). It glows green, amber under load and red on impacts.",
  "Neon": "Neon", "Spuren": "Trails", "Gadgets": "Gadgets", "Zünden": "Fire", "Löschen": "Extinguish", "Lichtfarbe": "Light colour", "Strahllänge": "Beam length", "Strahlfarbe": "Beam colour", "Effektfarbe": "Effect colour", "Rauchfarbe": "Smoke colour", "Fackelfarbe": "Flare colour", "Ringfarbe": "Ring colour", "Schutzradius": "Shield radius", "Schildfarbe": "Shield colour",
  "Unterbodenlicht": "Underglow", "Flutlicht": "Floodlight", "Warnblinker": "Hazard blinker", "Rundumleuchte": "Beacon", "Laserstrahl": "Laser beam", "Funkenschweif": "Spark trail", "Regenbogen-Abgas": "Rainbow exhaust", "Staubfahne": "Dust plume", "Plasmaspur": "Plasma trail", "Konfetti-Kanone": "Confetti cannon", "Rauchwerfer": "Smoke launcher", "Leuchtfackel": "Flare", "Störsender": "Jammer", "Schildgenerator": "Shield generator", "Feuerlöscher": "Fire extinguisher",
  "Neon: Leuchtleiste für unter das Fahrzeug. Die Taste schaltet sie an und aus, sie wirft farbiges Licht auf den Boden.": "Neon: light strip for under the vehicle. The key toggles it; it casts coloured light on the ground.",
  "Neon: breites, helles Flutlicht in Richtung der Oberseite. Die Taste schaltet es an und aus.": "Neon: wide bright floodlight pointing along the top side. The key toggles it.",
  "Neon: Warnblinker, blinkt an und aus, solange er eingeschaltet ist.": "Neon: hazard blinker, flashes while switched on.",
  "Neon: Rundumleuchte, die zwischen deiner Lichtfarbe und Rot wechselt und die Umgebung anstrahlt.": "Neon: rotating beacon that alternates between your light colour and red and lights up the surroundings.",
  "Neon: sichtbarer Laserstrahl entlang der Oberseite (Länge und Farbe einstellbar). Wände und Boden verdecken ihn.": "Neon: visible laser beam along the top side (length and colour adjustable). Walls and ground hide it.",
  "Spuren: Funkenschweif, der mit dem Tempo stärker wird (ab ca. 2 m/s). Die Funken fliegen in Richtung der Oberseite.": "Trails: spark trail that grows with speed (from about 2 m/s). The sparks fly along the top side.",
  "Spuren: Abgas, das ständig die Farbe wechselt. Stärke nach Tempo.": "Trails: exhaust that keeps changing colour. Strength follows speed.",
  "Spuren: aufgewirbelter Staub hinter dem Fahrzeug, stärker bei hohem Tempo.": "Trails: dust kicked up behind the vehicle, stronger at high speed.",
  "Spuren: knisternde Plasmaspur, stärker bei hohem Tempo.": "Trails: crackling plasma trail, stronger at high speed.",
  "Spuren: die Taste schiesst drei Sekunden lang buntes Konfetti, danach lädt die Kanone acht Sekunden nach.": "Trails: the key shoots colourful confetti for three seconds, then the cannon reloads for eight seconds.",
  "Gadget: wirft sechs Sekunden lang dichten Rauch als Sichtschutz, danach acht Sekunden Ladezeit.": "Gadget: throws dense smoke as cover for six seconds, then eight seconds of reload.",
  "Gadget: brennt zwölf Sekunden hell und leuchtet die Umgebung aus, danach acht Sekunden Ladezeit.": "Gadget: burns bright for twelve seconds and lights up the surroundings, then eight seconds of reload.",
  "Gadget: solange er an ist, siehst du auf dem Ortungsradar anderer Spieler nicht mehr als Punkt.": "Gadget: while on, you no longer show up as a dot on other players' tracking radar.",
  "Gadget: eine Energiekuppel (Schutzradius einstellbar) fängt Treffer im Fight-Modus ab, kostet dabei Energie und bricht bei leerer Batterie zusammen. Läuft 45 s, lädt in 30 s; einschalten geht ab 30 % Ladung.": "Gadget: an energy dome (shield radius adjustable) absorbs hits in fight mode, costs energy and collapses when empty. Runs 45 s, recharges in 30 s; can be switched on from 30 % charge.",
  "Gadget: löscht drei Sekunden lang alle Brände an deinem Fahrzeug, danach acht Sekunden Ladezeit.": "Gadget: puts out all fires on your vehicle for three seconds, then eight seconds of reload.",
  "Dünne Wand": "Thin wall", "Micro Drive": "Micro drive", "Helium": "Helium", "Hoch": "Up", "Runter": "Down",
  "Nur Platte, liegt außen an einem Block": "Thin plate on the outside of a block",
  "Drehen (gieren)": "Turn (yaw)", "Neigen +": "Tilt up", "Neigen −": "Tilt down",
  "Zweiachsiger Stellmotor: dreht sich dauerhaft (höchstens 30 °/s) und neigt den Aufbau um höchstens 30 ° (±15 °). Gut als Geschützlafette. Quer-Achse ist die rechte Seite des Teils (R dreht es).":
    "Two-axis servo: turns continuously (30 °/s at most) and tilts the load by 30 ° at most (±15 °). Great as a gun mount. The tilt axis is the right side of the part (R rotates it).",
  "Eine dünne Platte, die außen an einem belegten Block sitzt (nur 4 kg). Ideal für Verkleidung und Flügel-Optik.":
    "A thin plate that sits on the outside of an occupied block (only 4 kg). Good for panelling.",
  "Eigene Farbe": "Custom colour", "Max. Lenkwinkel": "Max. steering angle", "Größe": "Size", "Klein": "Small",
  "Mittel": "Medium", "Groß": "Large", "angetrieben": "driven", "frei rollend": "free-rolling",
  "Lenkrichtung": "Steering direction", "automatisch": "automatic", "normal": "normal", "umgekehrt": "reversed",
  "Abgasfarbe": "Exhaust colour", "Nebelfarbe": "Fog colour", "An/Aus": "On/Off", "Schub (halten)": "Thrust (hold)",
  "Schub": "Thrust", "Zünden (halten)": "Ignite (hold)", "Brenndauer": "Burn time", "Auftriebsfläche": "Lift area",
  "Fläche": "Area", "Max. Ausschlag": "Max. deflection", "Kanal": "Channel",
  "Nicken (Höhenruder)": "Pitch (elevator)", "Rollen (Querruder)": "Roll (aileron)", "Gieren (Seitenruder)": "Yaw (rudder)",
  "Richtung": "Direction", "gegenläufig": "opposite", "Ausschlag +": "Deflection +", "Ausschlag −": "Deflection −",
  "Ansicht umschalten": "Switch view", "Blickfeld": "Field of view", "Öffnen/Einpacken": "Open/pack",
  "Schirmfläche": "Canopy area", "Schirmfarbe": "Canopy colour", "Drehen +": "Rotate +", "Drehen −": "Rotate −",
  "Modus": "Mode", "Winkel halten": "Hold angle", "Dauerdrehung": "Continuous rotation", "Max. Winkel": "Max. angle",
  "Tempo": "Speed", "Trennen": "Detach", "Teil entfernen": "Remove part", "Taste drücken …": "Press a key …",
  "Leertaste": "Space", "Strg": "Ctrl",
  "Hier sitzt du (X zum Ein-/Aussteigen). Beliebig viele Sitze möglich; der zuerst gebaute legt fest, wo vorne ist.":
    "This is where you sit (X to get in/out). Any number of seats; the first one built defines where forward is.",
  "Lenkt mit A/D. Räder hinter dem Schwerpunkt lenken automatisch gegenläufig.":
    "Steers with A/D. Wheels behind the centre of mass steer in the opposite direction automatically.",
  "Starres Rad: rollt nur geradeaus.": "Fixed wheel: only rolls straight.",
  "Dreht sich frei um 360° und folgt der Bewegung. Kein Antrieb.": "Swivels freely through 360° and follows the motion. No drive.",
  "Raucht, solange der Motor läuft (M schaltet ihn aus und an).": "Smokes while the engine runs (M switches it off and on).",
  "Nebelt auf Knopfdruck, auch ohne Motor.": "Fogs at the press of a key, even without the engine.",
  "Schiebt den Körper, an dem es sitzt, auch wenn es nicht verbunden ist.": "Pushes the body it sits on, even if it is not connected.",
  "Erzeugt Auftrieb und Luftwiderstand, je nach Anstellwinkel zur Anströmung (Strömungsabriss ab ca. 17°). Schräg einbauen (T kippt) oder das Fahrzeug nach oben nicken, damit er trägt. Die Fläche ist die wirksame Auftriebsfläche.":
    "Creates lift and drag depending on the angle of attack to the airflow (stalls above about 17°). Mount it tilted (T tilts) or pitch the vehicle up so it carries. The area is the effective lift area.",
  "Ruder: kippt ihre Hinterkante mit den Tasten. Kanal Nicken = Höhenruder (hinten), Rollen = Querruder (links und rechts gegenläufig!), Gieren = Seitenruder (senkrecht stellen mit T). Hinterkante ist die gelbe Seite.":
    "Rudder: tilts its trailing edge with the keys. Pitch = elevator (at the back), Roll = aileron (left and right opposite!), Yaw = rudder (stand it upright with T). The trailing edge is the yellow side.",
  "Schalte mit der Taste auf den Blick durch die Kamera um (ohne im Fahrzeug zu sein). Sie schaut in Richtung der Linse.":
    "Press the key to look through the camera (without being in the vehicle). It looks in the direction of the lens.",
  "Taste öffnet den Schirm, nochmal drücken packt ihn ein. Er bremst umso stärker, je schneller du bist – auch beim Fallen.":
    "The key opens the canopy, press again to pack it. It brakes harder the faster you are – also when falling.",
  "Sehr starker Schub, aber nur für die Brenndauer. Danach lädt sie wieder auf.": "Very strong thrust, but only for the burn time. Then it recharges.",
  "Alles, was oben (an der Drehscheibe) angebaut ist, dreht sich gegen den Rest.": "Everything attached on top (the turntable) turns against the rest.",
  "Hält fest, bis du die Taste drückst. Dann trennt sie die Teile.": "Holds firmly until you press the key. Then it separates the parts.",
  "Tippen = Werkzeug · Ziehen = drehen · Zwei Finger = zoomen/schieben": "Tap = tool · drag = rotate · two fingers = zoom/pan",
  "Linksklick setzen · Rechtsklick entfernen · Mittelklick einstellen · Umschalt+Klick mehrere auswählen · Ziehen dreht die Ansicht · WASD schiebt · R/T drehen/kippen":
    "Left-click place · right-click remove · middle-click adjust · Shift+click multi-select · drag rotates the view · WASD moves · R/T rotate/tilt",
  "Auswählen": "Select", "Beschriftung": "Label", "Erscheint auf dem Knopf im Handheld-Modus (höchstens 10 Zeichen)": "Shown on the button in handheld mode (max. 10 characters)", "Duplizieren": "Duplicate", "dupliziert (Rückgängig mit Strg+Z)": "duplicated (undo with Ctrl+Z)",
  "Ausgewählt: jetzt auf die Zielstelle klicken (mehrere Teile mit Umschalt+Klick)": "Selected: now click the target spot (several parts with Shift+click)", "Teile": "parts", "Gemischte Teile: nur Farbe und Entfernen gelten für alle.": "Mixed parts: only colour and removal apply to all.",
  "Alle gleichen auswählen": "Select all of this type", "Teile entfernen": "Remove parts", "Auswahl aufheben": "Clear selection",
  "Alle Teile ausgewählt": "All parts selected",
  "Joystick fahren · Knöpfe rechts für Teile": "Joystick drives · buttons on the right for parts",
  "Joystick: Nicken und Rollen · Knöpfe rechts: Gieren und Teile": "Joystick: pitch and roll · buttons on the right: yaw and parts",
  "WASD fahren · Leertaste bremsen · X aus-/einsteigen oder Klick auf einen Sitz · M Motor · C Kamera · Tab zurück zum Bauen · Rücktaste neu starten":
    "WASD drive · Space brake · X get out/in or click a seat · M engine · C camera · Tab back to building · Backspace restart",
  "Jede Farbe = ein starrer Körper. Gleiche Farbe = fest verbunden.": "Each colour = one rigid body. Same colour = firmly connected.",
  "Ungültige Fahrzeug-Datei": "Invalid vehicle file",
  "Fahrzeug importiert (Rückgängig mit Strg+Z)": "Vehicle imported (undo with Ctrl+Z)",
  "Normale Farben": "Normal colours", "Nichts rückgängig zu machen": "Nothing to undo",
  "Alles entfernt (Rückgängig mit Strg+Z)": "Everything removed (undo with Ctrl+Z)",
  "X ist zum Ein- und Aussteigen reserviert": "X is reserved for getting in and out",
  "Motor an": "Engine on", "Motor aus": "Engine off",
  "Nicht verbunden: das Teil liegt lose herum": "Not connected: the part lies around loose",
  "Der Sitz ist besetzt": "The seat is taken", "Du fährst mit": "You ride along", "Eingestiegen": "Seated",
  "Ausgestiegen – X zum Einsteigen": "Got out – X to get in", "Kein freier Sitz in der Nähe": "No free seat nearby",
  "Erst etwas bauen!": "Build something first!", "Kein Sitz eingebaut: du gehst zu Fuß": "No seat built: you're on foot",
  "Neu gestartet": "Restarted",
  "Außerhalb des Bauraums": "Outside the build area", "Platz belegt": "Space occupied",
  "Räder gehören an eine Seitenfläche": "Wheels belong on a side face",
  "Gas / Rückwärts": "Throttle / Reverse", "Lenken": "Steer", "Bremse": "Brake", "Motor an/aus": "Engine on/off",
  "Bauen": "Build", "Neu starten": "Restart", "Aus-/Einsteigen": "Get out/in", "Nebel": "Fog", "Rakete": "Rocket",
  "Motor +": "Servo +", "Motor −": "Servo −", "Nicken +": "Pitch +", "Nicken −": "Pitch −", "Rollen +": "Roll +",
  "Rollen −": "Roll −", "Gieren +": "Yaw +", "Gieren −": "Yaw −", "Ruder +": "Rudder +", "Ruder −": "Rudder −",
  "Bremse / Sprung": "Brake / Jump", "Aus/Ein": "Out/In", "Raketen-Treibstoff": "Rocket fuel",
  "Zum Laden erst in den Baumodus wechseln": "Switch to build mode to load", "Fahrzeug aus dem Konto geladen": "Vehicle loaded from your account", "Fahrzeug geladen": "Vehicle loaded", "du": "you", "Zum Chatten anmelden": "Sign in to chat", "gehört einem registrierten Konto. Du heißt hier „Gast“ – melde dich an oder wähle im Konto einen anderen Namen.": "belongs to a registered account. You are called “Guest” here – sign in or pick another name in your account.", "Auch Werte außerhalb des Reglers sind möglich": "Values outside the slider range are possible too", "Wert auf die zulässige Grenze begrenzt": "Value limited to the allowed maximum", "Ansicht umschalten (C)": "Switch view (C)", "Ansicht: Verfolger": "View: chase", "Ansicht: Verfolger nah": "View: chase close", "Ansicht: Ich-Perspektive": "View: first person", "Raum": "Room", "Raum voll": "Room full", "Du bist vom Moderator stummgeschaltet": "You have been muted by a moderator", "Zum Chatten musst du angemeldet sein": "You need to be signed in to chat", "Zum Chatten bitte anmelden (👤)": "Sign in to chat", "Nachricht (Enter)": "Message (Enter)", "Profil ansehen": "View profile", "Gast ohne Konto": "Guest without account",
  "Offline": "Offline", "Verbinde …": "Connecting …", "Online": "Online",
  "Offline – du kannst trotzdem bauen und fahren": "Offline – you can still build and drive",
  "frei": "free", "Aussteigen (X)": "Get out (X)", "Einsteigen (X)": "Get in (X)", "schwerelos": "weightless",
  "Losfahren": "Drive", "Zum Parkplatz": "To parking lot", "zurück": "back", "KAMERA": "CAMERA", "Gast": "Guest",
  "Startbahn · 1,4 km": "Runway · 1.4 km", "Start: Parkplatz": "Start: parking lot", "Start: Hafen": "Start: harbour", "Start: Haus": "Start: house", "Haus bauen (Editor)": "Build a house (editor)", "Haus gewählt": "House chosen", "Inventar (I)": "Inventory (I)", "Abgeschlossen – dir fehlt der Hausschlüssel": "Locked – you need the house key", "Abgeschlossen – du brauchst den Autoschlüssel": "Locked – you need the car key", "Kein Autoschlüssel im Inventar: du stehst neben dem abgeschlossenen Fahrzeug": "No car key in your inventory: you stand next to the locked vehicle", "Hausschlüssel im Inventar": "House key in your inventory", "Ersatzschlüssel gemacht": "Spare key made", "Keine Antwort vom Server": "No answer from the server", "Hier wohnt gerade niemand": "Nobody lives here right now", "Truhe": "Chest", "Briefkasten": "Mailbox", "Tür schließen (E)": "Close door (E)", "Innentür öffnen (E)": "Open inner door (E)", "Tür aufschließen (E)": "Unlock door (E)", "Tür: abgeschlossen": "Door: locked", "Klappe öffnen / schließen (E)": "Open / close hatch (E)", "Truhe öffnen (E)": "Open chest (E)", "Briefkasten öffnen (E)": "Open mailbox (E)", "Inventar voll": "Inventory full", "→ Großer Parkplatz": "→ Big parking lot", "→ Zum Haus": "→ Back to the house", "→ Hafen": "→ Harbour", "Hauptmenü": "Main menu", "Start: Flugplatz": "Start: airfield", "Öffnen / Schließen (E)": "Open / close (E)", "Hafen": "Harbour",
  "Weltrand: du tauchst auf der anderen Seite auf": "World edge: you reappear on the other side",
  "Kart": "Kart", "Dragster": "Dragster", "Einkaufswagen": "Shopping cart", "Geländewagen": "Off-roader",
  "Flugzeug": "Plane", "Kranwagen": "Crane truck", "Zugmaschine mit Anhänger": "Truck with trailer",
  "Vorlage laden …": "Load a preset …", "Vorlage": "Preset",
  "Reisebus": "Coach", "Raumrakete": "Space rocket", "Propellerflugzeug": "Propeller plane", "Feuerwehrauto": "Fire truck",
  "Propeller-Buggy": "Propeller buggy", "Zug mit zwei Wagen": "Train with two cars",
  "Scheinwerfer": "Headlight", "Leiter": "Ladder", "Propellermotor": "Propeller engine", "Treibstofftank": "Fuel tank",
  "Lichtfarbe": "Light colour", "Gashebel +": "Throttle +", "Gashebel −": "Throttle −",
  "Max. Fluggeschwindigkeit": "Max. airspeed", "Kapazität": "Capacity", "Verbrauch": "Fuel use",
  "Treibstoffverbrauch an/aus": "Fuel use on/off", "Treibstoffverbrauch an": "Fuel use on",
  "Treibstoffverbrauch aus (unbegrenzt)": "Fuel use off (unlimited)", "Tank leer": "Tank empty", "Kein Tank verbunden": "No tank connected", "Treibstoff": "Fuel", "Tank": "Tank",
  "Leuchtet nach vorn (in Richtung der Linse). Die Taste schaltet ihn an und aus.":
    "Shines forward (in the direction of the lens). The key switches it on and off.",
  "Zu Fuß hochklettern: W/S an der Leiter, Leertaste springt ab. Mehrere Leitern übereinander ergeben eine lange Leiter (R/T dreht sie).":
    "Climb on foot: W/S at the ladder, Space jumps off. Several ladders stacked make a long ladder (R/T rotates it).",
  "Schiebt wie ein Propeller: Die Gashebel-Tasten stellen die Leistung ein und sie bleibt eingestellt. Der Schub sinkt in dünner Luft; im Weltraum gibt es keinen.":
    "Pushes like a propeller: the throttle keys set the power and it stays set. Thrust falls in thin air; there is none in space.",
  "Treibstoff für Triebwerke, Propeller und den Motor (Raketen haben eigenen). Mit Tank geht ohne Treibstoff nichts, ohne Tank ist der Verbrauch aus. K schaltet den Verbrauch aus und an.":
    "Fuel for jet engines, propellers and the drive motor (rockets have their own). With a tank nothing runs without fuel, without a tank fuel use is off. K switches fuel use off and on.",
  "Munitionsart wechseln": "Switch ammo type", "Geschossart": "Shell type",
  "HE (hochexplosiv)": "HE (high explosive)", "AP (Wuchtgeschoss)": "AP (armour piercing)", "HEAT (Hohlladung)": "HEAT (shaped charge)",
  "Panzer": "Tank",
  "Warteschlange": "Queue", "Spieler": "player(s)", "nächster NPC in": "next NPC in", "Match gestartet": "Match started",
  "Schnellfeuerkanone": "Rapid-fire cannon", "Dauerfeuer": "Rapid fire", "Wandstärke": "Wall thickness",
  "Schnellfeuerkanone: Rohr und Verschluss in einem, feuert entlang ihrer Oberseite rund neun Schuss pro Sekunde, solange du die Taste hältst. Kaliber 25–40 mm, die Geschosse schlagen kaum durch und machen wenig Schaden, treffen aber oft. Sie braucht ein Munitionslager mit gleichem Kaliber am selben festen Fahrzeugteil (jede Geschossart).":
    "Rapid-fire cannon: barrel and breech in one, fires along its top face at about nine rounds per second while you hold the key. Calibre 25–40 mm; the rounds barely penetrate and do little damage, but hit often. It needs an ammo rack of the same calibre on the same rigid part of the vehicle (any shell type). Fight mode only.",
  "Kampf": "Combat", "Motor": "Engine", "Geschütz": "Cannon", "Geschützverschluss": "Cannon breech", "Munitionslager": "Ammo rack",
  "Leistung": "Power", "Kaliber": "Calibre", "Geschossdurchmesser": "Shell diameter", "Fasst": "Holds", "Schuss": "rounds",
  "Schiessen": "Fire", "Haltekraft": "Holding force", "Drehkraft": "Turning force",
  "Karten laden / teilen": "Load / share maps", "Karteneditor": "Map editor", "Gewählte Karte bearbeiten": "Edit selected map",
  "Dünen": "Dunes", "Felsental": "Rock valley", "Hügelland": "Hill country",
  "Treibt die Räder an, egal wo er im Fahrzeug sitzt. Die Leistung stellst du in PS ein (150 PS entsprechen dem bisherigen Antrieb). Mehrere Motoren addieren ihre Leistung, mehr Leistung verbraucht mehr Treibstoff. Bei einem Treffer im Fight-Modus ist er kaputt. Ohne Motor-Baustein fährt das Fahrzeug mit Standardleistung.":
    "Drives the wheels wherever it sits in the vehicle. Set the power in hp (150 hp equals the old drive). Several engines add their power; more power burns more fuel. In fight mode a hit breaks it. Without an engine block the vehicle runs at default power.",
  "Rohr eines Geschützes. Es feuert von seinem Verschluss weg (Verschluss an die Rückseite bauen). Kaliber 25–155 mm. Ist das Rohr zerstört, fliegen Geschosse langsamer und streuen mehr.":
    "Barrel of a cannon. It fires away from its breech (build the breech on the back). Calibre 25–155 mm. If the barrel is destroyed, shells fly slower and spread more. Fight mode only.",
  "Schiesst durch das Rohr, das an ihm sitzt. Ist das Geschoss dicker als das Kaliber, geht es im Rohr los; ist es dünner, fliegt es langsamer und ungenauer. Bei einem Treffer ist er kaputt, dann geht kein Schuss mehr. Die Geschossart (HE, AP, HEAT) stellst du ein, eine zweite Taste schaltet sie im Spiel um.":
    "Fires through the barrel attached to it. If the shell is thicker than the calibre it goes off inside the barrel; if it is thinner it flies slower and less accurately. A hit breaks it and nothing can be fired any more. You set the shell type (HE, AP, HEAT) and a second key switches it in the game. Fight mode only.",
  "Lager für Patronen eines Kalibers (eine Zelle, 0,125 m³). Je grösser das Kaliber, desto weniger Schuss passen hinein. Ein Verschluss schiesst nur, wenn ein Lager am selben festen Fahrzeugteil genau sein Geschossdurchmesser-Kaliber hat. Sitzt das Lager direkt am Verschluss, lädt er doppelt so schnell nach. Bei einem Treffer explodiert der Rest der Munition. Ein Lager enthält genau eine Geschossart: HE sprengt im Umkreis, AP schlägt hart in ein einzelnes Teil, HEAT durchschlägt Blöcke, macht aber weniger Schaden als AP.":
    "Storage for rounds of one calibre (one cell, 0.125 m³). The larger the calibre, the fewer rounds fit. A breech only fires if a rack on the same rigid part of the vehicle matches its shell diameter exactly. A rack right next to the breech doubles its reload speed. A hit makes the remaining ammo explode. A rack holds exactly one shell type: HE blasts the surroundings, AP hits one part hard, HEAT punches through blocks but does less damage than AP. Fight mode only.",
};
window.bastelkarreTr = s => tr(s);
function tr(s) {
  if (!EN || typeof s !== "string") return s;
  if (TEXTE[s] !== undefined) return TEXTE[s];
  const m = /^Höchstens (\d+) Teile$/.exec(s);
  return m ? `At most ${m[1]} parts` : s;
}
function setBtn(sel, ico, txt) {
  const b = $(sel);
  b.querySelector(".ico").textContent = ico;
  b.querySelector(".txt").textContent = txt;
}

const game = $("#game");
const statusEl = $("#status");
const hintEl = $("#hint");
const meldungEl = $("#meldung");

let charakter = {};
try {
  charakter = JSON.parse(localStorage.getItem("characterSettings") || "{}");
} catch {
  charakter = {};
}
let kontoName = "";
try { kontoName = localStorage.getItem("krox-user") || ""; } catch {}
const istAdminKonto = kontoName.toLowerCase() === BAU.ADMIN_NAME;
const eigenBereinige = raw => BAU.bereinige(raw, { admin: istAdminKonto });
const spielerName = (charakter.name || kontoName || tr("Gast")).trim().slice(0, 20) || "Gast";
const spielerFarbe = /^#[0-9a-f]{6}$/i.test(charakter.color || "") ? charakter.color : "#62e6b2";
const spielerLook = lookAus(charakter);

function meldung(text, ms = 2200) {
  meldungEl.textContent = tr(text);
  meldungEl.classList.add("zeigen");
  clearTimeout(meldung.t);
  meldung.t = setTimeout(() => meldungEl.classList.remove("zeigen"), ms);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color("#000008");
scene.fog = new THREE.Fog("#cdebf5", 150, 1300);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = "scene";
game.prepend(renderer.domElement);
const canvas = renderer.domElement;

const hemi = new THREE.HemisphereLight(0xcfeaff, 0x5a5f55, 1.6);
scene.add(hemi);
const sonne = new THREE.DirectionalLight(0xfff0d2, 2.6);
sonne.castShadow = true;
sonne.shadow.mapSize.set(2048, 2048);
Object.assign(sonne.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
sonne.shadow.camera.updateProjectionMatrix();
sonne.shadow.bias = -0.0004;
sonne.shadow.normalBias = 0.03;
scene.add(sonne, sonne.target);

const himmel = new THREE.Mesh(
  new THREE.SphereGeometry(2300, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { raum: { value: 0 } },
    vertexShader: "varying vec3 vR; void main() { vR = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      varying vec3 vR;
      uniform float raum;
      void main() {
        vec3 horizont = vec3(0.847, 0.941, 0.969);
        vec3 oben = vec3(0.373, 0.706, 0.941);
        vec3 himmel = mix(horizont, oben, smoothstep(0.0, 0.75, vR.y));
        gl_FragColor = vec4(mix(himmel, vec3(0.0, 0.0, 0.01), raum), 1.0);
      }`
  })
);
himmel.renderOrder = -10;
himmel.frustumCulled = false;
scene.add(himmel);

const sterne = (() => {
  const n = 1800, pos = new Float32Array(n * 3);
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < n; i++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    pos.set([Math.cos(a) * r * 2200, z * 2200, Math.sin(a) * r * 2200], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  p.renderOrder = -9;
  p.frustumCulled = false;
  scene.add(p);
  return p;
})();

function erdTextur() {
  const w = 1024, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1d5fa8";
  ctx.fillRect(0, 0, w, h);
  let seed = 77;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w, y = h * (0.12 + rnd() * 0.76), r = 14 + rnd() * 70;
    ctx.fillStyle = ["#3f8f4a", "#4f9a55", "#b7a26b", "#2f7a3f"][i % 4];
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.ellipse(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.6, r * (0.4 + rnd() * 0.6), r * (0.25 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#f4f8ff";
  ctx.fillRect(0, 0, w, 26);
  ctx.fillRect(0, h - 26, w, 26);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 90, 4 + rnd() * 12, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const erde = new THREE.Group();
erde.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ map: erdTextur(), roughness: 1, fog: false })));
const erdHuelle = new THREE.Mesh(
  new THREE.SphereGeometry(1.05, 48, 32),
  new THREE.MeshBasicMaterial({ color: "#6bb8ff", transparent: true, opacity: 0.2, side: THREE.BackSide, depthWrite: false, fog: false })
);
erde.add(erdHuelle);
erde.scale.setScalar(420);
erde.visible = false;
scene.add(erde);
const ERDE_RICHTUNG = new THREE.Vector3(0.35, -0.7, -0.6).normalize();
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const nebelFarbe = new THREE.Color("#cdebf5"), schwarz = new THREE.Color("#000008");
function aktualisiereHimmel(zeit) {
  const raum = smooth(1500, 5000, camera.position.y);
  const nah = aktiveKamera !== null ? 0.1 : Math.min(1, 0.1 + Math.max(0, camera.position.y) * 0.002);
  if (camera.near !== nah) {
    camera.near = nah;
    camera.updateProjectionMatrix();
  }
  himmel.position.copy(camera.position);
  sterne.position.copy(camera.position);
  himmel.material.uniforms.raum.value = raum;
  sterne.material.opacity = smooth(0.35, 0.9, raum);
  scene.fog.color.copy(nebelFarbe).lerp(schwarz, raum);
  scene.fog.near = 150 + raum * 3000;
  scene.fog.far = 1300 + raum * 40000;
  hemi.intensity = 1.6 * (1 - 0.82 * raum);
  erde.visible = raum > 0.2;
  if (erde.visible) {
    erde.position.copy(camera.position).addScaledVector(ERDE_RICHTUNG, 1800);
    erde.rotation.y = zeit * 0.00002;
    erdHuelle.material.opacity = 0.2 * raum;
  }
}

const rauch = new Partikel(scene, 4500, false);
const feuer = new Partikel(scene, 3000, true);

await RAPIER.init();
$("#laden").hidden = true;
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

const LOT_K = 5;
const LOT_ANZAHL = 20;
const LOT_Z = 115;
const LOT_ABSTAND = 14 * LOT_K;
const lotPos = i => new THREE.Vector3((((i % LOT_ANZAHL) + LOT_ANZAHL) % LOT_ANZAHL - (LOT_ANZAHL - 1) / 2) * LOT_ABSTAND, 0, LOT_Z);
const WELT_X = 700, WELT_N = -1500, WELT_S = 180;

function asphaltTextur() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5a5e63";
  ctx.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 9000; i++) {
    const v = 70 + rnd() * 40;
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.25 + rnd() * 0.3})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let sammler = null;
function statischeBox(pos, halb, quat, farbe, { schatten = true, kollision = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(halb[0] * 2, halb[1] * 2, halb[2] * 2), mat(farbe, { roughness: 0.85 }));
  mesh.position.copy(pos);
  if (quat) mesh.quaternion.copy(quat);
  mesh.castShadow = schatten;
  mesh.receiveShadow = true;
  scene.add(mesh);
  sammler?.obj.push(mesh);
  if (!kollision) return mesh;
  const desc = RAPIER.ColliderDesc.cuboid(...halb).setTranslation(pos.x, pos.y, pos.z).setFriction(0.9);
  if (quat) desc.setRotation(quat);
  const kol = world.createCollider(desc);
  sammler?.kol.push(kol);
  return mesh;
}

function rampe(x, z, dir, laenge, breite, h, farbe = "#c98f4a", stuetze = true) {
  const d = new THREE.Vector3(dir[0], 0, dir[1]).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const a = Math.atan2(h, laenge);
  const t = 0.4;
  const lang = Math.hypot(laenge, h);
  const entlang = d.clone().multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
  const normal = d.clone().multiplyScalar(-Math.sin(a)).addScaledVector(up, Math.cos(a));
  const seite = new THREE.Vector3().crossVectors(normal, entlang);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(seite, normal, entlang));
  const mitte = new THREE.Vector3(x, 0, z)
    .addScaledVector(d, laenge / 2)
    .addScaledVector(up, h / 2)
    .addScaledVector(normal, -t / 2);
  statischeBox(mitte, [breite / 2, t / 2, lang / 2], q, farbe);
  if (stuetze && h > 0.6) {
    const ende = new THREE.Vector3(x, 0, z).addScaledVector(d, laenge - 0.25);
    statischeBox(ende.setY((h - 0.3) / 2), [breite / 2 - 0.05, (h - 0.3) / 2, 0.2], new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d), "#8a6a45");
  }
}

function rasterTextur() {
  const s = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  let seed = 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.06 + rnd() * 0.1})` : `rgba(255,255,255,${0.03 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * s, rnd() * s, 80 + rnd() * 300, 80 + rnd() * 300);
  }
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let k = 1; k < 4; k++) {
    ctx.fillRect(k * 256 - 1, 0, 3, s);
    ctx.fillRect(0, k * 256 - 1, s, 3);
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(0, 0, 9, s);
  ctx.fillRect(0, 0, s, 9);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function wiesenTextur() {
  const s = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5aa04f";
  ctx.fillRect(0, 0, s, s);
  let seed = 909;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const felder = ["#6aae55", "#4d9448", "#8fb35a", "#a58b55", "#76b25d", "#3f8a45"];
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = felder[Math.floor(rnd() * felder.length)];
    ctx.fillRect(rnd() * s, rnd() * s, 90 + rnd() * 260, 60 + rnd() * 200);
  }
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? "20,60,25" : "190,220,120"},${0.05 + rnd() * 0.1})`;
    ctx.beginPath();
    ctx.arc(rnd() * s, rnd() * s, 10 + rnd() * 50, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function baueWelt() {
  const tex = asphaltTextur();
  tex.repeat.set((WELT_X * 2) / 6, (WELT_S - WELT_N) / 6);
  const boden = new THREE.Mesh(
    new THREE.PlaneGeometry(WELT_X * 2, WELT_S - WELT_N),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  boden.rotation.x = -Math.PI / 2;
  boden.position.set(0, 0, (WELT_S + WELT_N) / 2);
  boden.receiveShadow = true;
  scene.add(boden);

  const rt = rasterTextur();
  rt.repeat.set((WELT_X * 2) / 120, (WELT_S - WELT_N) / 120);
  const raster = new THREE.Mesh(
    new THREE.PlaneGeometry(WELT_X * 2, WELT_S - WELT_N),
    new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  );
  raster.rotation.x = -Math.PI / 2;
  raster.position.set(0, 0.002, (WELT_S + WELT_N) / 2);
  scene.add(raster);

  if (WELTDATEN) {
    if (PLAETZE) { ebneGrundstuecke(WELTDATEN, PLAETZE); setzePlaetze(PLAETZE); }   // jedes grundstück eingeebnet (vor dem gelände)
    else flacheWohngegendAb(WELTDATEN);   // eigene, ebene fläche für die wohngegend, weit weg vom flughafen (vor dem gelände)
    baueGelaende({ d: WELTDATEN, RAPIER, world, scene, box: statischeBox });
  } else {
  const wt = wiesenTextur();
  wt.repeat.set(15, 15);
  const wiese = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshStandardMaterial({ map: wt, roughness: 1 })
  );
  wiese.rotation.x = -Math.PI / 2;
  wiese.position.y = -0.15;
  wiese.receiveShadow = true;
  scene.add(wiese);

  {
    const n = 1400;
    const kronen = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.4, 7), new THREE.MeshStandardMaterial({ roughness: 1 }), n);
    const staemme = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 1, 6), new THREE.MeshStandardMaterial({ color: "#6b4a2d", roughness: 1 }), n);
    const m4 = new THREE.Matrix4(), farbe = new THREE.Color();
    let seed = 515;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let k = 0;
    for (let tries = 0; k < n && tries < 20000; tries++) {
      const x = (rnd() * 2 - 1) * 2900, z = (rnd() * 2 - 1) * 2900;
      if (Math.abs(x) < WELT_X + 25 && z > WELT_N - 25 && z < WELT_S + 25) continue;
      if (aufWohngegend(x, z, 15)) continue;
      const s = 4 + rnd() * 9;
      m4.compose(new THREE.Vector3(x, s * 0.5, z), new THREE.Quaternion(), new THREE.Vector3(s * 0.45, s * 0.5, s * 0.45));
      staemme.setMatrixAt(k, m4);
      m4.compose(new THREE.Vector3(x, s * 0.5 + s * 0.55, z), new THREE.Quaternion(), new THREE.Vector3(s * 0.7, s * 0.7, s * 0.7));
      kronen.setMatrixAt(k, m4);
      kronen.setColorAt(k, farbe.set(["#2f8f4e", "#3aa35a", "#2a7d46", "#4a9a40"][k % 4]));
      k++;
    }
    kronen.count = staemme.count = k;
    scene.add(kronen, staemme);
  }

  world.createCollider(RAPIER.ColliderDesc.cuboid(3000, 1, 3000).setTranslation(0, -1, 0).setFriction(0.95));

  const wand = "#b9b4a8";
  const lx = WELT_X * 2, lz = WELT_S - WELT_N, mz = (WELT_S + WELT_N) / 2;
  statischeBox(new THREE.Vector3(0, 0.6, WELT_N), [lx / 2 + 0.5, 0.6, 0.5], null, wand);
  statischeBox(new THREE.Vector3(0, 0.6, WELT_S), [lx / 2 + 0.5, 0.6, 0.5], null, wand);
  statischeBox(new THREE.Vector3(-WELT_X, 0.6, mz), [0.5, 0.6, lz / 2], null, wand);
  statischeBox(new THREE.Vector3(WELT_X, 0.6, mz), [0.5, 0.6, lz / 2], null, wand);
  }

  const flach = (breite, laenge, farbe, x, y, z, lage = -3) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(breite, laenge),
      new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: lage, polygonOffsetUnits: lage })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
  };
  const BAHN_X = 180;
  flach(40, 1400, "#3b3e42", BAHN_X, 0.03, -620);
  flach(0.6, 1400, "#f2f2f2", BAHN_X - 18.5, 0.04, -620, -5);
  flach(0.6, 1400, "#f2f2f2", BAHN_X + 18.5, 0.04, -620, -5);
  for (let z = 50; z > -1300; z -= 30) flach(0.6, 14, "#f2f2f2", BAHN_X, 0.04, z, -5);
  for (let z = 60; z > -1300; z -= 300) {
    for (let k = -3; k <= 3; k++) if (k) flach(1.2, 20, "#f2f2f2", BAHN_X + k * 4.5, 0.04, z - 10, -5);
  }
  const bahnSchild = textSprite(tr("Startbahn · 1,4 km"), { skala: 9, bg: "rgba(20,60,160,0.92)" });
  bahnSchild.position.set(BAHN_X, 7, 80);
  scene.add(bahnSchild);

  if (!WELTDATEN) {
  let seed = 99;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2;
    const dist = 1250 + rnd() * 250;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat(["#4f9a55", "#468c4d", "#5aa65c"][i % 3], { roughness: 1 }));
    hill.scale.set(160 + rnd() * 160, 40 + rnd() * 60, 160 + rnd() * 160);
    hill.position.set(Math.cos(ang) * dist, -10, Math.sin(ang) * dist + (WELT_S + WELT_N) / 2);
    scene.add(hill);
  }
  }

  for (let i = 0; i < LOT_ANZAHL; i++) {
    const p = lotPos(i);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(12.4 * LOT_K, 0.04, 12.4 * LOT_K), new THREE.MeshStandardMaterial({ color: "#cfcac0", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    pad.position.set(p.x, 0.02, p.z);
    pad.receiveShadow = true;
    scene.add(pad);
    const pts = [];
    const hl = 6 * LOT_K;
    for (let k = -12; k <= 12; k++) {
      const v = k * 0.5 * LOT_K;
      pts.push(p.x + v, 0.045, p.z - hl, p.x + v, 0.045, p.z + hl, p.x - hl, 0.045, p.z + v, p.x + hl, 0.045, p.z + v);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const linien = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: "#9b968c", transparent: true, opacity: 0.6 }));
    scene.add(linien);
    statischeBox(new THREE.Vector3(p.x, 0.055, p.z), [1.5, 0.01, 0.06], null, "#e5484d", { schatten: false, kollision: false });
    statischeBox(new THREE.Vector3(p.x, 0.055, p.z), [0.06, 0.01, 1.5], null, "#e5484d", { schatten: false, kollision: false });
    statischeBox(new THREE.Vector3(p.x, 0.05, p.z - 6.35 * LOT_K), [6.2 * LOT_K, 0.01, 0.12 * LOT_K], null, "#ffd43b", { schatten: false, kollision: false });
    for (const sx of [-1, 1]) {
      statischeBox(new THREE.Vector3(p.x + sx * 6.6 * LOT_K, 0.05, p.z), [0.1 * LOT_K, 0.01, 6.2 * LOT_K], null, "#f2f2f2", { schatten: false, kollision: false });
    }
    const pfosten = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * LOT_K, 0.06 * LOT_K, 3 * LOT_K, 8), mat("#3a4352", { metalness: 0.4 }));
    pfosten.position.set(p.x - 6.6 * LOT_K, 1.5 * LOT_K, p.z + 6.6 * LOT_K);
    scene.add(pfosten);
    const schild = textSprite(`P${i + 1}`, { skala: 2.2 * LOT_K, bg: "rgba(20,60,160,0.92)" });
    schild.position.set(p.x - 6.6 * LOT_K, 3.3 * LOT_K, p.z + 6.6 * LOT_K);
    scene.add(schild);
    lotSchilder.push({ pfosten, schild, name: null });
  }

  rampe(0, 46, [0, -1], 7, 5, 1.2);
  rampe(-14, 46, [0, -1], 5, 3, 0.5, "#d9a35a");
  rampe(14, 46, [0, -1], 5, 3, 0.5, "#d9a35a");

  rampe(-32, 34, [0, -1], 11, 7, 3.2, "#c46a3f");
  rampe(-32, -8, [0, 1], 11, 7, 3.2, "#c46a3f", false);
  statischeBox(new THREE.Vector3(-32, 1.6, 3.2), [3.45, 1.6, 0.2], null, "#8a6a45");

  statischeBox(new THREE.Vector3(36, 1.5, 6), [8, 1.5, 8], null, "#9aa3ab");
  rampe(36, 24, [0, -1], 10, 6, 3, "#8f979e", false);
  rampe(36, -12, [0, 1], 10, 6, 3, "#8f979e", false);
  rampe(54, 6, [-1, 0], 10, 6, 3, "#8f979e", false);

  for (let i = 0; i < 9; i++) {
    const z = 40 - i * 4.5;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 8, 20), mat("#e0d6c2", { roughness: 0.9 }));
    m.rotation.z = Math.PI / 2;
    m.position.set(-66, 0, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(4, 0.55).setTranslation(-66, 0, z)
        .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2))).setFriction(0.9)
    );
  }

  for (let i = 0; i < 8; i++) {
    statischeBox(new THREE.Vector3(72, 0.125 + i * 0.125, -30 - i * 1.6), [4, 0.125 + i * 0.125, 0.8], null, i % 2 ? "#a7a097" : "#b8b1a7");
  }

  const R = 7;
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * (Math.PI / 2), a1 = ((i + 1) / 7) * (Math.PI / 2);
    const am = (a0 + a1) / 2;
    const len = R * (a1 - a0) + 0.05;
    const y = R - Math.cos(am) * R;
    const z = WELT_N + 0.5 + R - Math.sin(am) * R;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(am, 0, 0));
    const pos = new THREE.Vector3(0, y, z).addScaledVector(new THREE.Vector3(0, Math.cos(am), Math.sin(am)), -0.2);
    statischeBox(pos, [30, 0.2, len / 2], q, i % 2 ? "#8fb3c9" : "#9cc0d6");
  }

  for (let i = 0; i < 12; i++) {
    const x = 66 + (i % 2 ? 2.5 : -2.5);
    const z = 44 - i * 5;
    const mesh = new THREE.Group();
    const kegel = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 16), mat("#ff6a1a"));
    kegel.position.y = 0.375;
    const streifen = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.12, 16), mat("#ffffff"));
    streifen.position.y = 0.42;
    const fuss = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.6), mat("#222222"));
    fuss.position.y = 0.025;
    for (const m of [kegel, streifen, fuss]) { m.castShadow = true; mesh.add(m); }
    scene.add(mesh);
    const rb = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 0, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.025, 0.3).setTranslation(0, 0.025, 0).setMass(2), rb);
    world.createCollider(RAPIER.ColliderDesc.cone(0.375, 0.28).setTranslation(0, 0.375, 0).setMass(1), rb);
    pylonen.push({ rb, mesh });
  }
}

const WELTDATEN = await ladeWeltDaten("welt.json");
// grundstücke und assets aus dem welt-editor (konten-server); ohne sie oder ohne gelände gilt die alte reihe aus 20 grundstücken
let WELT = null;
try {
  const r = await Promise.race([Konto.anfrage("GET", "/world"), new Promise(res => setTimeout(() => res(null), 3500))]);
  WELT = bereinigeWelt(r?.welt);
} catch {}
const PLAETZE = WELT?.plaetze.length && WELTDATEN ? WELT.plaetze : null;
const gebauteKarten = [];
const bodenHoehe = (x, z) => {
  for (const k of gebauteKarten) {
    if (Math.abs(x - k.mitte[0]) <= FK.KARTEN_GROESSE / 2 && Math.abs(z - k.mitte[1]) <= FK.KARTEN_GROESSE / 2) return k.hoehe(x, z);
  }
  return WELTDATEN ? hoeheBei(WELTDATEN, x, z) : 0;
};
rauch.boden = bodenHoehe;
feuer.boden = bodenHoehe;
const lotSchilder = [];
const pylonen = [];
if (WELTDATEN) meerRand(WELTDATEN);
baueWelt();
const meer = WELTDATEN ? baueMeer({ RAPIER, world, scene, box: statischeBox, schild: textSprite, d: WELTDATEN, hafenName: tr("Hafen") }) : null;

// häuser (haus.js): feste häuser der spieler, aufgebaut aus state.hs des servers; vor jedem haus ein kleiner parkplatz
const HAEUSER = erzeugeHaeuser({ scene, world, RAPIER, mat, textSprite });

const hausKnopf = document.createElement("button");
hausKnopf.type = "button";
hausKnopf.className = "hausKnopf";
hausKnopf.hidden = true;
hausKnopf.textContent = tr("Öffnen / Schließen (E)");
hausKnopf.addEventListener("click", () => interagiere());
document.body.append(hausKnopf);

// ---------------------------------------------------------------------------
// inventar (9 slots), truhen und schlüssel (inventar.js). türen und fahrzeuge öffnen sich nur mit passendem schlüssel im inventar:
// hausschlüssel = code des hauses (der server schickt ihn nur dem besitzer, alle anderen sehen den hash in state.hs),
// autoschlüssel = code des eigenen fahrzeugs (der hash geht als "fh" an die anderen). im kampf gilt das nicht (respawn).
// ---------------------------------------------------------------------------
// gewähltes haus (index in haus.js VARIANTEN, -1 = die vorgabe des servers); der server baut das haus entsprechend
const HAUS_KEY = "bastelkarre-haus";
const HAUS_DOC_KEY = "bastelkarre-haus-doc";   // das selbstgebaute haus (dokument im format von hausformat.js)
let hausWahlV = -1;
let meinHausDoc = null;
try { meinHausDoc = bereinigeHaus(localStorage.getItem(HAUS_DOC_KEY) || ""); } catch {}
try {
  const g = parseInt(localStorage.getItem(HAUS_KEY), 10);
  if ((g >= 0 && g < HAUS_DEFS.length) || (g === HAUS_EIGEN && meinHausDoc)) hausWahlV = g;
} catch {}
// haus-presets: der ordner haeuser/ im spielordner. index.json listet die dateien (*.bkhaus.json); haeuser/index-erzeugen.mjs schreibt sie neu
async function ladePresets() {
  try {
    const r = await fetch("haeuser/index.json", { cache: "no-cache" });
    if (!r.ok) return [];
    const namen = await r.json();
    const aus = [];
    for (const datei of (Array.isArray(namen) ? namen : []).slice(0, 60)) {
      if (typeof datei !== "string" || !/^[\w\-. äöüÄÖÜß]+\.bkhaus\.json$/.test(datei)) continue;
      try {
        const rr = await fetch("haeuser/" + encodeURIComponent(datei), { cache: "no-cache" });
        const doc = rr.ok ? bereinigeHaus(await rr.text()) : null;
        if (doc) aus.push({ name: doc.name, doc });
      } catch {}
    }
    return aus;
  } catch { return []; }
}
const HAUSWAHL = erzeugeHausWahl({
  L: (de, en) => (window.WG ? WG.L(de, en) : de),
  plaetze: () => (plaetzeListe() || []).map(p => ({ lot: p.id, b: p.b, t: p.t, frei: !HAEUSER.hat(p.id), meins: p.id === meinLot })),
  waehleLot: lot => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "waehleLot", lot })); },
  presets: ladePresets,
  waehlePreset: doc => setzeEigenesHaus(doc),
  en: () => window.WG?.lang === "en",
  varianten: HAUS_DEFS,
  aktuell: () => hausWahlV,
  eigenes: () => meinHausDoc,
  eigenIndex: HAUS_EIGEN,
  defAusDoc,
  editor: () => oeffneHausEditor(),
  waehle: v => {
    hausWahlV = v;
    try { localStorage.setItem(HAUS_KEY, String(v)); } catch {}
    if (socket?.readyState === WebSocket.OPEN) {
      // ein selbstgebautes haus schickt sein dokument (der server prüft es und verteilt es), sonst genügt die nummer
      if (v === HAUS_EIGEN && meinHausDoc) socket.send(JSON.stringify({ type: "hausDoc", doc: meinHausDoc }));
      else socket.send(JSON.stringify({ type: "hausWahl", v }));
    }
    meldung("Haus gewählt");
  }
});
// aus dem editor: das fertige haus als eigenes haus einstellen
function setzeEigenesHaus(doc) {
  const d = bereinigeHaus(doc);
  if (!d) return;
  meinHausDoc = d;
  try { localStorage.setItem(HAUS_DOC_KEY, JSON.stringify(d)); } catch {}
  HAUSWAHL.waehle(HAUS_EIGEN);
}
let hausEditor = null;
function oeffneHausEditor(doc = null) {
  if (modus === "fahr") wechsleModus();
  HAUSWAHL.schliesse();
  INV_UI.schliesse();
  hausEditor ||= HE.erzeugeHausEditor({ renderer, schnittstelle: { zu: () => {}, verwenden: d => setzeEigenesHaus(d), hauptmenue: () => oeffneHauptmenue() } });
  hausEditor.oeffne(doc || meinHausDoc || null);
}

const INV_KEY = "bastelkarre-inventar";
const INV = (() => {
  try { return Behaelter.aus(JSON.parse(localStorage.getItem(INV_KEY) || "[]")); } catch { return new Behaelter(); }
})();
let autoCode = "";
try { autoCode = localStorage.getItem("bastelkarre-autocode") || ""; } catch {}
if (!/^[a-z0-9]{8,16}$/.test(autoCode)) {
  autoCode = neuerCode();
  try { localStorage.setItem("bastelkarre-autocode", autoCode); } catch {}
  INV.gib({ id: "autoschluessel", n: 1, d: { code: autoCode, name: "Auto" } });   // erstausgabe: der erste schlüssel liegt im inventar
}
const autoHash = hash53(autoCode);
const hatAutoSchluessel = hash => INV.hatSchluessel("autoschluessel", hash);
const hatHausSchluessel = lot => INV.hatSchluessel("hausschluessel", HAEUSER.haus(lot)?.hash || "");
const hausCode = lot => INV.slots.find(g => g && g.id === "hausschluessel" && g.d.lot === lot)?.d.code;
// darf man in das fahrzeug von o ("ich" oder die id eines anderen)? sonst abgeschlossen
const autoOffen = o => fightAktiv() || (o === "ich" ? hatAutoSchluessel(autoHash) : hatAutoSchluessel(andere.get(String(o))?.fh));

let kisteWarte = null;
function kisteAnfrage(msg) {
  return new Promise(res => {
    if (socket?.readyState !== WebSocket.OPEN) return res(null);
    kisteWarte?.(null);
    const fertig = r => { clearTimeout(t); if (kisteWarte === fertig) kisteWarte = null; res(r); };
    const t = setTimeout(() => fertig(null), 3000);
    kisteWarte = fertig;
    socket.send(JSON.stringify({ type: "kiste", ...msg }));
  });
}
const INV_UI = erzeugeInventarUi({
  inv: INV,
  L: (de, en) => (window.WG ? WG.L(de, en) : de),
  en: () => window.WG?.lang === "en",
  aktionen: {
    autoHash: () => autoHash,
    ersatzAuto: () => { INV.gib({ id: "autoschluessel", n: 1, d: { code: autoCode, name: "Auto" } }); meldung("Ersatzschlüssel gemacht"); },
    meldung: t => meldung(t),
    nimmAusKiste: async (k, i) => {
      const r = await kisteAnfrage({ lot: k.lot, k: k.k, op: "nimm", slot: i, code: hausCode(k.lot) });
      if (r?.slots) INV_UI.aktualisiereKiste(Behaelter.aus(r.slots));
      return r?.ok ? r.item : null;
    },
    legeInKiste: async (k, i, item) => {
      const r = await kisteAnfrage({ lot: k.lot, k: k.k, op: "lege", slot: i, item, code: hausCode(k.lot) });
      if (r?.slots) INV_UI.aktualisiereKiste(Behaelter.aus(r.slots));
      return !!r?.ok;
    }
  }
});
{
  const zeichneUi = INV.beiAenderung;
  INV.beiAenderung = () => { try { localStorage.setItem(INV_KEY, JSON.stringify(INV.liste())); } catch {} zeichneUi?.(); };
  INV.beiAenderung();
}
{
  // ohne taste i (touch): ein eintrag im menü; sonst bleibt der bildschirm frei
  const b = document.createElement("button");
  b.type = "button";
  b.id = "btnInventar";
  b.textContent = tr("Inventar (I)");
  b.onclick = () => { $("#hud").hidden = true; INV_UI.umschalten(); };
  $("#hud").prepend(b);
}
async function oeffneKiste(lot, k) {
  const r = await kisteAnfrage({ lot, k, op: "zeige", code: hausCode(lot) });
  if (!r) return meldung("Keine Antwort vom Server");
  if (!r.ok) return meldung(r.grund === "abgeschlossen" ? "Abgeschlossen – dir fehlt der Hausschlüssel" : "Hier wohnt gerade niemand");
  INV_UI.zeigeKiste(lot, k, tr(k === "truhe" ? "Truhe" : "Briefkasten"), Behaelter.aus(r.slots));
}
// benutzen: tür (nur mit hausschlüssel zu öffnen), klappe, truhe oder briefkasten in reichweite
function interagiere() {
  if (!fussRb || ichSitz || fightAktiv()) return;
  const z = HAEUSER.naechstesZiel(fussRb.translation());
  if (!z) return;
  if (z.art === "tuer") {
    if (z.block.ziel === 0 && !z.block.innen && !hatHausSchluessel(z.lot)) return meldung("Abgeschlossen – dir fehlt der Hausschlüssel");
    HAEUSER.schalte(z.block);
  } else if (z.art === "leiter") {
    // aufsteigen: an die leiter heranrücken (vorderseite), dann geht es mit w / s weiter
    const l = z.block, t = fussRb.translation();
    fussRb.setTranslation({ x: l.x + l.ex * 0.2, y: Math.max(t.y, l.y0 + FUSS_H + 0.05), z: l.z + l.ez * 0.2 }, true);
    fussRb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    fussKlettert = true;
    fussSprungSperre = 0;
  } else if (z.art === "klappe") {
    HAEUSER.schalte(z.block);
  } else {
    oeffneKiste(z.lot, z.art);
  }
}

// wohngegend mit straße, gärten, hecken, laternen und nachbarhäusern (wohngegend.js)
if (PLAETZE) baueGrundstuecke({ scene, world, RAPIER, mat, plaetze: PLAETZE });
else baueWohngegend({ scene, world, RAPIER, mat });
let weltAssetGruppe = WELT?.assets.length ? baueWeltAssets(scene, WELT.assets, bodenHoehe) : null;

// ort des fahrzeugs: haus (standard: kleiner parkplatz vor dem eigenen haus in der wohngegend), parkplatz (der große auf
// dem flugplatz) oder hafen. der knopf im baupanel wechselt den ort; gebaut wird dort, wo auch gestartet wird
let startOrt = "haus";
try {
  const gemerkt = localStorage.getItem("bastelkarre-startort");
  if (gemerkt === "parkplatz" || (gemerkt === "hafen" && WELTDATEN)) startOrt = gemerkt;
} catch {}
// steht das eigene haus (der server vergibt es mit dem parkplatz), gilt der ort "haus"; sonst der große parkplatz
const ortHaus = lot => startOrt === "haus" && HAEUSER.hat(lot);
const ortK = haus => (haus ? KLEIN_K : LOT_K);
const ortPos = (lot, haus = ortHaus(lot)) => (haus ? kleinerPlatz(lot) : lotPos(lot));
// stehplatz der figur neben dem fahrzeug (wie bisher in der ecke des parkplatzes)
const figurStand = (lot, haus = ortHaus(lot)) => ortPos(lot, haus).add(new THREE.Vector3(6.9 * ortK(haus), 0, -6.9 * ortK(haus)));

const PLAN_KEY = "bastelkarre-plan";
let plan;
try {
  plan = eigenBereinige(JSON.parse(localStorage.getItem(PLAN_KEY) || "null"));
} catch {
  plan = null;
}
if (!plan || !plan.parts.length) plan = BAU.bereinige(BAU.starterKart());

let modus = "bau";
let spielModus = "test";
try { if (localStorage.getItem("bastelkarre-spielmodus") === "fight") spielModus = "fight"; } catch {}
if (BAU.FIGHT_AKTIV_AUF_TOUCH) document.body.classList.add("fightTouch");
const alleKarten = () => [...FK.KARTEN, FK.EIGENE];
let fightKarte = 0;
let eigeneId = null;
function merkeKarte() {
  try { localStorage.setItem("bastelkarre-fightkarte2", fightKarte === FK.EIGENER_PLATZ ? "lokal:" + (eigeneId || "") : FK.KARTEN[fightKarte].id); } catch {}
}
try {
  const gemerkt = localStorage.getItem("bastelkarre-fightkarte2") || "";
  const offiziell = FK.KARTEN.findIndex(k => k.id === gemerkt);
  if (offiziell >= 0) fightKarte = offiziell;
  else if (gemerkt.startsWith("lokal:")) {
    const eintrag = KE.ladeLokal().find(e => e.id === gemerkt.slice(6));
    if (eintrag && FK.EIGENE.setze(eintrag.dok)) { eigeneId = eintrag.id; fightKarte = FK.EIGENER_PLATZ; }
  }
} catch {}
const fightZustand = { fb: [], pt: {} };
let meinLot = 0;
let meineId = null;
let spawnZaehler = 0;
let auswahlTyp = "block";
let auswahlFarbe = BAU.FARBEN[0];
let werkzeug = "setzen";
let drehY = 0, kippX = 0, drehAnbau = 0;
let koerperFarben = false;
const verlauf = [];
let geist = null;
let geistSchluessel = "";

let meinFahrzeug = null;
let meineGrafik = null;
let bauGrafik = null;

const meineFigur = spielfigur(spielerFarbe, spielerLook);
meineFigur.scale.setScalar(0.62);
scene.add(meineFigur);
let meinNamensschild = null, meinTag = null;
function setzeMeinNamensschild() {
  const tag = Konto.angemeldet() ? Konto.stand.fx?.tag || "" : "";
  if (meinNamensschild && tag === meinTag) return;
  if (meinNamensschild) { meineFigur.remove(meinNamensschild); entsorge(meinNamensschild); }
  meinTag = tag;
  meinNamensschild = namensSprite(spielerName, tag);
  meinNamensschild.position.set(0, 2.0, 0);
  meineFigur.add(meinNamensschild);
}
setzeMeinNamensschild();
window.addEventListener("krox-stand", setzeMeinNamensschild);

function lotBasis(lot, lift) {
  return ortPos(lot, lot === meinLot ? ortHaus(lot) : HAEUSER.hat(lot)).add(new THREE.Vector3(0, lift, 0));
}

function stelleAuf(grafik, basis) {
  grafik.groups.forEach((g, i) => {
    const u = grafik.ana.bodies[i].ursprung;
    g.position.set(basis.x + u[0], basis.y + u[1], basis.z + u[2]);
    g.quaternion.identity();
  });
}

function entferneGrafik(grafik) {
  if (!grafik) return;
  for (const s of grafik.sitze || []) {
    for (const c of [...s.obj.children]) if (c.userData.clothes) scene.attach(c);
  }
  for (const g of grafik.groups) {
    scene.remove(g);
    entsorge(g);
  }
}

function setzeFigurInSitz(figur, grafik, standort) {
  figur.removeFromParent();
  if (grafik?.sitz) {
    grafik.sitz.obj.add(figur);
    figur.position.set(0, -0.3, 0.02);
    figur.quaternion.identity();
    figur.scale.setScalar(0.62 / grafik.sitz.obj.scale.x);
    setzeSitzen(figur, true);
  } else {
    scene.add(figur);
    figur.position.copy(standort);
    figur.rotation.set(0, Math.PI * 0.75, 0);
    figur.scale.setScalar(0.62);
    setzeSitzen(figur, false);
  }
}

function baueBauansicht() {
  entferneGrafik(bauGrafik);
  bauGrafik = fahrzeugGrafik(plan, { koerperFarben, einzeln: true });
  for (const g of bauGrafik.groups) scene.add(g);
  stelleAuf(bauGrafik, lotBasis(meinLot, BAU.bodenAbstand(plan)));
  inspAuswahl = inspAuswahl.filter(i => plan.parts[i]);
  zeichneMarkierungen();
  if (modus === "bau") {
    setzeFigurInSitz(meineFigur, null, figurStand(meinLot));
  }
  $("#teileZahl").textContent = `${plan.parts.length} · ${Math.round(BAU.planMasse(plan))} kg`;
}

function planGeaendert(merken = true) {
  if (merken) {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(BAU.kompakt(plan)));
    } catch {}
  }
  baueBauansicht();
  sendePlanBald();
  if (merken) Konto.planGeaendert();
}

function paketWarnung(fehlend) {
  if (!fehlend?.length) return;
  const namen = fehlend.map(id => (BAU.PAKET_NAMEN[id] || [id, id])[EN ? 1 : 0]).join(", ");
  meldung(EN
    ? `Parts removed: they belong to the pack ${namen}, which you do not own. You can get it in the shop.`
    : `Teile entfernt: Sie gehören zum Paket ${namen}, das du nicht besitzt. Du bekommst es im Shop.`, 10000);
}
function paketPruefe(p) {
  const r = BAU.paketFilter(p, Konto.stand.owned, istAdminKonto);
  if (r.fehlend.length) paketWarnung(r.fehlend);
  return r.plan;
}

function planAusKonto(text) {
  let neu;
  try {
    neu = paketPruefe(eigenBereinige(JSON.parse(text)));
  } catch {
    return;
  }
  if (!neu.parts.length) return;
  if (modus !== "bau") return meldung("Zum Laden erst in den Baumodus wechseln");
  merkeVerlauf();
  plan = neu;
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(BAU.kompakt(plan))); } catch {}
  baueBauansicht();
  const ausdehnung = ["x", "y", "z"].map(a => {
    const w = plan.parts.map(p => p[a]);
    return (Math.max(...w) - Math.min(...w) + 1) * BAU.ZELLE;
  });
  bauKamera.dist = THREE.MathUtils.clamp(Math.max(...ausdehnung) * 1.5 + 3, 9, 160);
  bauKamera.ziel.y = ortPos(meinLot).y + 0.4 + ausdehnung[1] * 0.4;
  bodenEbene.constant = -ortPos(meinLot).y;   // die bauebene liegt auf der höhe des parkplatzes (die wohngegend steht auf einer erhöhten fläche)
  sendePlanBald();
  meldung("Fahrzeug geladen");
}

function merkeVerlauf() {
  verlauf.push(JSON.stringify(plan));
  if (verlauf.length > 100) verlauf.shift();
}

const palette = $("#palette");
const gruppen = {};
for (const [typ, def] of Object.entries(BAU.TEILE)) (gruppen[def.gruppe] ||= []).push(typ);
const gruppenListe = Object.entries(gruppen).sort((a, b) => BAU.GRUPPEN_REIHENFOLGE.indexOf(a[0]) - BAU.GRUPPEN_REIHENFOLGE.indexOf(b[0]));
for (const [name, typen] of gruppenListe) {
  const h = document.createElement("h3");
  h.textContent = tr(name);
  const nurFight = typen.every(t => BAU.TEILE[t].nurFight);
  if (nurFight) h.classList.add("nurFight");
  palette.append(h);
  const box = document.createElement("div");
  box.className = nurFight ? "gruppe nurFight" : "gruppe";
  for (const typ of typen) {
    const b = document.createElement("button");
    b.type = "button";
    if (BAU.TEILE[typ].nurFight) b.classList.add("nurFight");
    b.textContent = tr(BAU.TEILE[typ].name);
    b.title = tr(BAU.TEILE[typ].name);
    b.dataset.typ = typ;
    const paket = Object.keys(BAU.PAKET_TEILE).find(id => BAU.PAKET_TEILE[id].includes(typ));
    if (paket) b.dataset.paket = paket;
    b.onclick = () => {
      if (paket && !paketBesessen(paket)) return paketWarnung([paket]);
      waehleTyp(typ);
    };
    box.append(b);
  }
  palette.append(box);
}
function paketBesessen(id) {
  return !!Konto.stand.owned?.has(id);
}
function aktualisiereSperren() {
  for (const b of palette.querySelectorAll("button[data-paket]")) b.classList.toggle("gesperrt", !paketBesessen(b.dataset.paket));
  for (const box of palette.querySelectorAll(".gruppe")) {
    const leer = [...box.querySelectorAll("button")].every(b => b.classList.contains("gesperrt"));
    box.classList.toggle("gesperrt", leer);
    box.previousElementSibling?.classList.toggle("gesperrt", leer);
  }
  if (auswahlTyp && palette.querySelector(`button[data-typ="${auswahlTyp}"].gesperrt`)) waehleTyp("block");
}
aktualisiereSperren();
window.addEventListener("krox-stand", aktualisiereSperren);
const sensorHud = erzeugeSensorHud(game);

let vorschau = null;
function beendeVorschau() {
  if (!vorschau) return;
  scene.remove(vorschau.gruppe);
  vorschau.knopf.remove();
  vorschau = null;
}
function starteVorschau(id) {
  beendeVorschau();
  const typen = BAU.PAKET_TEILE[id];
  if (!typen?.length) return;
  const vor = new THREE.Vector3();
  camera.getWorldDirection(vor);
  vor.y = 0;
  if (vor.lengthSq() < 1e-4) vor.set(0, 0, -1);
  vor.normalize();
  const rechts = new THREE.Vector3(-vor.z, 0, vor.x);
  const mitte = camera.position.clone().addScaledVector(vor, 9);
  const hoehe = Math.max(camera.position.y - 0.5, bodenHoehe(mitte.x, mitte.z) + 1.6);
  const gruppe = new THREE.Group();
  const eintraege = typen.map((typ, i) => {
    const m = teilModell({ t: typ, x: 0, y: 0, z: 0, o: 0, c: "#2b2f36", k: BAU.standardEinstellungen(typ) });
    const stand = new THREE.Group();
    const pos = mitte.clone().addScaledVector(rechts, (i - (typen.length - 1) / 2) * 2.6);
    stand.position.set(pos.x, hoehe, pos.z);
    const dreher = new THREE.Group();
    dreher.scale.setScalar(2.6);
    dreher.add(m.obj);
    stand.add(dreher);
    const boden = bodenHoehe(pos.x, pos.z);
    const h = Math.max(0.1, hoehe - 0.65 - boden);
    const sockel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, h, 28), mat("#1a1f27", { metalness: 0.3, roughness: 0.5 }));
    sockel.position.y = -0.65 - h / 2;
    sockel.receiveShadow = true;
    stand.add(sockel);
    const name = textSprite(tr(BAU.TEILE[typ].name), { skala: 2.2 });
    name.position.y = 1.35;
    stand.add(name);
    gruppe.add(stand);
    if (typ === "laser") { const l = m.linse; l.scale.y = 3 / 60; l.position.y = 0.08 + 1.5; }
    if (typ === "schild") m.linse.scale.setScalar(0.5);
    const k = BAU.standardEinstellungen(typ);
    const falsch = {
      plan: { parts: [{ t: typ, k }] },
      grafik: { emit: new Map(m.emit ? [[0, { obj: m.obj, punkt: new THREE.Vector3(...m.emit) }]] : []), teilObj: new Map() },
      fx: new Map([[0, 1]])
    };
    return { m, dreher, phase: i * 0.9, typ, farbe: k.farbe, falsch };
  });
  scene.add(gruppe);
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.textContent = tr("Vorschau beenden") + " ✕";
  knopf.style.cssText = "position:absolute;z-index:6;left:50%;bottom:22px;transform:translateX(-50%);padding:9px 20px;border-radius:999px;border:1px solid #ffc93388;background:#2a1f00ee;color:#ffc933;font:600 15px system-ui,sans-serif;cursor:pointer";
  knopf.onclick = beendeVorschau;
  game.append(knopf);
  vorschau = { gruppe, eintraege, knopf };
}
function aktualisiereVorschau(zeit) {
  if (!vorschau) return;
  const dt = Math.max(0, Math.min(0.1, zeit - (vorschau.zeitVor ?? zeit)));
  vorschau.zeitVor = zeit;
  for (const e of vorschau.eintraege) {
    e.dreher.rotation.y = zeit * 0.7 + e.phase;
    const l = e.m.linse;
    if (l && (e.typ === "laser" || e.typ === "schild")) l.visible = true;
    else if (l) {
      l.material.emissiveIntensity = e.typ === "blinker" ? (Math.sin(zeit * 15.7) > 0 ? 6 : 0.15) : e.typ === "blaulicht" ? 1 + 5 * Math.abs(Math.sin(zeit * 11)) : 3;
      if (e.typ === "blaulicht") l.material.emissive.set(Math.sin(zeit * 11) > 0 ? e.farbe : "#ff2b2b");
    }
    if (dt > 0) emitEffekte("vorschau" + e.phase, e.falsch.plan, e.falsch.grafik, e.falsch.fx, dt);
    e.m.sensor?.anim(zeit, 0.5 + 0.5 * Math.sin(zeit * 1.3 + e.phase));
  }
}
const richtEingabe = new Set();
let zielPunktWelt = null;
const zielKreuz = document.createElement("div");
zielKreuz.id = "zielKreuz";
zielKreuz.hidden = true;
zielKreuz.innerHTML = "<i></i><b></b>";
game.append(zielKreuz);
const zielDist = zielKreuz.querySelector("b");
const zielV = new THREE.Vector3();

// auto-ziel fuer touch und gamepad: naechster lebender gegner im umkreis
function naechsterGegner() {
  const mich = (PH.sitzKoerper(meinFahrzeug) || meinFahrzeug.bodies[0])?.rb.translation();
  if (!mich) return null;
  let best = null, bd = 380;
  const pruefe = fz => {
    const b = PH.sitzKoerper(fz) || fz.bodies[0];
    if (!b || fz.tot) return;
    const t = b.rb.translation();
    const d = Math.hypot(t.x - mich.x, t.y - mich.y, t.z - mich.z);
    if (d < bd) { bd = d; best = [t.x, t.y + 0.4, t.z]; }
  };
  for (const r of andere.values()) if (r.fm && r.m === "fahr" && r.kin) pruefe(r.kin);
  for (const v of npcs?.fahrzeuge() || []) pruefe(v);
  return best;
}

// gamepad: linker stick fahren, rechter trigger / A feuern, linker trigger / B bremsen, X munition, Y aus-/einsteigen
let padAktiv = false;
const padTasten = new Set();
const padVorher = new Set();
// ein pad zaehlt erst, wenn es sich wirklich bedienen laesst: alle knoepfe muessen einmal losgelassen und die sticks in ruhe sein,
// danach zaehlt ein frischer knopfdruck. tastatureingaben schalten das pad wieder ab. so stoeren geraete mit dauerhaft verdrehten
// achsen oder haengenden knoepfen (headsets, lenkraeder, virtuelle controller) das fahren nicht
const PAD_AUS = new URLSearchParams(location.search).has("pad") && new URLSearchParams(location.search).get("pad") === "aus";
let padBestaetigt = null;
let padRuhe = false;
function pollGamepad() {
  if (PAD_AUS) return;
  const gp = [...(navigator.getGamepads?.() || [])].find(g => g && g.connected && g.mapping === "standard");
  if (!gp) {
    padBestaetigt = null;
    padRuhe = false;
    if (padAktiv) { padAktiv = false; if (joyPointer === null) joyX = joyY = 0; for (const t of padTasten) touchGedrueckt.delete(t); padTasten.clear(); }
    return;
  }
  if (padBestaetigt !== gp.id) {
    const gedrueckt = gp.buttons.some(b => b.pressed);
    const ruhig = gp.axes.every(a => Math.abs(a) < 0.3);
    if (!gedrueckt && ruhig) padRuhe = true;
    if (!(padRuhe && gedrueckt && ruhig)) return;
    padBestaetigt = gp.id;
  }
  padAktiv = true;
  const tot = v => (Math.abs(v) > 0.22 ? v : 0);
  if (joyPointer === null) { joyX = tot(gp.axes[0] || 0); joyY = tot(gp.axes[1] || 0); }
  const soll = new Set();
  if (gp.buttons[7]?.pressed || gp.buttons[0]?.pressed) for (const t of feuerTasten) soll.add(t);
  if (gp.buttons[6]?.pressed || gp.buttons[1]?.pressed) soll.add("space");
  for (const t of padTasten) if (!soll.has(t)) touchGedrueckt.delete(t);
  for (const t of soll) touchGedrueckt.add(t);
  padTasten.clear();
  for (const t of soll) padTasten.add(t);
  const neu = i => { const an = !!gp.buttons[i]?.pressed; const war = padVorher.has(i); an ? padVorher.add(i) : padVorher.delete(i); return an && !war; };
  if (neu(2)) for (const t of wechselTasten) angetippt.add(t);
  if (neu(3)) ausEinsteigen();
  if (neu(8) || neu(9)) neuStarten();
}

function zielModus() {
  return modus === "fahr" && !!meinFahrzeug && istFahrer() && richtMotoren(meinFahrzeug).length > 0;
}

function zielenAktualisieren(dt) {
  richtEingabe.clear();
  if (!zielModus()) { zielKreuz.hidden = true; zielPunktWelt = null; canvas.style.cursor = ""; return; }
  canvas.style.cursor = "crosshair";
  const aktiv = zeiger.size > 0 || (mausAufCanvas && Math.abs(maus.x) <= 1 && Math.abs(maus.y) <= 1);
  const autoZiel = (touchModus || padAktiv) && fightAktiv() && zeiger.size === 0;
  if (autoZiel) {
    const z = naechsterGegner();
    zielPunktWelt = z ? [z[0], z[1], z[2], true] : null;
  } else if (aktiv && Math.abs(maus.x) <= 1 && Math.abs(maus.y) <= 1) {
    const o = camera.position;
    const d = zielV.set(maus.x, maus.y, 0.5).unproject(camera).sub(o).normalize();
    const hit = world.castRay(new RAPIER.Ray({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z }), 3000, true, undefined, undefined, undefined, undefined, col => !meinFahrzeug.colliderSet.has(col.handle));
    const t = hit ? (hit.timeOfImpact ?? hit.toi ?? 3000) : 1500;
    zielPunktWelt = [o.x + d.x * t, o.y + d.y * t, o.z + d.z * t, !!hit];
  }
  if (!zielPunktWelt) { zielKreuz.hidden = true; return; }
  for (const t of richtTasten(meinFahrzeug, zielPunktWelt, dt)) richtEingabe.add(t);
  zielV.set(zielPunktWelt[0], zielPunktWelt[1], zielPunktWelt[2]).project(camera);
  const sichtbar = zielV.z < 1 && Math.abs(zielV.x) <= 1.05 && Math.abs(zielV.y) <= 1.05;
  zielKreuz.hidden = !sichtbar;
  if (sichtbar) {
    const r = canvas.getBoundingClientRect();
    zielKreuz.style.left = `${r.left + (zielV.x * 0.5 + 0.5) * r.width}px`;
    zielKreuz.style.top = `${r.top + (-zielV.y * 0.5 + 0.5) * r.height}px`;
    const m = PH.muendungPos(meinFahrzeug, richtMotoren(meinFahrzeug)[0].waffe);
    zielDist.textContent = m ? `${Math.round(Math.hypot(zielPunktWelt[0] - m.pos[0], zielPunktWelt[1] - m.pos[1], zielPunktWelt[2] - m.pos[2]))} m` : "";
    zielKreuz.classList.toggle("treffer", !!zielPunktWelt[3]);
  }
}

window.addEventListener("krox-vorschau", e => starteVorschau(e.detail?.pack));
window.addEventListener("keydown", e => { if (e.key === "Escape") beendeVorschau(); });

palette.addEventListener("wheel", e => {
  if (document.body.classList.contains("touch") && palette.scrollWidth > palette.clientWidth) {
    palette.scrollLeft += e.deltaY + e.deltaX;
    e.preventDefault();
  }
}, { passive: false });

function waehleTyp(typ) {
  auswahlTyp = typ;
  for (const b of palette.querySelectorAll("button")) {
    b.classList.toggle("an", b.dataset.typ === typ);
    if (b.dataset.typ === typ && document.body.classList.contains("touch")) {
      b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }
  setzeWerkzeug("setzen");
  geistSchluessel = "";
}
waehleTyp("block");

const farbenEl = $("#farben");
function baueFarben() {
  farbenEl.innerHTML = "";
  const extra = Object.entries(BAU.PAKET_FARBEN).filter(([id]) => Konto.hatPaket(id)).flatMap(([, f]) => f);
  for (const f of [...BAU.FARBEN, ...extra]) {
    const b = document.createElement("button");
    b.type = "button";
    b.style.background = f;
    b.title = f;
    b.classList.toggle("an", f === auswahlFarbe);
    b.onclick = () => { auswahlFarbe = f; baueFarben(); geistSchluessel = ""; };
    farbenEl.append(b);
  }
  const eigene = document.createElement("input");
  eigene.type = "color";
  eigene.value = auswahlFarbe;
  eigene.title = tr("Eigene Farbe");
  eigene.oninput = () => { auswahlFarbe = eigene.value; geistSchluessel = ""; };
  farbenEl.append(eigene);
}
baueFarben();

function setzeWerkzeug(w) {
  werkzeug = w;
  for (const b of document.querySelectorAll("[data-tool]")) b.classList.toggle("an", b.dataset.tool === w);
}
for (const b of document.querySelectorAll("[data-tool]")) b.onclick = () => setzeWerkzeug(b.dataset.tool);

function drehen() {
  if (BAU.TEILE[auswahlTyp].art === "anbau") drehAnbau = (drehAnbau + 1) % 4;
  else drehY = (drehY + 1) % 4;
  geistSchluessel = "";
}
function kippen() {
  kippX = (kippX + 1) % 4;
  geistSchluessel = "";
}
function schalteKoerper() {
  koerperFarben = !koerperFarben;
  $("#btnKoerper").classList.toggle("an", koerperFarben);
  baueBauansicht();
  meldung(koerperFarben ? "Jede Farbe = ein starrer Körper. Gleiche Farbe = fest verbunden." : "Normale Farben");
}
function rueckgaengig() {
  if (!verlauf.length) return meldung("Nichts rückgängig zu machen");
  plan = eigenBereinige(JSON.parse(verlauf.pop()));
  schliesseInspector();
  planGeaendert();
}
$("#btnDrehen").onclick = drehen;
$("#btnKippen").onclick = kippen;
$("#btnKoerper").onclick = schalteKoerper;
$("#btnUndo").onclick = rueckgaengig;
$("#btnHangar").onclick = () => document.getElementById("modelleBtn")?.click();
// der knopf nennt das ziel des nächsten klicks: vom haus zum großen parkplatz, von dort (und vom hafen) zurück zum haus
const zeigeStartOrt = () => {
  const ziel = startOrt === "haus" ? "→ Großer Parkplatz" : startOrt === "parkplatz" && WELTDATEN ? "→ Hafen" : "→ Zum Haus";
  $("#startTxt").textContent = tr(ziel);
};
$("#btnStart").hidden = false;
$("#btnStart").onclick = () => {
  startOrt = startOrt === "haus" ? "parkplatz" : startOrt === "parkplatz" && WELTDATEN ? "hafen" : "haus";
  try { localStorage.setItem("bastelkarre-startort", startOrt); } catch {}
  zeigeStartOrt();
  wechsleBauort();
};
zeigeStartOrt();
$("#btnExport").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(plan)], { type: "application/json" }));
  a.download = "bastelkarre.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#btnImport").onclick = () => $("#importDatei").click();
$("#importDatei").onchange = async e => {
  const datei = e.target.files[0];
  e.target.value = "";
  if (!datei) return;
  let neu = null;
  try {
    neu = paketPruefe(eigenBereinige(JSON.parse(await datei.text())));
  } catch {}
  if (!neu || !neu.parts.length) return meldung("Ungültige Fahrzeug-Datei");
  merkeVerlauf();
  plan = neu;
  schliesseInspector();
  planGeaendert();
  meldung("Fahrzeug importiert (Rückgängig mit Strg+Z)");
};
$("#btnLeeren").onclick = () => {
  if (!plan.parts.length) return;
  merkeVerlauf();
  plan = { v: 1, parts: [] };
  schliesseInspector();
  planGeaendert();
  meldung("Alles entfernt (Rückgängig mit Strg+Z)");
};

const inspector = $("#inspector");
const inspInhalt = $("#inspInhalt");
const BESCHRIFTBAR = ["nebel", "duese", "rakete", "servo", "mikro", "bruch", "fallschirm", "kamera", "steuerflaeche", "scheinwerfer", "propeller", "explosive",
  "unterboden", "strahler", "blinker", "blaulicht", "laser", "konfetti", "rauchwerfer", "fackel", "stoersender", "schild", "feuerloescher"];
let inspAuswahl = [];
let tastenWarten = null;
const markierungen = new THREE.Group();
scene.add(markierungen);
const markierGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BAU.ZELLE * 1.04, BAU.ZELLE * 1.04, BAU.ZELLE * 1.04));
const markierMat = new THREE.LineBasicMaterial({ color: "#4aa3ff", depthTest: false, transparent: true });
const markierMatErst = new THREE.LineBasicMaterial({ color: "#ffd43b", depthTest: false, transparent: true });

function zeichneMarkierungen() {
  markierungen.clear();
  if (modus !== "bau") return;
  const basis = lotBasis(meinLot, BAU.bodenAbstand(plan));
  inspAuswahl.forEach((i, n) => {
    const p = plan.parts[i];
    if (!p) return;
    const c = BAU.zellMitte(p);
    const l = new THREE.LineSegments(markierGeo, n === 0 ? markierMatErst : markierMat);
    l.position.set(basis.x + c[0], basis.y + c[1], basis.z + c[2]);
    l.renderOrder = 10;
    markierungen.add(l);
  });
}

const TASTEN_NAMEN = {
  space: "Leertaste", shift: "Shift", control: "Strg", alt: "Alt", enter: "Enter",
  arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→", tab: "Tab", backspace: "⌫",
  maus0: "Maus links", maus1: "Maus Mitte", maus2: "Maus rechts", maus3: "Maus Zurück", maus4: "Maus Vor"
};
const tastenText = t => (TASTEN_NAMEN[t] ? tr(TASTEN_NAMEN[t]) : (t || "–").toUpperCase());

function tasteNorm(e) {
  if (e.key === " ") return "space";
  return e.key.toLowerCase();
}

function schliesseInspector() {
  inspAuswahl = [];
  tastenWarten = null;
  inspector.hidden = true;
  zeichneMarkierungen();
}

function oeffneInspector(i, zusatz = false) {
  if (zusatz) {
    inspAuswahl = inspAuswahl.includes(i) ? inspAuswahl.filter(n => n !== i) : [...inspAuswahl, i];
    if (!inspAuswahl.length) return schliesseInspector();
  } else {
    inspAuswahl = [i];
  }
  inspector.hidden = false;
  zeichneMarkierungen();
  zeigeInspector();
}

function waehleAlle(typ) {
  const alle = plan.parts.map((p, i) => i).filter(i => !typ || plan.parts[i].t === typ);
  if (!alle.length) return;
  const vorn = inspAuswahl.length && alle.includes(inspAuswahl[0]) ? inspAuswahl[0] : alle[0];
  inspAuswahl = [vorn, ...alle.filter(i => i !== vorn)];
  inspector.hidden = false;
  zeichneMarkierungen();
  zeigeInspector();
}

function zeigeInspector() {
  inspAuswahl = inspAuswahl.filter(i => plan.parts[i]);
  const p = plan.parts[inspAuswahl[0]];
  if (!p) return schliesseInspector();
  const ziele = inspAuswahl.map(i => plan.parts[i]);
  const gleich = ziele.every(q => q.t === p.t);
  const def = BAU.TEILE[p.t];
  $("#inspTitel").textContent = ziele.length > 1
    ? (gleich ? `${tr(def.name)} ×${ziele.length}` : `${ziele.length} ${tr("Teile")}`)
    : tr(def.name);
  inspInhalt.innerHTML = "";

  const setzeK = (key, wert) => { for (const q of ziele) q.k[key] = wert; };

  const aendern = fn => {
    merkeVerlauf();
    fn();
    planGeaendert();
    zeigeInspector();
  };

  const feld = (label, element, wert) => {
    const d = document.createElement("div");
    d.className = "feld";
    const l = document.createElement("span");
    l.textContent = tr(label);
    d.append(l);
    if (wert !== undefined) {
      const w = document.createElement("span");
      w.className = "wert";
      w.textContent = wert;
      d.append(w);
    }
    d.append(element);
    inspInhalt.append(d);
    return d;
  };

  const regler = (label, key, min, max, step, einheit) => {
    const r = document.createElement("input");
    r.type = "range";
    r.min = min; r.max = max; r.step = step;
    r.value = p.k[key];
    const d = feld(label, r, `${p.k[key]}${einheit}`);
    r.value = Math.min(max, Math.max(min, p.k[key]));
    const zahl = document.createElement("input");
    zahl.type = "number";
    zahl.className = "wertFeld";
    zahl.step = step;
    zahl.value = p.k[key];
    zahl.title = tr("Auch Werte außerhalb des Reglers sind möglich");
    let [lo, hi] = BAU.GRENZEN[key] || [-1e9, 1e9];
    if (key === "reichweite" && istAdminKonto) hi = BAU.ADMIN_REICHWEITE;
    const wertBox = d.querySelector(".wert");
    wertBox.textContent = "";
    wertBox.append(zahl, document.createTextNode(einheit));
    r.oninput = () => { zahl.value = r.value; };
    r.onchange = () => aendern(() => { setzeK(key, Number(r.value)); });
    zahl.onchange = () => {
      const v = Number(zahl.value);
      if (!Number.isFinite(v)) { zahl.value = p.k[key]; return; }
      const geklemmt = Math.min(hi, Math.max(lo, v));
      if (geklemmt !== v) meldung("Wert auf die zulässige Grenze begrenzt");
      aendern(() => { setzeK(key, geklemmt); });
    };
  };

  const ARTEN_LISTE = [["he", "HE (hochexplosiv)"], ["ap", "AP (Wuchtgeschoss)"], ["heat", "HEAT (Hohlladung)"]];
  const auswahl = (label, key, optionen) => {
    const s = document.createElement("select");
    for (const [v, t] of optionen) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = tr(t);
      if (String(p.k[key]) === String(v)) o.selected = true;
      s.append(o);
    }
    feld(label, s);
    s.onchange = () => aendern(() => {
      setzeK(key, s.value === "true" ? true : s.value === "false" ? false : s.value);
    });
  };

  const taste = (label, key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "taste";
    b.textContent = tastenText(p.k[key]);
    b.onclick = () => {
      b.classList.add("warte");
      b.textContent = tr("Taste oder Maustaste drücken …");
      tastenWarten = t => aendern(() => { setzeK(key, t); });
    };
    feld(label, b);
  };

  const farbe = (label, key) => {
    const f = document.createElement("input");
    f.type = "color";
    f.value = p.k[key];
    feld(label, f);
    f.onchange = () => aendern(() => { setzeK(key, f.value); });
  };

  const fz = document.createElement("div");
  fz.className = "zeile";
  for (const f of BAU.FARBEN) {
    const b = document.createElement("button");
    b.type = "button";
    b.style.cssText = `background:${f};width:22px;height:22px;padding:0;border-radius:50%;flex:0 0 auto`;
    if (f === p.c) b.style.outline = "2px solid #fff";
    b.onclick = () => aendern(() => { for (const q of ziele) q.c = f; });
    fz.append(b);
  }
  const eigene = document.createElement("input");
  eigene.type = "color";
  eigene.value = p.c;
  eigene.onchange = () => aendern(() => { for (const q of ziele) q.c = eigene.value; });
  fz.append(eigene);
  inspInhalt.append(fz);

  const groessen = [["S", "Klein"], ["M", "Mittel"], ["L", "Groß"]];
  switch (gleich ? p.t : "") {
    case "rad_lenk":
      regler("Max. Lenkwinkel", "winkel", 5, 60, 1, "°");
      auswahl("Größe", "groesse", groessen);
      auswahl("Antrieb", "antrieb", [[true, "angetrieben"], [false, "frei rollend"]]);
      auswahl("Lenkrichtung", "umkehr", [["auto", "automatisch"], ["nein", "normal"], ["ja", "umgekehrt"]]);
      break;
    case "rad_fest":
      auswahl("Größe", "groesse", groessen);
      auswahl("Antrieb", "antrieb", [[true, "angetrieben"], [false, "frei rollend"]]);
      break;
    case "rad_bock":
      auswahl("Größe", "groesse", groessen);
      break;
    case "auspuff":
      farbe("Abgasfarbe", "farbe");
      break;
    case "nebel":
      farbe("Nebelfarbe", "farbe");
      taste("An/Aus", "taste");
      break;
    case "duese":
      taste("Schub (halten)", "taste");
      regler("Schub", "schub", 1, 200, 0.5, " kN");
      break;
    case "rakete":
      taste("Zünden (halten)", "taste");
      regler("Schub", "schub", 5, 1000, 1, " kN");
      regler("Brenndauer", "dauer", 1, 8, 0.5, " s");
      break;
    case "fluegel":
      regler("Auftriebsfläche", "flaeche", 0.5, 8, 0.5, " m²");
      break;
    case "steuerflaeche": {
      regler("Fläche", "flaeche", 0.5, 4, 0.5, " m²");
      regler("Max. Ausschlag", "winkel", 5, 45, 1, "°");
      const ks = document.createElement("select");
      for (const [v, t] of [["nick", "Nicken (Höhenruder)"], ["roll", "Rollen (Querruder)"], ["gier", "Gieren (Seitenruder)"]]) {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = tr(t);
        if (p.k.kanal === v) o.selected = true;
        ks.append(o);
      }
      feld("Kanal", ks);
      ks.onchange = () => aendern(() => {
        for (const q of ziele) {
          q.k.kanal = ks.value;
          [q.k.plus, q.k.minus] = BAU.KANAL_TASTEN[ks.value];
        }
      });
      auswahl("Richtung", "gegenlauf", [[false, "normal"], [true, "gegenläufig"]]);
      taste("Ausschlag +", "plus");
      taste("Ausschlag −", "minus");
      break;
    }
    case "scheinwerfer":
      taste("An/Aus", "taste");
      farbe("Lichtfarbe", "farbe");
      break;
    case "propeller":
      taste("Gashebel +", "plus");
      taste("Gashebel −", "minus");
      regler("Schub", "schub", 0.5, 10, 0.5, " kN");
      break;
    case "tank":
      regler("Kapazität", "kapazitaet", 10, 300, 10, "");
      break;
    case "motor":
      regler("Leistung", "ps", 20, 1500, 10, " PS");
      break;
    case "geschuetz":
      regler("Kaliber", "kaliber", 25, 155, 5, " mm");
      break;
    case "verschluss":
      taste("Schiessen", "taste");
      taste("Munitionsart wechseln", "wechsel");
      auswahl("Geschossart", "geschoss", ARTEN_LISTE);
      regler("Geschossdurchmesser", "durchmesser", 25, 155, 5, " mm");
      break;
    case "schnellfeuer":
      taste("Schiessen", "taste");
      regler("Kaliber", "kaliber", 25, 40, 5, " mm");
      break;
    case "helium":
      regler("Auftrieb", "auftrieb", 0, 1000, 5, " kg");
      break;
    case "sitz":
      auswahl("Andere Spieler dürfen steuern", "fremd", [[false, "nein"], [true, "ja"]]);
      for (const [r, t] of BAU.SITZ_RECHTE) auswahl(t, r, [[true, "erlaubt"], [false, "gesperrt"]]);
      break;
    case "panzer":
      regler("Wandstärke", "staerke", 20, 300, 10, " mm");
      break;
    case "munition": {
      auswahl("Geschossart", "geschoss", ARTEN_LISTE);
      regler("Kaliber", "kaliber", 25, 155, 5, " mm");
      const kap = document.createElement("p");
      kap.style.cssText = "margin:6px 0 0";
      kap.textContent = `${tr("Fasst")}: ${BAU.munitionKapazitaet(p.k.kaliber)} ${tr("Schuss")}`;
      inspInhalt.append(kap);
      break;
    }
    case "lidar":
      regler("Messweite", "messweite", 5, 500, 5, " m");
      regler("Alarm unter", "alarm", 0, 100, 1, " m");
      farbe("Anzeigefarbe", "farbe");
      break;
    case "radar":
      regler("Messweite", "messweite", 25, 1000, 25, " m");
      farbe("Anzeigefarbe", "farbe");
      break;
    case "gyro":
      farbe("Anzeigefarbe", "farbe");
      break;
    case "hoehe":
      regler("Messweite", "messweite", 5, 1000, 5, " m");
      regler("Alarm unter", "alarm", 0, 100, 1, " m");
      farbe("Anzeigefarbe", "farbe");
      break;
    case "kraft":
      regler("Alarm ab", "alarm", 0, 12, 0.5, " g");
      farbe("Anzeigefarbe", "farbe");
      break;
    case "unterboden":
    case "strahler":
    case "blinker":
    case "blaulicht":
      taste("An/Aus", "taste");
      farbe("Lichtfarbe", "farbe");
      break;
    case "laser":
      taste("An/Aus", "taste");
      regler("Strahllänge", "messweite", 5, 300, 5, " m");
      farbe("Strahlfarbe", "farbe");
      break;
    case "funken":
    case "plasma":
    case "staubspur":
      farbe("Effektfarbe", "farbe");
      break;
    case "konfetti":
      taste("Zünden", "taste");
      break;
    case "rauchwerfer":
      taste("Zünden", "taste");
      farbe("Rauchfarbe", "farbe");
      break;
    case "fackel":
      taste("Zünden", "taste");
      farbe("Fackelfarbe", "farbe");
      break;
    case "feuerloescher":
      taste("Löschen", "taste");
      break;
    case "stoersender":
      taste("An/Aus", "taste");
      farbe("Ringfarbe", "farbe");
      break;
    case "schild":
      taste("An/Aus", "taste");
      regler("Schutzradius", "reichweite", 1, 12, 0.5, " m");
      farbe("Schildfarbe", "farbe");
      break;
    case "kamera":
      taste("Ansicht umschalten", "taste");
      regler("Blickfeld", "fov", 30, 120, 5, "°");
      break;
    case "fallschirm":
      taste("Öffnen/Einpacken", "taste");
      regler("Schirmfläche", "flaeche", 2, 40, 1, " m²");
      farbe("Schirmfarbe", "farbe");
      break;
    case "servo":
      taste("Drehen +", "plus");
      taste("Drehen −", "minus");
      auswahl("Modus", "modus", [["winkel", "Winkel halten"], ["dauer", "Dauerdrehung"]]);
      if (p.k.modus !== "dauer") regler("Max. Winkel", "winkel", 10, 180, 5, "°");
      regler("Tempo", "tempo", 10, 360, 10, "°/s");
      regler("Haltekraft", "haltekraft", 0.5, 200, 0.5, " kN");
      regler("Drehkraft", "drehkraft", 0.5, 200, 0.5, " kN");
      auswahl("Richtmotor (zielt mit Maus/Finger)", "richt", [[false, "nein"], [true, "ja"]]);
      break;
    case "mikro":
      taste("Drehen +", "plus");
      taste("Drehen −", "minus");
      taste("Neigen +", "hoch");
      taste("Neigen −", "runter");
      regler("Tempo", "tempo", 5, BAU.MIKRO_TEMPO, 1, "°/s");
      regler("Haltekraft", "haltekraft", 0.5, 200, 0.5, " kN");
      regler("Drehkraft", "drehkraft", 0.5, 200, 0.5, " kN");
      auswahl("Richtmotor (zielt mit Maus/Finger)", "richt", [[false, "nein"], [true, "ja"]]);
      break;
    case "bruch":
      taste("Trennen", "taste");
      break;
    case "explosive":
      taste("Zünden", "taste");
      farbe("Lichtfarbe", "farbe");
      regler("Reichweite", "reichweite", 0.5, 30, 0.5, " m");
      regler("Kraft", "kraft", 1, 1000, 1, " kN");
      break;
  }

  if (gleich && BESCHRIFTBAR.includes(p.t)) {
    const eingabe = document.createElement("input");
    eingabe.type = "text";
    eingabe.maxLength = 10;
    eingabe.value = p.k.name || "";
    eingabe.placeholder = tr(def.name).slice(0, 10);
    eingabe.title = tr("Erscheint auf dem Knopf im Handheld-Modus (höchstens 10 Zeichen)");
    eingabe.onchange = () => aendern(() => { setzeK("name", eingabe.value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 10) || undefined); });
    feld("Beschriftung", eingabe);
  }

  const hinweis = document.createElement("p");
  const hinweisText = gleich ? p.t : "gemischt";
  hinweis.style.cssText = "color:var(--muted);margin:10px 0 6px;line-height:1.35";
  hinweis.className = "hinweis";
  hinweis.textContent = tr({
    sitz: "Hier sitzt du (X zum Ein-/Aussteigen). Beliebig viele Sitze möglich; der zuerst gebaute legt fest, wo vorne ist.",
    rad_lenk: "Lenkt mit A/D. Räder hinter dem Schwerpunkt lenken automatisch gegenläufig.",
    rad_fest: "Starres Rad: rollt nur geradeaus.",
    rad_bock: "Dreht sich frei um 360° und folgt der Bewegung. Kein Antrieb.",
    auspuff: "Raucht, solange der Motor läuft (M schaltet ihn aus und an).",
    nebel: "Nebelt auf Knopfdruck, auch ohne Motor.",
    duese: "Schiebt den Körper, an dem es sitzt, auch wenn es nicht verbunden ist.",
    fluegel: "Erzeugt Auftrieb und Luftwiderstand, je nach Anstellwinkel zur Anströmung (Strömungsabriss ab ca. 17°). Schräg einbauen (T kippt) oder das Fahrzeug nach oben nicken, damit er trägt. Die Fläche ist die wirksame Auftriebsfläche.",
    steuerflaeche: "Ruder: kippt ihre Hinterkante mit den Tasten. Kanal Nicken = Höhenruder (hinten), Rollen = Querruder (links und rechts gegenläufig!), Gieren = Seitenruder (senkrecht stellen mit T). Hinterkante ist die gelbe Seite.",
    scheinwerfer: "Leuchtet nach vorn (in Richtung der Linse). Die Taste schaltet ihn an und aus.",
    leiter: "Zu Fuß hochklettern: W/S an der Leiter, Leertaste springt ab. Mehrere Leitern übereinander ergeben eine lange Leiter (R/T dreht sie).",
    propeller: "Schiebt wie ein Propeller: Die Gashebel-Tasten stellen die Leistung ein und sie bleibt eingestellt. Der Schub sinkt in dünner Luft; im Weltraum gibt es keinen.",
    tank: "Treibstoff für Triebwerke, Propeller und den Fahrmotor (Raketen haben eigenen). Mit Tank geht ohne Treibstoff nichts, ohne Tank ist der Verbrauch aus. K schaltet den Verbrauch aus und an.",
    kamera: "Schalte mit der Taste auf den Blick durch die Kamera um (ohne im Fahrzeug zu sein). Sie schaut in Richtung der Linse.",
    fallschirm: "Taste öffnet den Schirm, nochmal drücken packt ihn ein. Er bremst umso stärker, je schneller du bist – auch beim Fallen.",
    rakete: "Sehr starker Schub, aber nur für die Brenndauer. Danach lädt sie wieder auf.",
    servo: "Alles, was oben (an der Drehscheibe) angebaut ist, dreht sich gegen den Rest. Als Richtmotor richtet er die Waffe an seinem Kopf automatisch auf den Punkt aus, auf den du mit der Maus zeigst (oder den du mit dem Finger antippst).",
    mikro: "Zweiachsiger Stellmotor: dreht sich dauerhaft (höchstens 30 °/s) und neigt den Aufbau um höchstens 30 ° (±15 °). Gut als Geschützlafette. Quer-Achse ist die rechte Seite des Teils (R dreht es). Als Richtmotor zielt er mit Maus oder Finger: Gieren und Neigen richten die Waffe an seinem Kopf automatisch aus.",
    wand: "Eine dünne Platte, die außen an einem belegten Block sitzt (nur 4 kg). Ideal für Verkleidung und Flügel-Optik.",
    bruch: "Hält fest, bis du die Taste drückst. Dann trennt sie die Teile.",
    helium: "Wiegt nur 2 kg und trägt so viel, wie du einstellst (0–1000 kg, Standard 45): Genug Helium lässt ein Fahrzeug aufsteigen, wenige Blöcke machen es leichter. In grosser Höhe wird die Luft dünn und der Auftrieb schwindet.",
    panzer: "Sehr schwer und explosionssicher: Seine Verbindungen halten auch bei Sprengungen, und ein Körper mit Panzerblock wird nicht weggeschleudert.",
    explosive: "Einmal zünden: ein Blitz trennt alle Verbindungen im Umkreis (Reichweite in Metern) und drückt die Teile mit der eingestellten Kraft von der Ladung weg. Nach einem Neustart ist sie wieder scharf.",
    motor: "Treibt die Räder an, egal wo er im Fahrzeug sitzt. Die Leistung stellst du in PS ein (150 PS entsprechen dem bisherigen Antrieb). Mehrere Motoren addieren ihre Leistung, mehr Leistung verbraucht mehr Treibstoff. Bei einem Treffer im Fight-Modus ist er kaputt. Ohne Motor-Baustein fährt das Fahrzeug mit Standardleistung.",
    geschuetz: "Rohr eines Geschützes. Es feuert von seinem Verschluss weg (Verschluss an die Rückseite bauen). Kaliber 25–155 mm. Ist das Rohr zerstört, fliegen Geschosse langsamer und streuen mehr.",
    verschluss: "Schiesst durch das Rohr, das an ihm sitzt. Ist das Geschoss dicker als das Kaliber, geht es im Rohr los; ist es dünner, fliegt es langsamer und ungenauer. Bei einem Treffer ist er kaputt, dann geht kein Schuss mehr. Die Geschossart (HE, AP, HEAT) stellst du ein, eine zweite Taste schaltet sie im Spiel um.",
    schnellfeuer: "Schnellfeuerkanone: Rohr und Verschluss in einem, feuert entlang ihrer Oberseite rund neun Schuss pro Sekunde, solange du die Taste hältst. Kaliber 25–40 mm, die Geschosse schlagen kaum durch und machen wenig Schaden, treffen aber oft. Sie braucht ein Munitionslager mit gleichem Kaliber am selben festen Fahrzeugteil (jede Geschossart).",
    munition: "Lager für Patronen eines Kalibers (eine Zelle, 0,125 m³). Je grösser das Kaliber, desto weniger Schuss passen hinein. Ein Verschluss schiesst nur, wenn ein Lager am selben festen Fahrzeugteil genau sein Geschossdurchmesser-Kaliber hat. Sitzt das Lager direkt am Verschluss, lädt er doppelt so schnell nach. Bei einem Treffer explodiert der Rest der Munition. Ein Lager enthält genau eine Geschossart: HE sprengt im Umkreis, AP schlägt hart in ein einzelnes Teil, HEAT durchschlägt Blöcke, macht aber weniger Schaden als AP.",
    lidar: "Sensorik: Der rotierende Laser misst den Abstand zum nächsten Hindernis in Richtung der Oberseite (einstellbar bis 500 m). Der Wert erscheint im Sensor-Display, solange du fährst.",
    radar: "Sensorik: Der Ortungsradar zeigt andere Fahrzeuge im Umkreis von 250 m auf einem Rundum-Scope (dein Fahrzeug zeigt nach oben). Ein Strich am Punkt zeigt, dass der andere deutlich höher oder tiefer ist.",
    gyro: "Sensorik: Die Gyro-Kugel zeigt Nick- und Rolllage als künstlichen Horizont plus den Kurs. Die Ringe kreisen schneller, wenn das Fahrzeug dreht.",
    hoehe: "Sensorik: Der Radar-Höhenmesser misst die Höhe über dem Boden (senkrecht nach unten, bis 400 m). Je näher der Boden, desto schneller laufen die Ping-Ringe.",
    kraft: "Sensorik: Der Kristall spürt die Kräfte am Fahrzeug in g (1 g = ruhig stehen). Er leuchtet grün, bei Last bernsteinfarben und bei Stössen rot.",
    unterboden: "Neon: Leuchtleiste für unter das Fahrzeug. Die Taste schaltet sie an und aus, sie wirft farbiges Licht auf den Boden.",
    strahler: "Neon: breites, helles Flutlicht in Richtung der Oberseite. Die Taste schaltet es an und aus.",
    blinker: "Neon: Warnblinker, blinkt an und aus, solange er eingeschaltet ist.",
    blaulicht: "Neon: Rundumleuchte, die zwischen deiner Lichtfarbe und Rot wechselt und die Umgebung anstrahlt.",
    laser: "Neon: sichtbarer Laserstrahl entlang der Oberseite (Länge und Farbe einstellbar). Wände und Boden verdecken ihn.",
    funken: "Spuren: Funkenschweif, der mit dem Tempo stärker wird (ab ca. 2 m/s). Die Funken fliegen in Richtung der Oberseite.",
    regenbogen: "Spuren: Abgas, das ständig die Farbe wechselt. Stärke nach Tempo.",
    staubspur: "Spuren: aufgewirbelter Staub hinter dem Fahrzeug, stärker bei hohem Tempo.",
    plasma: "Spuren: knisternde Plasmaspur, stärker bei hohem Tempo.",
    konfetti: "Spuren: die Taste schiesst drei Sekunden lang buntes Konfetti, danach lädt die Kanone acht Sekunden nach.",
    rauchwerfer: "Gadget: wirft sechs Sekunden lang dichten Rauch als Sichtschutz, danach acht Sekunden Ladezeit.",
    fackel: "Gadget: brennt zwölf Sekunden hell und leuchtet die Umgebung aus, danach acht Sekunden Ladezeit.",
    stoersender: "Gadget: solange er an ist, siehst du auf dem Ortungsradar anderer Spieler nicht mehr als Punkt.",
    schild: "Gadget: eine Energiekuppel (Schutzradius einstellbar) fängt Treffer im Fight-Modus ab, kostet dabei Energie und bricht bei leerer Batterie zusammen. Läuft 45 s, lädt in 30 s; einschalten geht ab 30 % Ladung.",
    feuerloescher: "Gadget: löscht drei Sekunden lang alle Brände an deinem Fahrzeug, danach acht Sekunden Ladezeit.",
    gemischt: "Gemischte Teile: nur Farbe und Entfernen gelten für alle."
  }[hinweisText] || "");
  if (hinweis.textContent) inspInhalt.append(hinweis);

  const weg = document.createElement("button");
  weg.type = "button";
  weg.textContent = tr(ziele.length > 1 ? "Teile entfernen" : "Teil entfernen");
  weg.onclick = () => { entferneAuswahl(); };
  const z = document.createElement("div");
  z.className = "zeile";
  z.append(weg);
  if (gleich && plan.parts.filter(q => q.t === p.t).length > ziele.length) {
    const alle = document.createElement("button");
    alle.type = "button";
    alle.textContent = tr("Alle gleichen auswählen");
    alle.onclick = () => waehleAlle(p.t);
    z.append(alle);
  }
  if (ziele.length > 1) {
    const aus = document.createElement("button");
    aus.type = "button";
    aus.textContent = tr("Auswahl aufheben");
    aus.onclick = schliesseInspector;
    z.append(aus);
  }
  inspInhalt.append(z);
}
$("#inspZu").onclick = schliesseInspector;

function entferneAuswahl() {
  const liste = [...new Set(inspAuswahl)].filter(i => plan.parts[i]).sort((a, b) => b - a);
  if (!liste.length) return;
  merkeVerlauf();
  for (const i of liste) plan.parts.splice(i, 1);
  schliesseInspector();
  planGeaendert();
}

function entferneTeil(i) {
  if (i < 0 || !plan.parts[i]) return;
  merkeVerlauf();
  plan.parts.splice(i, 1);
  schliesseInspector();
  planGeaendert();
}

const bauKamera = { yaw: 0.75, pitch: 0.55, dist: 9, ziel: new THREE.Vector3() };
const bodenEbene = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);   // bauebene auf parkplatzhöhe (constant = -y), siehe baueBauansicht
const fahrKamera = { yawOffset: 0, pitch: 0.28, dist: 8, zuletztGezogen: 0, pos: new THREE.Vector3(), blick: new THREE.Vector3(), yaw: 0 };
let fov = 60;

function setzeBauZiel() {
  bauKamera.ziel.copy(ortPos(meinLot)).add(new THREE.Vector3(0, 0.8, 0));
}
setzeBauZiel();

function kameraBau() {
  const k = bauKamera;
  camera.position.set(
    k.ziel.x + Math.sin(k.yaw) * Math.cos(k.pitch) * k.dist,
    k.ziel.y + Math.sin(k.pitch) * k.dist,
    k.ziel.z + Math.cos(k.yaw) * Math.cos(k.pitch) * k.dist
  );
  camera.lookAt(k.ziel);
}

const gedrueckt = new Set();
const touchGedrueckt = new Set();
const angetippt = new Set();
let touchModus = matchMedia("(pointer: coarse)").matches;
let joyX = 0, joyY = 0, joyPointer = null;
let steuerKanaele = { nick: false, roll: false };
const chatInput = $("#chatInput");
const tippt = () => document.activeElement === chatInput;

function setzeTouch(an) {
  touchModus = an;
  document.body.classList.toggle("touch", an);
  if (typeof zeigeSpielModus === "function") zeigeSpielModus();
  zeigeHinweis();
}

function zeigeHinweis() {
  if (!touchModus) { hintEl.hidden = true; return; }
  let text;
  if (modus === "bau") {
    text = touchModus
      ? "Tippen = Werkzeug · Ziehen = drehen · Zwei Finger = zoomen/schieben"
      : "Linksklick setzen · Rechtsklick entfernen · Mittelklick einstellen · Umschalt+Klick mehrere auswählen · Ziehen dreht die Ansicht · WASD schiebt · R/T drehen/kippen";
  } else {
    text = touchModus
      ? (steuerKanaele.nick || steuerKanaele.roll ? "Joystick: Nicken und Rollen · Knöpfe rechts: Gieren und Teile" : "Joystick fahren · Knöpfe rechts für Teile")
      : "WASD fahren · Leertaste bremsen · X aus-/einsteigen oder Klick auf einen Sitz · M Motor · C Kamera · Tab zurück zum Bauen · Rücktaste neu starten";
  }
  hintEl.textContent = tr(text);
  hintEl.hidden = false;
  clearTimeout(zeigeHinweis.t);
  zeigeHinweis.t = setTimeout(() => (hintEl.hidden = true), 9000);
}
setzeTouch(touchModus);

addEventListener("keydown", e => {
  if (tastenWarten) {
    e.preventDefault();
    const fn = tastenWarten;
    tastenWarten = null;
    if (e.key === "Escape") return zeigeInspector();
    if (tasteNorm(e) === "x") {
      meldung("X ist zum Ein- und Aussteigen reserviert");
      return zeigeInspector();
    }
    fn(tasteNorm(e));
    return;
  }
  if (tippt()) {
    if (e.key === "Escape") chatInput.blur();
    return;
  }
  if (document.activeElement && ["INPUT", "SELECT"].includes(document.activeElement.tagName)) {
    if (e.key !== "Escape") return;
    document.activeElement.blur();
  }
  const t = tasteNorm(e);
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "space", "tab", "backspace"].includes(t)) e.preventDefault();
  if (padBestaetigt && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(t)) { padBestaetigt = null; padRuhe = false; }

  if (t === "enter") {
    e.preventDefault();
    document.body.classList.add("chat-offen");
    chatInput.focus();
    return;
  }
  if (t === "tab") return wechsleModus();
  // inventar: taste i (nicht, wenn sie einem fahrzeugteil zugewiesen ist; dann der knopf in der leiste)
  if (t === "i" && !e.repeat && !e.ctrlKey && !e.metaKey && !plan.parts.some(p => p.k?.taste === "i")) { INV_UI.umschalten(); return; }

  if (modus === "bau") {
    if ((e.ctrlKey || e.metaKey) && t === "z") return rueckgaengig();
    if (t === "r") drehen();
    if (t === "t") kippen();
    if (t === "v") schalteKoerper();
    if (t === "escape") schliesseInspector();
    if (t === "delete" && inspAuswahl.length) entferneAuswahl();
    if (t === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      waehleAlle();
    }
  } else {
    if (t === "backspace") return neuStarten();
    if (t === "x" && !e.repeat) return ausEinsteigen();
    if (t === "k" && !e.repeat) return schalteVerbrauch();
    if (t === "m" && !e.repeat && meinFahrzeug) {
      meinFahrzeug.motorAn = !meinFahrzeug.motorAn;
      meldung(meinFahrzeug.motorAn ? "Motor an" : "Motor aus");
    }
    if (t === "c" && !e.repeat) schalteAnsicht();
  }
  if (!e.repeat) angetippt.add(t);
  gedrueckt.add(t);
});
addEventListener("keyup", e => {
  gedrueckt.delete(tasteNorm(e));
  if (e.key === "Shift") gedrueckt.delete("shift");
});
addEventListener("blur", () => { gedrueckt.clear(); mausTasten.clear(); });
chatInput.addEventListener("focus", () => gedrueckt.clear());

window.addEventListener("pointerdown", e => {
  if (!tastenWarten || e.pointerType !== "mouse") return;
  e.preventDefault();
  e.stopPropagation();
  const fn = tastenWarten;
  tastenWarten = null;
  fn("maus" + Math.min(4, e.button));
  const schlucken = ev => { ev.preventDefault(); ev.stopPropagation(); };
  window.addEventListener("click", schlucken, { capture: true, once: true });
  window.addEventListener("auxclick", schlucken, { capture: true, once: true });
  setTimeout(() => { window.removeEventListener("click", schlucken, true); window.removeEventListener("auxclick", schlucken, true); }, 500);
}, true);

const mausBelegt = name => !!plan?.parts.some(p => p.k && Object.values(p.k).includes(name));
const mausTasten = new Map();

const zeiger = new Map();
let pinchAbstand = 0;
let zeigerStart = null;
const maus = new THREE.Vector2(-2, -2);
let mausAufCanvas = false;

canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("pointerdown", e => {
  setzeTouch(e.pointerType !== "mouse");
  canvas.setPointerCapture(e.pointerId);
  zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (zeiger.size === 1) zeigerStart = { x: e.clientX, y: e.clientY, button: e.button, alt: e.altKey, shift: e.shiftKey, gezogen: false, typ: e.pointerType };
  else zeigerStart = null;
  if (e.pointerType === "mouse" && modus === "fahr") {
    const name = "maus" + Math.min(4, e.button);
    if (mausBelegt(name)) { mausTasten.set(e.pointerId, name); gedrueckt.add(name); angetippt.add(name); }
  }
  if (zeiger.size === 2) pinchAbstand = pinchJetzt();
  aktualisiereMaus(e);
});

function pinchJetzt() {
  const [a, b] = [...zeiger.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function aktualisiereMaus(e) {
  const r = canvas.getBoundingClientRect();
  maus.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}

canvas.addEventListener("pointermove", e => {
  mausAufCanvas = true;
  aktualisiereMaus(e);
  const p = zeiger.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;

  if (zeiger.size >= 2) {
    const jetzt = pinchJetzt();
    if (pinchAbstand > 0) zoom(pinchAbstand / jetzt);
    pinchAbstand = jetzt;
    if (modus === "bau") schiebeBau(dx * 0.5, dy * 0.5);
    return;
  }
  if (zeigerStart && !zeigerStart.gezogen &&
      Math.hypot(e.clientX - zeigerStart.x, e.clientY - zeigerStart.y) > 6) {
    zeigerStart.gezogen = true;
  }
  if (!zeigerStart?.gezogen) return;
  if (modus === "fahr" && (mausTasten.has(e.pointerId) || (zielModus() && !(zeigerStart.typ === "mouse" && zeigerStart.button === 2)))) return;

  if (modus === "bau") {
    if (zeigerStart.button === 2 || zeigerStart.shift) schiebeBau(dx, dy);
    else {
      bauKamera.yaw -= dx * 0.006;
      bauKamera.pitch = THREE.MathUtils.clamp(bauKamera.pitch + dy * 0.005, 0.05, 1.45);
    }
  } else {
    if (ansicht === 2) {
      if (ichSitz) egoBlick.yaw -= dx * 0.005;
      else fuss.yaw -= dx * 0.005;
      egoBlick.pitch = THREE.MathUtils.clamp(egoBlick.pitch - dy * 0.004, -1.35, 1.35);
    } else if (istFahrer()) {
      fahrKamera.yawOffset -= dx * 0.006;
      fahrKamera.pitch = THREE.MathUtils.clamp(fahrKamera.pitch + dy * 0.004, -0.1, 1.2);
      fahrKamera.zuletztGezogen = performance.now();
    } else {
      fuss.yaw -= dx * 0.006;
      fuss.pitch = THREE.MathUtils.clamp(fuss.pitch + dy * 0.004, -0.2, 1.3);
    }
  }
});

function zeigerEnde(e) {
  const start = zeigerStart;
  const gebunden = mausTasten.get(e.pointerId);
  if (gebunden) { gedrueckt.delete(gebunden); mausTasten.delete(e.pointerId); }
  zeiger.delete(e.pointerId);
  pinchAbstand = 0;
  if (zeiger.size === 0) zeigerStart = null;
  if (!start || start.gezogen) return;
  if (modus === "fahr") {
    if (!gebunden && e.type !== "pointercancel" && (e.pointerType !== "mouse" || start.button === 0)) {
      aktualisiereMaus(e);
      klickSitz();
    }
    return;
  }
  if (modus !== "bau") return;
  if (e.type === "pointercancel") return;
  aktualisiereMaus(e);
  let w = werkzeug;
  if (e.pointerType === "mouse") {
    if (start.button === 2) w = "entfernen";
    else if (start.button === 1 || start.alt) w = "einstellen";
    else if (start.shift) w = "auswaehlen";
  }
  bauKlick(w);
}
canvas.addEventListener("pointerup", zeigerEnde);
canvas.addEventListener("pointercancel", zeigerEnde);
canvas.addEventListener("pointerleave", () => { mausAufCanvas = false; });

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12);
}, { passive: false });

function zoom(f) {
  if (modus === "bau") bauKamera.dist = THREE.MathUtils.clamp(bauKamera.dist * f, 2.5, 160);
  else if (istFahrer()) fahrKamera.dist = THREE.MathUtils.clamp(fahrKamera.dist * f, 3, 30);
  else fuss.dist = THREE.MathUtils.clamp(fuss.dist * f, 2, 20);
}

function schiebeBau(dx, dy) {
  const k = bauKamera;
  const s = k.dist * 0.0018;
  const rechts = new THREE.Vector3(Math.cos(k.yaw), 0, -Math.sin(k.yaw));
  const vor = new THREE.Vector3(-Math.sin(k.yaw), 0, -Math.cos(k.yaw));
  k.ziel.addScaledVector(rechts, -dx * s).addScaledVector(vor, dy * s);
  begrenzeBauZiel();
}

function begrenzeBauZiel() {
  const lp = ortPos(meinLot), k = ortK(ortHaus(meinLot));
  bauKamera.ziel.x = THREE.MathUtils.clamp(bauKamera.ziel.x, lp.x - 6 * k, lp.x + 6 * k);
  bauKamera.ziel.z = THREE.MathUtils.clamp(bauKamera.ziel.z, lp.z - 6 * k, lp.z + 6 * k);
}

const joystick = $("#joystick"), stick = $("#stick");
joystick.addEventListener("pointerdown", e => {
  e.preventDefault();
  setzeTouch(true);
  joyPointer = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  bewegeJoystick(e);
});
joystick.addEventListener("pointermove", e => { if (e.pointerId === joyPointer) bewegeJoystick(e); });
const joyLos = e => {
  if (e.pointerId !== joyPointer) return;
  joyPointer = null;
  joyX = joyY = 0;
  stick.style.transform = "";
};
joystick.addEventListener("pointerup", joyLos);
joystick.addEventListener("pointercancel", joyLos);
function bewegeJoystick(e) {
  const r = joystick.getBoundingClientRect();
  const max = r.width * 0.32;
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dy) || 1;
  const s = Math.min(1, max / len);
  joyX = THREE.MathUtils.clamp(dx / max, -1, 1);
  joyY = THREE.MathUtils.clamp(dy / max, -1, 1);
  stick.style.transform = `translate(${dx * s}px, ${dy * s}px)`;
}

const raycaster = new THREE.Raycaster();
function trefferBau() {
  raycaster.setFromCamera(maus, camera);
  const objs = bauGrafik ? bauGrafik.groups : [];
  const hits = raycaster.intersectObjects(objs, true);
  for (const h of hits) {
    if (teilVonTreffer(h) === undefined || !h.face) continue;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    const normal = ax >= ay && ax >= az ? [Math.sign(n.x), 0, 0] : ay >= az ? [0, Math.sign(n.y), 0] : [0, 0, Math.sign(n.z)];
    return { teil: teilVonTreffer(h), normal };
  }
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(bodenEbene, p)) {
    const lp = ortPos(meinLot);
    const x = Math.floor((p.x - lp.x) / BAU.ZELLE), z = Math.floor((p.z - lp.z) / BAU.ZELLE);
    if (BAU.inBauraum(x, 0, z)) return { boden: [x, 0, z], normal: [0, 1, 0] };
  }
  return null;
}

function neuesTeil(treffer) {
  let zelle;
  if (treffer.boden) zelle = treffer.boden;
  else {
    const q = plan.parts[treffer.teil];
    zelle = [q.x + treffer.normal[0], q.y + treffer.normal[1], q.z + treffer.normal[2]];
  }
  const def = BAU.TEILE[auswahlTyp];
  const o = def.art === "anbau" ? BAU.orientFromUp(treffer.normal, drehAnbau) : BAU.orientFromYawTilt(drehY, kippX);
  const p = { t: auswahlTyp, x: zelle[0], y: zelle[1], z: zelle[2], o, c: auswahlFarbe, k: BAU.standardEinstellungen(auswahlTyp, plan) };
  if (auswahlTyp.startsWith("rad") || ["auspuff", "duese", "rakete", "servo", "mikro"].includes(auswahlTyp)) {
    if (auswahlFarbe === BAU.FARBEN[0]) p.c = auswahlTyp.startsWith("rad") ? "#3a3e45" : BAU.FARBEN[0];
  }
  return p;
}

function verbunden(p) {
  const probe = { v: 1, parts: [...plan.parts, p] };
  const ana = BAU.analysiere(probe);
  const i = probe.parts.length - 1;
  const b = ana.bodies[ana.bodyOf[i]];
  return b.parts.length > 1 || ana.gelenke.some(g => g.bodyA === ana.bodyOf[i] || g.bodyB === ana.bodyOf[i]);
}

function aktualisiereGeist() {
  if (modus !== "bau" || !mausAufCanvas || werkzeug !== "setzen" || touchModus) {
    if (geist) geist.visible = false;
    return;
  }
  const t = trefferBau();
  if (!t) {
    if (geist) geist.visible = false;
    return;
  }
  const p = neuesTeil(t);
  const fehler = BAU.pruefePlatz(plan, p);
  const farbe = fehler ? "#ff4040" : verbunden(p) ? "#46e07a" : "#ffd43b";
  const key = `${p.t}|${p.o}|${p.c}|${JSON.stringify(p.k)}|${farbe}`;
  if (key !== geistSchluessel) {
    if (geist) scene.remove(geist);
    geist = geistModell(p, farbe);
    scene.add(geist);
    geistSchluessel = key;
  }
  const c = BAU.zellMitte(p);
  const basis = lotBasis(meinLot, BAU.bodenAbstand(plan));
  geist.position.set(basis.x + c[0], basis.y + c[1], basis.z + c[2]);
  geist.visible = true;
}

function dupliziere(treffer) {
  const quellen = inspAuswahl.map(i => plan.parts[i]).filter(Boolean);
  if (!quellen.length) return;
  let zelle;
  if (treffer.boden) zelle = treffer.boden;
  else {
    const q = plan.parts[treffer.teil];
    zelle = [q.x + treffer.normal[0], q.y + treffer.normal[1], q.z + treffer.normal[2]];
  }
  const ref = quellen[0];
  const dx = zelle[0] - ref.x, dy = zelle[1] - ref.y, dz = zelle[2] - ref.z;
  if (!dx && !dy && !dz) return;

  const belegt = new Set(plan.parts.map(p => `${p.x},${p.y},${p.z}`));
  const neu = [];
  for (const q of quellen) {
    const p = { ...JSON.parse(JSON.stringify(q)), x: q.x + dx, y: q.y + dy, z: q.z + dz };
    if (!BAU.inBauraum(p.x, p.y, p.z)) return meldung("Außerhalb des Bauraums");
    if (belegt.has(`${p.x},${p.y},${p.z}`)) return meldung("Platz belegt");
    neu.push(p);
  }
  merkeVerlauf();
  plan.parts.push(...neu);
  planGeaendert();
  meldung(`${neu.length} ${tr("Teile")} ${tr("dupliziert (Rückgängig mit Strg+Z)")}`);
}

function bauKlick(w) {
  const t = trefferBau();
  if (!t) return;
  if (w === "entfernen") {
    if (t.teil !== undefined) entferneTeil(t.teil);
    return;
  }
  if (w === "einstellen") {
    if (t.teil !== undefined) oeffneInspector(t.teil);
    return;
  }
  if (w === "auswaehlen") {
    if (t.teil !== undefined) oeffneInspector(t.teil, true);
    return;
  }
  if (w === "duplizieren") {
    if (!inspAuswahl.length) {
      if (t.teil !== undefined) {
        oeffneInspector(t.teil);
        meldung("Ausgewählt: jetzt auf die Zielstelle klicken (mehrere Teile mit Umschalt+Klick)");
      }
      return;
    }
    dupliziere(t);
    return;
  }
  const p = neuesTeil(t);
  const fehler = BAU.pruefePlatz(plan, p);
  if (fehler) return meldung(fehler);
  merkeVerlauf();
  plan.parts.push(p);
  if (!verbunden(p)) meldung("Nicht verbunden: das Teil liegt lose herum");
  planGeaendert();
  if (["nebel", "duese", "rakete", "servo", "mikro", "bruch", "fallschirm", "kamera", "steuerflaeche", "scheinwerfer", "propeller", "tank", "explosive",
    "unterboden", "strahler", "blinker", "blaulicht", "laser", "konfetti", "rauchwerfer", "fackel", "stoersender", "schild", "feuerloescher"].includes(p.t)) {
    oeffneInspector(plan.parts.length - 1);
  }
}


let ichSitz = null;
let ichSitzObj = null;
let fussRb = null, fussCol = null;
const fuss = { yaw: 0, pitch: 0.3, dist: 5 };
const FUSS_H = 0.5;
const idVon = o => (o === "ich" ? meineId || "ich" : o);
const istFahrer = () => !!(ichSitz && ichSitz.o === "ich" && meinFahrzeug);

function besitzerGrafik(o) {
  if (o === "ich" || (meineId && o === meineId)) return meineGrafik;
  const r = andere.get(String(o));
  return r && r.m === "fahr" ? r.grafik : null;
}

function sitzObjekt(ref) {
  const g = ref && besitzerGrafik(ref.o);
  return g ? g.sitze.find(s => s.index === ref.i) || null : null;
}

function sitzBelegt(o, i) {
  const id = idVon(o);
  if (ichSitz && idVon(ichSitz.o) === id && ichSitz.i === i) return true;
  for (const r of andere.values()) {
    if (r.m === "fahr" && r.sit && r.sit[0] === id && r.sit[1] === i) return true;
  }
  return false;
}

const tmpSitzPos = new THREE.Vector3();
function naechsterSitz() {
  const p = meineFigur.getWorldPosition(new THREE.Vector3());
  p.y += 0.5;
  let best = null, bd = 3.2;
  const pruefe = (o, g) => {
    if (!g) return;
    for (const s of g.sitze) {
      if (sitzBelegt(o, s.index)) continue;
      const d = s.obj.getWorldPosition(tmpSitzPos).distanceTo(p);
      if (d < bd) { bd = d; best = { o, i: s.index }; }
    }
  };
  pruefe("ich", meineGrafik);
  for (const r of andere.values()) if (r.m === "fahr") pruefe(r.id, r.grafik);
  return best;
}

function figurAnSitz(figur, obj) {
  obj.add(figur);
  figur.position.set(0, -0.3, 0.02);
  figur.quaternion.identity();
  figur.scale.setScalar(0.62 / obj.scale.x);
  setzeSitzen(figur, true);
}

function figurFrei(figur) {
  if (figur.parent !== scene) {
    scene.attach(figur);
    figur.rotation.set(0, figur.rotation.y, 0);
    figur.scale.setScalar(0.62);
  }
  setzeSitzen(figur, false);
}

function gehAnim(figur, tempo) {
  const u = figur.userData;
  u.zyklus = (u.zyklus || 0) + tempo * 0.045;
  const s = tempo > 0.4 ? Math.sin(u.zyklus) * 0.55 : 0;
  u.leftLeg.rotation.x = s;
  u.rightLeg.rotation.x = -s;
  u.leftArm.rotation.x = -s * 0.6;
  u.rightArm.rotation.x = s * 0.6;
}

function entferneFuss() {
  if (!fussRb) return;
  PH.ignoriere.delete(fussCol.handle);
  world.removeRigidBody(fussRb);
  fussRb = fussCol = null;
  PH.avatarZiel.handle = null;
}

function erzeugeFuss(pos, vel) {
  entferneFuss();
  fussRb = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y + FUSS_H, pos.z)
      .setLinvel(vel.x, vel.y, vel.z)
      .lockRotations().setCanSleep(false).setCcdEnabled(true)
  );
  // reibung 0 mit "min": rapier mittelt sonst die reibung beider körper (wand 0.9 -> 0.45) und die figur bleibt an wänden hängen
  // statt entlangzurutschen. restitution 0: kein abprallen von wänden
  fussCol = world.createCollider(RAPIER.ColliderDesc.capsule(0.25, 0.25).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(0).setMass(70), fussRb);
  PH.ignoriere.add(fussCol.handle);
  PH.avatarZiel.handle = fussCol.handle;
  PH.avatarZiel.bei = s => { if (meinFahrzeug && s.von !== meinFahrzeug) PH.avatarGetroffen(meinFahrzeug); };
}

function setzeIchSitz(ref) {
  const s = sitzObjekt(ref);
  if (!s) return false;
  ichSitz = ref;
  ichSitzObj = s.obj;
  entferneFuss();
  figurAnSitz(meineFigur, s.obj);
  return true;
}

function steigeAus() {
  const s = ichSitz && sitzObjekt(ichSitz);
  const pos = meineFigur.getWorldPosition(new THREE.Vector3());
  const vel = { x: 0, y: 0, z: 0 };
  if (s) {
    s.obj.getWorldPosition(pos);
    const seite = new THREE.Vector3(1, 0, 0).transformDirection(s.obj.matrixWorld);
    seite.y = 0;
    if (seite.lengthSq() < 0.01) seite.set(1, 0, 0);
    seite.normalize();
    pos.addScaledVector(seite, 0.8);
    pos.y = Math.max(pos.y - 0.2, 0.05);
    if (ichSitz.o === "ich" && meinFahrzeug) {
      const b = PH.sitzKoerper(meinFahrzeug);
      if (b) { const v = b.rb.linvel(); vel.x = v.x; vel.z = v.z; }
      fuss.yaw = fahrKamera.yaw + fahrKamera.yawOffset;
    }
  }
  ichSitz = null;
  ichSitzObj = null;
  figurFrei(meineFigur);
  erzeugeFuss(pos, vel);
  meineFigur.position.copy(pos);
}

function klickSitz() {
  raycaster.setFromCamera(maus, camera);
  let best = null;
  const pruefe = (o, g) => {
    if (!g) return;
    for (const h of raycaster.intersectObjects(g.groups, true)) {
      if (teilVonTreffer(h) === undefined) continue;
      if (!best || h.distance < best.d) best = { d: h.distance, o, g, teil: teilVonTreffer(h) };
      break;
    }
  };
  pruefe("ich", meineGrafik);
  for (const r of andere.values()) if (r.m === "fahr") pruefe(r.id, r.grafik);
  if (!best) return;
  if (!best.g.sitze.some(s => s.index === best.teil)) {
    if (ichSitz) return;
    const ich = meineFigur.getWorldPosition(new THREE.Vector3());
    let wahl = null, bestD = 10;
    for (const s of best.g.sitze) {
      if (sitzBelegt(best.o, s.index)) continue;
      const d = s.obj.getWorldPosition(tmpSitzPos).distanceTo(ich);
      if (d < bestD) { bestD = d; wahl = s; }
    }
    if (!wahl) return;
    best.teil = wahl.index;
  }
  if (ichSitz && idVon(ichSitz.o) === idVon(best.o) && ichSitz.i === best.teil) return;
  if (sitzBelegt(best.o, best.teil)) return meldung("Der Sitz ist besetzt");
  if (!autoOffen(best.o)) return meldung("Abgeschlossen – du brauchst den Autoschlüssel");
  setzeIchSitz({ o: best.o, i: best.teil });
  meldung(best.o === "ich" ? "Eingestiegen" : "Du fährst mit");
}

function ausEinsteigen() {
  if (modus !== "fahr") return;
  if (ichSitz) {
    steigeAus();
    return meldung("Ausgestiegen – X zum Einsteigen");
  }
  const s = naechsterSitz();
  if (!s) return meldung("Kein freier Sitz in der Nähe");
  if (!autoOffen(s.o)) return meldung("Abgeschlossen – du brauchst den Autoschlüssel");
  setzeIchSitz(s);
  meldung(s.o === "ich" ? "Eingestiegen" : "Du fährst mit");
}

function pflegeSitz() {
  if (!ichSitz) return;
  const s = sitzObjekt(ichSitz);
  if (!s) return steigeAus();
  if (s.obj !== ichSitzObj) {
    ichSitzObj = s.obj;
    figurAnSitz(meineFigur, s.obj);
  }
}

let fussKlettert = false, fussSprungSperre = 0;
function leiterNah(t) {
  const gs = [meineGrafik];
  for (const r of andere.values()) if (r.m === "fahr") gs.push(r.grafik);
  for (const g of gs) {
    if (!g) continue;
    for (const obj of g.leitern) {
      obj.updateWorldMatrix(true, false);
      const m = obj.matrixWorld.elements;
      if (Math.abs(new THREE.Vector3(m[4], m[5], m[6]).normalize().y) < 0.7) continue;
      const c = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
      if (Math.hypot(c.x - t.x, c.z - t.z) < 0.55 && Math.abs(c.y - t.y) < 0.5) return true;
    }
  }
  return hausLeiterNah(t) !== null;
}
// leitern in häusern (aus dem haus-editor): eine zone von unterkante bis oberkante. rückgabe die zone oder null
function hausLeiterNah(t) {
  for (const l of HAEUSER.alleLeitern()) {
    if (Math.hypot(l.x - t.x, l.z - t.z) < 0.55 && t.y - FUSS_H > l.y0 - 0.4 && t.y - FUSS_H < l.y1 + 0.1) return l;
  }
  return null;
}

function steuereFuss() {
  if (!fussRb) return;
  const k = new Set([...gedrueckt, ...touchGedrueckt]);
  const tipp = tippt();
  const vor = tipp ? 0 : ((k.has("w") || k.has("arrowup")) ? 1 : 0) - ((k.has("s") || k.has("arrowdown")) ? 1 : 0) - joyY;
  const seite = tipp ? 0 : ((k.has("d") || k.has("arrowright")) ? 1 : 0) - ((k.has("a") || k.has("arrowleft")) ? 1 : 0) + joyX;
  const len = Math.hypot(vor, seite);
  let mx = 0, mz = 0;
  if (len > 0.08) {
    const nf = vor / Math.max(len, 1), ns = seite / Math.max(len, 1);
    mx = -Math.sin(fuss.yaw) * nf + Math.cos(fuss.yaw) * ns;
    mz = -Math.cos(fuss.yaw) * nf - Math.sin(fuss.yaw) * ns;
  }
  const tempo = (k.has("shift") && !touchModus ? 7 : 4.2) * Math.min(1, len);
  const v = fussRb.linvel();
  let vy = v.y;
  if (angetippt.has("space") && !tipp && Math.abs(v.y) < 0.3) vy = 5.5;
  const t0 = fussRb.translation();
  const nahLeiter = !tipp && leiterNah(t0);
  const hoch = (k.has("w") || k.has("arrowup")) ? 1 : 0;
  const runter = (k.has("s") || k.has("arrowdown")) ? 1 : 0;
  if (nahLeiter && (hoch || runter) && performance.now() > fussSprungSperre) fussKlettert = true;
  // leiter im haus: oben angekommen steigt man automatisch ab (ein stück nach vorn, auf den boden darüber)
  if (fussKlettert) {
    const hl = hausLeiterNah(t0);
    if (hl && t0.y - FUSS_H >= hl.y1 - 0.05) {
      fussRb.setTranslation({ x: hl.x + hl.ex * 0.7, y: hl.y1 + FUSS_H + 0.12, z: hl.z + hl.ez * 0.7 }, true);
      fussRb.setLinvel({ x: hl.ex * 1.5, y: 0, z: hl.ez * 1.5 }, true);
      fussRb.setGravityScale(PH.gravFaktor(hl.y1), true);
      fussKlettert = false;
      fussSprungSperre = performance.now() + 600;
      return;
    }
  }
  if (!nahLeiter || angetippt.has("space")) {
    if (fussKlettert && angetippt.has("space")) {
      vy = 5;
      fussSprungSperre = performance.now() + 500;
    }
    fussKlettert = false;
  }
  if (fussKlettert) {
    fussRb.setGravityScale(0, true);
    fussRb.setLinvel({ x: 0, y: (hoch - runter) * 2.6, z: 0 }, true);
    return;
  }
  fussRb.setGravityScale(PH.gravFaktor(t0.y), true);
  fussRb.setLinvel({ x: mx * tempo, y: vy, z: mz * tempo }, true);
}

function aktualisiereFuss(dt) {
  if (!fussRb) return;
  const t = fussRb.translation(), v = fussRb.linvel();
  meineFigur.position.set(t.x, t.y - FUSS_H, t.z);
  const sp = Math.hypot(v.x, v.z);
  if (sp > 0.4) {
    let d = Math.atan2(-v.x, -v.z) - meineFigur.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    meineFigur.rotation.y += d * Math.min(1, dt * 12);
  }
  gehAnim(meineFigur, sp);
  if (t.y < -30) {
    entferneFuss();
    erzeugeFuss(figurStand(meinLot), { x: 0, y: 0, z: 0 });
  }
}

function setzeFov(f) {
  if (camera.fov === f) return;
  camera.fov = f;
  camera.updateProjectionMatrix();
  for (const p of [rauch, feuer]) p.setzeSkala(innerHeight * renderer.getPixelRatio(), f);
}

let camTextAlt = "";
function kameraVonTeil() {
  const p = aktiveKamera !== null ? plan.parts[aktiveKamera] : null;
  const e = p && p.t === "kamera" && meineGrafik ? meineGrafik.emit.get(aktiveKamera) : null;
  let text = "";
  if (e) {
    e.obj.updateWorldMatrix(true, false);
    const pos = e.obj.localToWorld(e.punkt.clone());
    const dir = new THREE.Vector3(0, 1, 0).transformDirection(e.obj.matrixWorld);
    camera.position.copy(pos);
    if (Math.abs(dir.y) > 0.95) camera.up.copy(new THREE.Vector3(0, 0, -1).transformDirection(e.obj.matrixWorld));
    camera.lookAt(pos.clone().add(dir));
    camera.up.set(0, 1, 0);
    setzeFov(p.k.fov ?? 70);
    const nr = plan.parts.slice(0, aktiveKamera).filter(q => q.t === "kamera").length + 1;
    text = `${tr("KAMERA")} ${nr} · ${tastenText(p.k.taste)} = ${tr("zurück")}`;
  } else {
    aktiveKamera = null;
    setzeFov(fov);
  }
  if (text !== camTextAlt) {
    camTextAlt = text;
    $("#camOverlay").hidden = !text;
    $("#camText").textContent = text;
  }
}

let ansicht = 0;
let egoFahrer = false;
const egoBlick = { yaw: 0, pitch: 0 };
const AUGEN = new THREE.Vector3(0, 1.5, -0.1);
const ANSICHTEN = ["Ansicht: Verfolger", "Ansicht: Verfolger nah", "Ansicht: Ich-Perspektive"];
function schalteAnsicht() {
  ansicht = (ansicht + 1) % 3;
  egoBlick.yaw = 0;
  egoBlick.pitch = 0;
  meldung(ANSICHTEN[ansicht]);
}

const egoQ0 = new THREE.Quaternion(), egoDrehung = new THREE.Quaternion(), egoEuler = new THREE.Euler(0, 0, 0, "YXZ");
function kameraEgoSitzend() {
  const sitz = ichSitz ? sitzObjekt(ichSitz) : null;
  if (!sitz) return false;
  sitz.obj.updateWorldMatrix(true, false);
  sitz.obj.getWorldQuaternion(egoQ0);
  meineFigur.updateWorldMatrix(true, false);
  const augen = meineFigur.localToWorld(AUGEN.clone());
  egoDrehung.setFromEuler(egoEuler.set(egoBlick.pitch, egoBlick.yaw, 0));
  camera.position.copy(augen);
  camera.quaternion.copy(egoQ0).multiply(egoDrehung);
  fahrKamera.blick.copy(augen);
  fahrKamera.pos.copy(augen);
  return true;
}
function kameraEgoFahrzeug() {
  kameraEgoSitzend();
}

function kameraEgoFuss() {
  if (kameraEgoSitzend()) return;
  meineFigur.updateWorldMatrix(true, false);
  const augen = meineFigur.localToWorld(AUGEN.clone());
  camera.position.copy(augen);
  camera.rotation.set(egoBlick.pitch, fuss.yaw, 0, "YXZ");
  fahrKamera.blick.copy(augen);
  fahrKamera.pos.copy(augen);
}

function kameraFuss() {
  if (ansicht === 2) return kameraEgoFuss();
  const ziel = meineFigur.getWorldPosition(new THREE.Vector3());
  ziel.y += 0.7;
  fahrKamera.blick.copy(ziel);
  const d = fuss.dist, p = fuss.pitch;
  camera.position.set(
    ziel.x + Math.sin(fuss.yaw) * Math.cos(p) * d,
    Math.max(0.3, ziel.y + Math.sin(p) * d),
    ziel.z + Math.cos(fuss.yaw) * Math.cos(p) * d
  );
  camera.position.y = Math.max(camera.position.y, bodenHoehe(camera.position.x, camera.position.z) + 0.5);
  camera.lookAt(ziel);
  fahrKamera.pos.copy(camera.position);
}

let aktiveKamera = null;

let verbrauchAn = true;
try { verbrauchAn = localStorage.getItem("bastelkarre-verbrauch") !== "0"; } catch {}
function schalteVerbrauch() {
  verbrauchAn = !verbrauchAn;
  try { localStorage.setItem("bastelkarre-verbrauch", verbrauchAn ? "1" : "0"); } catch {}
  if (meinFahrzeug) meinFahrzeug.verbrauch = verbrauchAn;
  meldung(verbrauchAn ? "Treibstoffverbrauch an" : "Treibstoffverbrauch aus (unbegrenzt)");
}

function pflegeTrennungen(veh, grafik) {
  if (!veh || !grafik) return;
  grafik.sprengOrt = veh.sprengPos;
  while (veh.neuGetrennt.length) {
    const g = trenneGrafik(grafik, veh.neuGetrennt.shift());
    grafik.groups.push(g);
    scene.add(g);
  }
}

let serverVerbot = new URLSearchParams(location.search).has("lokal");
let serverAbbild = { puffer: [], spN: 0, angewendet: new Set(), verlauf: [], zug: null, versatz: { x: 0, y: 0, z: 0 } };

function serverZug() {
  const a = serverAbbild, z = a.zug;
  if (!z || !meinFahrzeug) return;
  const f = 0.025;
  const dx = z.x * f, dy = z.y * f, dz = z.z * f;
  for (const k of meinFahrzeug.bodies) {
    const t = k.rb.translation();
    k.rb.setTranslation({ x: t.x + dx, y: t.y + dy, z: t.z + dz }, true);
  }
  z.x -= dx; z.y -= dy; z.z -= dz;
  if (Math.abs(z.x) + Math.abs(z.y) + Math.abs(z.z) < 0.01) a.zug = null;
}
function serverPhysikGewollt() {
  if (serverVerbot || socket?.readyState !== WebSocket.OPEN) return false;
  if (!fightAktiv() || fightKarte >= FK.EIGENER_PLATZ) return false;
  return [...andere.values()].some(r => !r.npc);
}

function erzeugeEigenes() {
  if (meinFahrzeug) PH.entferneFahrzeug(world, meinFahrzeug);
  entferneGrafik(meineGrafik);
  const lift = BAU.bodenAbstand(plan, BAU.RAD_TIEFE) + 0.03;
  const start = startBasis(meinLot, lift);
  const serverModus = serverPhysikGewollt();
  meinFahrzeug = PH.erzeugeFahrzeug(RAPIER, world, plan, { basis: start.basis.toArray(), drehung: start.dreh, verbrauch: verbrauchAn, kampf: fightAktiv(), spielerId: meineId });
  KR.mutatorAnwenden(meinFahrzeug);
  meinFahrzeug.serverModus = serverModus;
  if (meinFahrzeug.kampf) meinFahrzeug.schutz = PH.SCHUTZ_ZEIT;
  serverAbbild = { puffer: [], spN: 0, angewendet: new Set(), start: performance.now(), verlauf: [], zug: null, versatz: { x: 0, y: 0, z: 0 } };
  if (serverModus) {
    const d = start.dreh || { x: 0, y: 0, z: 0, w: 1 };
    meinFahrzeug.serverStart = { basis: start.basis.toArray().map(v => Math.round(v * 1000) / 1000), dreh: [d.x, d.y, d.z, d.w] };
  }
  meineGrafik = fahrzeugGrafik(plan, { ana: meinFahrzeug.ana });
  for (const g of meineGrafik.groups) scene.add(g);
  if (ichSitz && ichSitz.o === "ich") {
    const s = meineGrafik.sitze.find(x => x.index === ichSitz.i) || meineGrafik.sitze[0];
    if (s) setzeIchSitz({ o: "ich", i: s.index });
    else steigeAus();
  }
  spawnZaehler++;
  baueTastenListe();
}

// tod im kampf: kurz anzeigen, dann automatisch neu starten
let todTimer = null;
function pflegeTod(dt) {
  if (modus !== "fahr" || !meinFahrzeug?.tot) { todTimer = null; return; }
  if (todTimer === null) {
    todTimer = 3;
    meldung(meinFahrzeug.tot === "treffer" ? tr("Dreimal getroffen") : meinFahrzeug.tot === "arena" ? tr("Arena verlassen") : tr("Fahrzeug zerrissen"));
    if (fightAktiv() && socket?.readyState === WebSocket.OPEN) {
      const von = Date.now() - meinFahrzeug.taeterZeit < 15000 ? meinFahrzeug.letzterTaeter : null;
      socket.send(JSON.stringify({ type: "kill", von }));
    }
  }
  todTimer -= dt;
  if (todTimer <= 0) { todTimer = null; neuStarten(); }
}

function neuStarten() {
  if (modus !== "fahr") return;
  erzeugeEigenes();
  meldung("Neu gestartet");
}

function wechsleModus() {
  if (modus === "bau") {
    if (!plan.parts.length) return meldung("Erst etwas bauen!");
    modus = "fahr";
    schliesseInspector();
    if (geist) geist.visible = false;
    for (const g of bauGrafik.groups) g.visible = false;
    ichSitz = null;
    entferneFuss();
    erzeugeEigenes();
    fahrKamera.yawOffset = 0;
    fahrKamera.yaw = 0;
    fuss.yaw = 0;
    const erster = meineGrafik.sitze[0];
    if (erster && autoOffen("ich")) setzeIchSitz({ o: "ich", i: erster.index });
    else if (erster) {
      steigeAus();
      meldung("Kein Autoschlüssel im Inventar: du stehst neben dem abgeschlossenen Fahrzeug", 5000);
    } else {
      steigeAus();
      meldung("Kein Sitz eingebaut: du gehst zu Fuß");
    }
  } else {
    modus = "bau";
    serverVerbot = false;
    npcs?.stop();
    aktiveKamera = null;
    setzeFov(fov);
    $("#camOverlay").hidden = true;
    camTextAlt = "";
    ichSitz = null;
    ichSitzObj = null;
    entferneFuss();
    if (meinFahrzeug) PH.entferneFahrzeug(world, meinFahrzeug);
    meinFahrzeug = null;
    entferneGrafik(meineGrafik);
    meineGrafik = null;
    for (const g of bauGrafik.groups) g.visible = true;
    setzeFigurInSitz(meineFigur, null, figurStand(meinLot));
  }
  document.body.classList.toggle("bau", modus === "bau");
  document.body.classList.toggle("fahr", modus === "fahr");
  $("#baupanel").hidden = modus !== "bau";
  $("#fahrpanel").hidden = modus !== "fahr";
  $("#tacho").hidden = modus !== "fahr";
  $("#btnNeu").hidden = modus !== "fahr";
  $("#btnAus").hidden = modus !== "fahr";
  $("#btnAnsicht").hidden = modus !== "fahr";
  setBtn("#btnModus", modus === "bau" ? "▶" : "◀", tr(modus === "bau" ? "Losfahren" : "Zum Parkplatz"));
  $("#btnModus").blur();
  zeigeHinweis();
  aktualisiereFight();
  sendePose(true);
}
$("#btnModus").onclick = wechsleModus;

function fightAktiv() {
  return spielModus === "fight" && BAU.fightVerfuegbar(touchModus);
}
function zeigeSpielModus() {
  const fight = fightAktiv();
  $("#modusName").textContent = fight ? `Fight · ${tr(alleKarten()[fightKarte].name) || "?"}` : "Test";
  for (const k of document.querySelectorAll(".modusKachel")) k.classList.toggle("aktiv", k.dataset.modus === (fight ? "fight" : "test"));
  const liste = $("#kartenListe");
  liste.replaceChildren();
  const knopf = (text, klick, klasse = "") => {
    const k = document.createElement("button");
    k.type = "button";
    k.textContent = text;
    if (klasse) k.className = klasse;
    k.onclick = klick;
    return k;
  };
  alleKarten().forEach((k, i) => {
    if (i === FK.EIGENER_PLATZ && !k.dokument()) return;
    const b = knopf(i === FK.EIGENER_PLATZ ? `★ ${k.name}` : tr(k.name), () => { fightKarte = i; merkeKarte(); setzeSpielModus("fight"); });
    b.dataset.i = i;
    b.classList.toggle("aktiv", i === fightKarte);
    liste.append(b);
  });
  liste.append(
    knopf(tr("Karten laden / teilen"), () => { $("#modusSeite").hidden = true; oeffneKarten(); }, "aktion"),
    knopf(tr("Karteneditor"), () => oeffneKartenEditor(null), "aktion"),
    knopf("✎ " + tr("Gewählte Karte bearbeiten"), () => {
      const k = alleKarten()[fightKarte];
      const dok = k?.dokument?.();
      if (dok) oeffneKartenEditor(JSON.parse(JSON.stringify(dok)), k.offiziell ? { art: "offiziell", slot: k.id } : eigeneId ? { art: "lokal", id: eigeneId } : { art: "neu" });
    }, "aktion")
  );
}

function zeigeTonSchalter() {
  $("#btnTon").textContent = TON.tonAn() ? tr("Ton") : tr("Stumm");
}
$("#btnTon").onclick = () => { TON.starte(); TON.setzeTon(!TON.tonAn()); zeigeTonSchalter(); $("#btnTon").blur(); };
zeigeTonSchalter();

const bahnMax = 130;
const bahnLinie = new THREE.Line(
  new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(bahnMax * 3), 3)),
  new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 2.5, gapSize: 1.6, transparent: true, opacity: 0.75, depthTest: false })
);
bahnLinie.renderOrder = 20;
bahnLinie.frustumCulled = false;
bahnLinie.visible = false;
scene.add(bahnLinie);
const landeRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 32), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
landeRing.renderOrder = 21;
landeRing.visible = false;
scene.add(landeRing);
function aktualisiereZiel() {
  const el = $("#ziel");
  let sicht = false;
  const veh = meinFahrzeug;
  const v = modus === "fahr" && veh ? PH.vorhersage(world, veh) : null;
  bahnLinie.visible = landeRing.visible = !!v;
  if (v) {
    const pos = bahnLinie.geometry.attributes.position;
    const n = Math.min(bahnMax, v.punkte.length);
    for (let i = 0; i < n; i++) pos.setXYZ(i, v.punkte[i][0], v.punkte[i][1], v.punkte[i][2]);
    pos.needsUpdate = true;
    bahnLinie.geometry.setDrawRange(1, n - 1);
    bahnLinie.computeLineDistances();
    const [x, y, z] = v.ende;
    const dist = Math.hypot(x - v.punkte[0][0], y - v.punkte[0][1], z - v.punkte[0][2]);
    landeRing.position.set(x, y + 0.15, z);
    landeRing.rotation.set(-Math.PI / 2, 0, 0);
    landeRing.scale.setScalar(Math.max(1, dist / 60));
    landeRing.material.color.set(v.treffer ? 0xffd36b : 0x9aa0a6);
    camera.updateMatrixWorld();
    const proj = tmpD.set(x, y, z).project(camera);
    if (proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1) {
      sicht = true;
      el.style.left = `${(proj.x * 0.5 + 0.5) * game.clientWidth}px`;
      el.style.top = `${(-proj.y * 0.5 + 0.5) * game.clientHeight}px`;
      el.querySelector("span").textContent = `${Math.round(dist)} m · ${v.zeit.toFixed(1)} s`;
      const bereit = plan.parts.some((p, i) => (p.t === "verschluss" || p.t === "schnellfeuer") && !veh.zerstoert.has(i) && (veh.nachladen.get(i) ?? 0) <= 0);
      el.classList.toggle("lade", !bereit);
    }
  }
  el.hidden = !sicht;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function sichereKarte(ki) {
  const k = alleKarten()[ki];
  const f = k.erzeuge();
  if (!f) return null;
  if (gebauteKarten.includes(f)) return f;
  const mein = { obj: [], kol: [] };
  sammler = mein;
  try {
    baueGelaende({
      d: f.daten, RAPIER, scene: { add: (...o) => { scene.add(...o); mein.obj.push(...o); } }, box: statischeBox,
      world: { createCollider: d => { const c = world.createCollider(d); mein.kol.push(c); return c; } }
    });
  } finally {
    sammler = null;
  }
  f.sammler = mein;
  k.gebaut = f;
  gebauteKarten.push(f);
  f.visuell = f.basen.map(([x, z]) => {
    const g = new THREE.Group();
    g.position.set(x, f.hoehe(x, z), z);
    const stoff = () => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(FK.BASIS_RADIUS - 0.8, FK.BASIS_RADIUS, 64), stoff());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.35;
    const scheibe = new THREE.Mesh(new THREE.CircleGeometry(FK.BASIS_RADIUS - 1, 48), stoff());
    scheibe.rotation.x = -Math.PI / 2;
    scheibe.position.y = 0.3;
    scheibe.scale.setScalar(0.001);
    scheibe.material.opacity = 0.35;
    const strahl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 70, 12, 1, true), stoff());
    strahl.position.y = 35;
    strahl.material.opacity = 0.3;
    g.add(ring, scheibe, strahl);
    g.visible = false;
    scene.add(g);
    return { g, ring, scheibe, strahl };
  });
  return f;
}

function baueKarteAb(k) {
  const f = k.gebaut;
  if (!f) return;
  k.gebaut = null;
  const i = gebauteKarten.indexOf(f);
  if (i >= 0) gebauteKarten.splice(i, 1);
  for (const o of f.sammler?.obj || []) {
    scene.remove(o);
    o.geometry?.dispose?.();
    for (const m of [].concat(o.material || [])) { m.map?.dispose?.(); m.dispose?.(); }
    if (o.isInstancedMesh) o.dispose();
  }
  for (const c of f.sammler?.kol || []) { try { world.removeCollider(c, true); } catch {} }
  for (const v of f.visuell || []) scene.remove(v.g);
}

function waehleEigene(dok, id = null, name = "") {
  baueKarteAb(FK.EIGENE);
  if (!FK.EIGENE.setze(dok, name)) return false;
  eigeneId = id;
  fightKarte = FK.EIGENER_PLATZ;
  merkeKarte();
  zeigeSpielModus();
  return true;
}

async function ladeOffizielleKarten() {
  try {
    const d = await Konto.anfrage("GET", "/maps/official");
    for (const m of d.maps || []) {
      const k = FK.KARTEN.find(x => x.id === m.slot);
      if (!k) continue;
      baueKarteAb(k);
      k.ueberschreibe(m.data);
    }
    zeigeSpielModus();
  } catch {}
}

let kartenEditor = null;
function oeffneKartenEditor(dok, herkunft = { art: "neu" }) {
  if (modus === "fahr") wechsleModus();
  $("#modusSeite").hidden = true;
  kartenEditor ||= KE.erzeugeKartenEditor({
    renderer,
    schnittstelle: {
      zu: () => {},
      istAdmin: () => Konto.istAdmin(),
      test: k => {
        kartenEditor.schliesse();
        waehleEigene(k, null, k.name);
        setzeSpielModus("fight");
        if (modus === "bau") wechsleModus();
      },
      offiziellSpeichern: async (slot, k) => {
        const ziel = FK.KARTEN.find(x => x.id === slot);
        if (!ziel) throw new Error("unbekannte karte: " + slot);
        await Konto.anfrage("PUT", `/admin/maps/official/${slot}`, { data: JSON.stringify(k) });
        baueKarteAb(ziel);
        ziel.ueberschreibe(k);
        zeigeSpielModus();
      }
    }
  });
  kartenEditor.oeffne(dok || FK.neueKarte(), herkunft);
}

function startBasis(lot, lift) {
  if (!fightAktiv() && startOrt === "hafen" && WELTDATEN) {
    const h = hafenStart(WELTDATEN, lot);
    return { basis: new THREE.Vector3(h.x, WASSER_Y + 0.4 + lift, h.z), dreh: { x: 0, y: 1, z: 0, w: 0 } };
  }
  // am haus zeigt die front zur straße (+z), nicht zur hauswand 8 m davor; auf dem großen parkplatz bleibt es wie bisher
  if (!fightAktiv()) return { basis: lotBasis(lot, lift), dreh: lot === meinLot && ortHaus(lot) ? { x: 0, y: 1, z: 0, w: 0 } : undefined };
  const f = sichereKarte(fightKarte) || sichereKarte(0);
  const n = f.spawns.length;
  const sp = f.spawns[((lot % n) + n) % n];
  const w = Math.atan2(-(f.mitte[0] - sp.x), -(f.mitte[1] - sp.z));
  return {
    basis: new THREE.Vector3(sp.x, Math.max(f.hoehe(sp.x, sp.z), meer ? WASSER_Y + 0.4 : -1e9) + lift, sp.z),
    dreh: { x: 0, y: Math.sin(w / 2), z: 0, w: Math.cos(w / 2) }
  };
}

const basenNamen = ["A", "B", "C", "D"];
function fightSpieler(id) {
  if (id === meineId) return { name: spielerName, color: spielerFarbe };
  const r = andere.get(id);
  return r ? { name: r.name, color: r.color } : { name: "?", color: "#ffffff" };
}

const BASIS_BLAU = "#3b8cff", BASIS_ROT = "#ff4a4a", BASIS_FREI = "#ffffff";
function basisFarbe(id) {
  if (id == null) return BASIS_FREI;
  return id === meineId ? BASIS_BLAU : BASIS_ROT;
}

function aktualisiereFight() {
  const an = modus === "fahr" && fightAktiv();
  const hud = $("#fightHud");
  hud.hidden = !an;
  for (const f of gebauteKarten) for (const v of f.visuell || []) v.g.visible = false;
  if (!an) return;
  const f = sichereKarte(fightKarte);
  if (!f) return;
  const maxLeben = meinFahrzeug?.leben ?? PH.AVATAR_LEBEN;
  const leben = meinFahrzeug ? Math.max(0, maxLeben - meinFahrzeug.avatarTreffer) : maxLeben;
  let html = `<span class="leben" title="${tr("Leben")}">${"♥".repeat(leben)}<s>${"♥".repeat(maxLeben - leben)}</s></span>`;
  // arena: keine zonen; koenig: nur die aktive zone
  const ka = KR.runde.ka[fightKarte] ?? (FK.KARTEN_MODI[fightKarte] === "arena" ? -2 : -1);
  f.basen.forEach((pos, nr) => {
    if (ka === -2 || (ka >= 0 && ka !== nr)) return;
    const [o, p, c, pause] = fightZustand.fb[fightKarte]?.[nr] || [null, 0, null, 0];
    const b = { nr };
    const v = f.visuell[nr];
    v.g.visible = true;
    const farbe = pause ? "#ff9a1f" : basisFarbe(o);
    v.ring.material.color.set(farbe);
    v.strahl.material.color.set(farbe);
    v.scheibe.material.color.set(basisFarbe(c));
    v.scheibe.scale.setScalar(Math.max(0.001, p));
    html += `<span class="basis" style="--f:${farbe}"><b>${basenNamen[b.nr] || b.nr + 1}</b><i style="width:${Math.round(p * 100)}%;background:${basisFarbe(c)}"></i></span>`;
  });
  if (hud.dataset.stand !== html) {
    hud.dataset.stand = html;
    hud.innerHTML = html;
  }
}
const KR = erzeugeRunde({
  game, scene, tr, meldung,
  id: () => meineId, name: () => spielerName, andere: () => andere, npcs: () => npcs,
  fahrzeug: () => meinFahrzeug, karte: () => sichereKarte(fightKarte), karteNr: () => fightKarte,
  fightAn: () => modus === "fahr" && fightAktiv(), punkte: () => fightZustand.pt,
  neu: () => neuStarten(), zufallskarte: () => zufallsKarte()
});

// zufaellige andere karte: zurueck in den bau und neu in die warteschlange
function zufallsKarte() {
  const n = FK.EIGENER_PLATZ;
  let k = fightKarte;
  while (k === fightKarte && n > 1) k = Math.floor(Math.random() * n);
  fightKarte = k;
  merkeKarte();
  if (modus === "fahr") wechsleModus();
  setzeSpielModus("fight");
  if (socket?.readyState === WebSocket.OPEN) warteBeitreten();
  else if (modus === "bau") wechsleModus();
}
let wartet = false;
let npcPlanCache = null;
const npcPlan = () => (npcPlanCache ||= BAU.VORLAGEN.find(v => v.id === "panzer").bauen());
let npcs = null;
function npcSteuerung() {
  return (npcs ||= erzeugeNpcSteuerung({
    R: RAPIER, world, plan: npcPlan(), url: socketUrl, mutator: v => KR.mutatorAnwenden(v),
    startBasis: (lot, lift) => { const s = startBasis(lot, lift); return { basis: s.basis.toArray(), dreh: s.dreh }; },
    umgebung: () => {
      const ziele = [];
      const mitte = fz => { const b = PH.sitzKoerper(fz) || fz.bodies[0]; return b ? b.rb.translation() : null; };
      if (meinFahrzeug?.kampf) { const t = mitte(meinFahrzeug); if (t) ziele.push({ id: meineId, pos: [t.x, t.y, t.z], npc: false }); }
      for (const r of andere.values()) {
        if (r.m !== "fahr" || !r.fm || !r.kin) continue;
        const t = mitte(r.kin);
        if (t) ziele.push({ id: r.id, pos: [t.x, t.y, t.z], npc: !!r.npc });
      }
      return { ziele, basen: sichereKarte(fightKarte)?.basen || [], fb: fightZustand.fb[fightKarte] || [] };
    }
  }));
}
const npcGrafiken = new Map();
function zeigeNpcs() {
  const liste = npcs.fahrzeuge();
  for (const [v, g] of npcGrafiken) if (!liste.includes(v)) { entferneGrafik(g); npcGrafiken.delete(v); }
  for (const v of liste) {
    let g = npcGrafiken.get(v);
    if (!g) {
      g = fahrzeugGrafik(npcPlan(), { ana: v.ana });
      for (const gr of g.groups) scene.add(gr);
      npcGrafiken.set(v, g);
    }
    v.bodies.forEach((b, i) => {
      const gr = g.groups[i];
      if (!gr) return;
      gr.position.copy(b.rb.translation());
      gr.quaternion.copy(b.rb.rotation());
    });
    setzeRaeder(g, npcs.radZ(v));
    pflegeTrennungen(v, g);
    for (const i of v.zerstoert) markiereZerstoert(g, i);
  }
}

function warteBeitreten() {
  wartet = true;
  socket.send(JSON.stringify({ type: "warte", an: true, karte: fightKarte }));
  zeigeWarte({ menschen: 1, npc: 0, ziel: 4, naechster: 6000 });
}
function warteAbbrechen() {
  if (!wartet) return;
  wartet = false;
  try { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "warte", an: false })); } catch {}
  $("#wartePanel").hidden = true;
}
function zeigeWarte(d) {
  $("#wartePanel").hidden = false;
  $("#warteText").textContent = `${tr("Warteschlange")}: ${d.menschen + d.npc}/${d.ziel}`;
  $("#warteDetail").textContent = `${d.menschen} ${tr("Spieler")} + ${d.npc} NPC` + (d.npc + d.menschen < d.ziel ? ` · ${tr("nächster NPC in")} ${Math.ceil((d.naechster || 0) / 1000)} s` : "");
}
function matchStart(m) {
  wartet = false;
  $("#wartePanel").hidden = true;
  fightKarte = Math.max(0, Math.min(FK.EIGENER_PLATZ - 1, Number(m.karte) || 0));
  merkeKarte();
  setzeSpielModus("fight");
  if (modus === "bau") wechsleModus();
  else neuStarten();
  if (m.host === meineId && m.npc > 0) npcSteuerung().start(m.npc);
  else npcs?.stop();
  meldung(tr("Match gestartet"));
  HILFE.ersterKampf();
}
$("#schnellSpiel").onclick = () => { $("#modusSeite").hidden = true; zufallsKarte(); };
const HILFE = startHilfe({
  en: EN, tr,
  kontext: () => {
    const typen = new Set(plan.parts.map(p => p.t));
    return {
      modus, fight: fightAktiv(), touch: touchModus && !padAktiv, pad: padAktiv, leer: !plan.parts.length,
      sitz: typen.has("sitz"), motor: typen.has("motor"), tank: typen.has("tank"),
      waffe: typen.has("verschluss") || typen.has("schnellfeuer"),
      richt: plan.parts.some(p => (p.t === "servo" || p.t === "mikro") && p.k?.richt === true)
    };
  }
});
$("#warteAb").onclick = () => warteAbbrechen();
$("#warteJetzt").onclick = () => { warteAbbrechen(); wechsleModus(); };

function setzeSpielModus(m) {
  spielModus = m === "fight" ? "fight" : "test";
  if (spielModus !== "fight") { npcs?.stop(); warteAbbrechen(); }
  try { localStorage.setItem("bastelkarre-spielmodus", spielModus); } catch {}
  zeigeSpielModus();
  $("#modusSeite").hidden = true;
}
$("#btnSpielen").onclick = () => {
  $("#btnSpielen").blur();
  if (modus === "bau" && fightAktiv() && fightKarte < FK.EIGENER_PLATZ && socket?.readyState === WebSocket.OPEN && !wartet) return warteBeitreten();
  wechsleModus();
};
$("#modusZeile").onclick = () => { $("#modusSeite").hidden = false; };
$("#modusSeite").onclick = e => { if (e.target === $("#modusSeite")) $("#modusSeite").hidden = true; };
for (const k of document.querySelectorAll(".modusKachel")) k.onclick = () => setzeSpielModus(k.dataset.modus);
zeigeSpielModus();
$("#btnNeu").onclick = () => { neuStarten(); $("#btnNeu").blur(); };
$("#btnAus").onclick = () => { ausEinsteigen(); $("#btnAus").blur(); };
$("#btnAnsicht").onclick = () => { schalteAnsicht(); $("#btnAnsicht").blur(); };

const touchTasten = $("#touchTasten");
const feuerTasten = new Set(), wechselTasten = new Set();
function baueTastenListe() {
  feuerTasten.clear();
  wechselTasten.clear();
  const liste = [["W / S", "Gas / Rückwärts"], ["A / D", "Lenken"], ["Leertaste", "Bremse"], ["M", "Motor an/aus"], ["C", "Kamera"], ["Tab", "Bauen"], ["⌫", "Neu starten"], ["X", "Aus-/Einsteigen"]];
  const aktionen = new Map();
  const add = (t, text, name, zusatz = "") => {
    if (!t) return;
    const label = name ? name + zusatz : text;
    const alt = aktionen.get(t);
    aktionen.set(t, alt && !alt.includes(label) ? `${alt}, ${label}` : label);
  };
  const raketen = [];
  let hatTank = false;
  steuerKanaele = { nick: false, roll: false };
  const joystickTasten = new Set();
  plan.parts.forEach((p, i) => {
    switch (p.t) {
      case "nebel": add(p.k.taste, "Nebel", p.k.name); break;
      case "duese": add(p.k.taste, "Triebwerk", p.k.name); break;
      case "rakete": add(p.k.taste, "Rakete", p.k.name); raketen.push(i); break;
      case "fallschirm": add(p.k.taste, "Fallschirm", p.k.name); break;
      case "kamera": add(p.k.taste, "Kamera", p.k.name); break;
      case "scheinwerfer": add(p.k.taste, "Scheinwerfer", p.k.name); break;
      case "unterboden": add(p.k.taste, "Unterbodenlicht", p.k.name); break;
      case "strahler": add(p.k.taste, "Flutlicht", p.k.name); break;
      case "blinker": add(p.k.taste, "Blinker", p.k.name); break;
      case "blaulicht": add(p.k.taste, "Rundumleuchte", p.k.name); break;
      case "laser": add(p.k.taste, "Laser", p.k.name); break;
      case "konfetti": add(p.k.taste, "Konfetti", p.k.name); break;
      case "rauchwerfer": add(p.k.taste, "Rauch", p.k.name); break;
      case "fackel": add(p.k.taste, "Fackel", p.k.name); break;
      case "stoersender": add(p.k.taste, "Störsender", p.k.name); break;
      case "schild": add(p.k.taste, "Schild", p.k.name); break;
      case "feuerloescher": add(p.k.taste, "Löschen", p.k.name); break;
      case "propeller": add(p.k.plus, "Gashebel +", p.k.name, " +"); add(p.k.minus, "Gashebel −", p.k.name, " −"); break;
      case "tank": hatTank = true; break;
      case "steuerflaeche": {
        const n = { nick: "Nicken", roll: "Rollen", gier: "Gieren" }[p.k.kanal] || "Ruder";
        add(p.k.plus, `${n} +`, p.k.name, " +");
        add(p.k.minus, `${n} −`, p.k.name, " −");
        if (p.k.kanal === "nick" || p.k.kanal === "roll") {
          steuerKanaele[p.k.kanal] = true;
          joystickTasten.add(p.k.plus);
          joystickTasten.add(p.k.minus);
        }
        break;
      }
      case "servo": add(p.k.plus, "Motor +", p.k.name, " +"); add(p.k.minus, "Motor −", p.k.name, " −"); break;
      case "mikro":
        add(p.k.plus, "Drehen +", p.k.name, " +"); add(p.k.minus, "Drehen −", p.k.name, " −");
        add(p.k.hoch, "Neigen +", p.k.name, " ↑"); add(p.k.runter, "Neigen −", p.k.name, " ↓");
        break;
      case "bruch": add(p.k.taste, "Trennen", p.k.name); break;
      case "explosive": add(p.k.taste, "Sprengen", p.k.name); break;
      case "schnellfeuer": add(p.k.taste, "Dauerfeuer", p.k.name); if (p.k.taste) feuerTasten.add(p.k.taste); break;
      case "verschluss": add(p.k.taste, "Schiessen", p.k.name); if (p.k.taste) feuerTasten.add(p.k.taste); if (p.k.wechsel) { add(p.k.wechsel, "Munitionsart wechseln", p.k.name); wechselTasten.add(p.k.wechsel); } break;
    }
  });
  if (hatTank) liste.push(["K", "Treibstoffverbrauch an/aus"]);
  const el = $("#tastenListe");
  el.innerHTML = "";
  for (const [k, t] of [...liste, ...[...aktionen].map(([k, t]) => [tastenText(k), t])]) {
    const d = document.createElement("div");
    d.innerHTML = `<span></span><kbd></kbd>`;
    d.firstChild.textContent = tr(t);
    d.lastChild.textContent = tr(k);
    el.append(d);
  }
  if (raketen.length) {
    const d = document.createElement("div");
    d.style.display = "block";
    d.innerHTML = `<span>${tr("Raketen-Treibstoff")}</span><span class="treibstoff"><i id="treibstoffBalken"></i></span>`;
    el.append(d);
  }

  if (hatTank) {
    const d = document.createElement("div");
    d.style.display = "block";
    d.innerHTML = `<span>${tr("Treibstoff")}</span><span class="treibstoff"><i id="tankBalken"></i></span>`;
    el.append(d);
  }

  touchTasten.innerHTML = "";
  const knopf = (taste, text) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = tr(text);
    const an = e => { e.preventDefault(); touchGedrueckt.add(taste); angetippt.add(taste); b.classList.add("an"); };
    const aus = () => { touchGedrueckt.delete(taste); b.classList.remove("an"); };
    b.addEventListener("pointerdown", an);
    b.addEventListener("pointerup", aus);
    b.addEventListener("pointercancel", aus);
    b.addEventListener("pointerleave", aus);
    touchTasten.append(b);
  };
  knopf("space", "Bremse / Sprung");
  const xb = document.createElement("button");
  xb.type = "button";
  xb.textContent = tr("Aus/Ein");
  xb.addEventListener("pointerdown", e => { e.preventDefault(); ausEinsteigen(); });
  touchTasten.append(xb);
  if (hatTank) {
    const kb = document.createElement("button");
    kb.type = "button";
    kb.textContent = tr("Verbrauch");
    kb.addEventListener("pointerdown", e => { e.preventDefault(); schalteVerbrauch(); });
    touchTasten.append(kb);
  }
  if (feuerTasten.size && fightAktiv()) {
    // ein grosser feuer-knopf statt einzelner schiess-tasten
    const fb = document.createElement("button");
    fb.type = "button";
    fb.className = "feuerKnopf";
    fb.textContent = tr("FEUER");
    const an = e => { e.preventDefault(); for (const t of feuerTasten) { touchGedrueckt.add(t); angetippt.add(t); } fb.classList.add("an"); };
    const aus = () => { for (const t of feuerTasten) touchGedrueckt.delete(t); fb.classList.remove("an"); };
    fb.addEventListener("pointerdown", an);
    fb.addEventListener("pointerup", aus);
    fb.addEventListener("pointercancel", aus);
    fb.addEventListener("pointerleave", aus);
    touchTasten.prepend(fb);
  }
  for (const [k, t] of aktionen) if (!joystickTasten.has(k) && !(fightAktiv() && feuerTasten.has(k))) knopf(k, t);
}

function mitSitzRechten(ein) {
  return ichSitz && meinFahrzeug ? filtereEingabe(ein, meinFahrzeug.plan, ichSitz.i) : ein;
}

function fremdeEingaben() {
  const liste = [];
  if (!meinFahrzeug || !meineId) return liste;
  for (const r of andere.values()) {
    if (r.m !== "fahr" || !r.sit || r.sit[0] !== meineId) continue;
    const e = fremdeEingabe(r.ei, meinFahrzeug.plan, r.sit[1]);
    if (e) liste.push(e);
  }
  return liste;
}

function gesamtEingabe() {
  const eigene = istFahrer() ? mitSitzRechten(eingabe()) : null;
  const fremde = meinFahrzeug?.serverModus ? [] : fremdeEingaben();
  return mischeEingaben(eigene ? [eigene, ...fremde] : fremde);
}

function eingabe() {
  const alle = new Set([...gedrueckt, ...touchGedrueckt, ...angetippt, ...richtEingabe]);
  const gas = (alle.has("w") ? 1 : 0) - (alle.has("s") ? 1 : 0) - (steuerKanaele.nick ? 0 : joyY);
  const lenk = (alle.has("d") ? 1 : 0) - (alle.has("a") ? 1 : 0) + joyX;
  const totzone = v => (Math.abs(v) < 0.12 ? 0 : (v - Math.sign(v) * 0.12) / 0.88);
  const achsen = {};
  if (steuerKanaele.nick) achsen.nick = totzone(joyY);
  if (steuerKanaele.roll) achsen.roll = totzone(joyX);
  return {
    gas: THREE.MathUtils.clamp(gas, -1, 1),
    lenk: THREE.MathUtils.clamp(lenk, -1, 1),
    bremse: alle.has("space"),
    achsen,
    tasten: tippt() ? new Set() : alle
  };
}

const fxAkku = new Map();
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpVel = new THREE.Vector3();
const tmpFarbe = new THREE.Color();

function knall(pos, r, ton = true) {
  const mitte = new THREE.Vector3(pos[0], pos[1], pos[2]);
  if (ton) TON.explosion(r, camera.position.distanceTo(mitte));
  ruckeKamera(mitte, 0.05 + 0.04 * r, 60);
  blitz(pos, 0xffa040, 6 + r * 10, 12 + r * 10, 0.25 + r * 0.05);
  if (r >= 0.8) druckring(pos, r * 2);
  for (let j = 0; j < Math.min(14, 2 + r * 3); j++) brocken1(pos, [zuf(12 + r * 4), 4 + Math.random() * (6 + r * 3), zuf(12 + r * 4)], j % 3 ? "#2b2b2b" : "#5a4a3a", 0.08 + Math.random() * 0.12 * Math.min(3, r), 2 + Math.random() * 2);
  const n = Math.min(260, Math.round(40 + r * 70));
  const zu = s => (Math.random() - 0.5) * s;
  for (let j = 0; j < n; j++) {
    tmpVel.set(zu(2), zu(2), zu(2)).normalize().multiplyScalar(Math.min(2 * r, 40) * (0.3 + Math.random() * 0.9));
    const heiss = Math.random();
    feuer.emit(mitte.clone(), tmpVel, tmpFarbe.setHSL(0.04 + heiss * 0.09, 1, 0.5 + heiss * 0.45), Math.min(0.3 + r * 0.2, 6), 0.05, 0.6 + Math.random() * 0.9, 0.95);
    if (Math.random() < 0.4) {
      rauch.emit(mitte.clone(), tmpVel.multiplyScalar(0.2), tmpFarbe.set(Math.random() < 0.5 ? "#3a3d42" : "#8b8f98"), Math.min(0.3 + r * 0.12, 5), Math.min(1 + r * 0.8, 20), 3 + Math.random() * 3, 0.55, 0.35);
    }
  }
}

function markiereZerstoert(grafik, i) {
  const obj = grafik?.teilObj?.get(i);
  if (!obj || obj.userData.zerstoert) return;
  obj.userData.zerstoert = true;
  if (brennende.length < 40) brennende.push({ obj, t: 0, dauer: 18 + Math.random() * 12, akku: 0 });
  faerbeInstanz(obj, 0.2);
  obj.traverse(o => {
    if (!o.material) return;
    const dunkel = m => { const c = m.clone(); c.color?.multiplyScalar(0.2); c.emissive?.set(0x000000); return c; };
    o.material = Array.isArray(o.material) ? o.material.map(dunkel) : dunkel(o.material);
  });
}

const rohrRauch = [];
function muendungsfeuer(m) {
  const k = Math.max(0.15, m.kal / 155);
  const pos = new THREE.Vector3(...m.p);
  const dir = new THREE.Vector3(...m.dir);
  TON.schuss(m.kal, camera.position.distanceTo(pos));
  ruckeKamera(pos, m.von === meinFahrzeug ? 0.06 + 0.3 * k : 0.02 + 0.1 * k, m.von === meinFahrzeug ? 1e9 : 80);
  const zu = s => (Math.random() - 0.5) * s;
  const n = Math.round(30 + 120 * k);
  for (let j = 0; j < n; j++) {
    const speed = (10 + Math.random() * 60) * (0.5 + k);
    tmpVel.copy(dir).multiplyScalar(speed).add(new THREE.Vector3(zu(speed * 0.5), zu(speed * 0.5), zu(speed * 0.5)));
    const heiss = Math.random();
    feuer.emit(pos.clone().addScaledVector(dir, Math.random() * 0.4), tmpVel, tmpFarbe.setHSL(0.04 + heiss * 0.1, 1, 0.5 + heiss * 0.45), 0.25 + 0.8 * k, 0.05, 0.12 + Math.random() * 0.3, 0.95);
  }
  for (let j = 0; j < 10 + 30 * k; j++) {
    tmpVel.set(zu(14), zu(14), zu(14)).addScaledVector(dir, -4 * Math.random());
    feuer.emit(pos.clone(), tmpVel, tmpFarbe.setHSL(0.1, 1, 0.8), 0.2 + 0.4 * k, 0.05, 0.1 + Math.random() * 0.15, 0.9);
  }
  for (let j = 0; j < 10 + 30 * k; j++) {
    tmpVel.copy(dir).multiplyScalar(2 + Math.random() * 14).add(new THREE.Vector3(zu(4), Math.random() * 2, zu(4)));
    rauch.emit(pos.clone(), tmpVel, tmpFarbe.set(Math.random() < 0.5 ? "#6b6e73" : "#a4a7ac"), 0.3 + 0.9 * k, 1.5 + 4 * k, 2 + Math.random() * 2, 0.5, 0.35);
  }
  blitz(m.p, 0xffc070, 8 + 30 * k, 10 + 30 * k, 0.08 + 0.1 * k);
  const seite = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
  if (Math.random() < (k < 0.3 ? 0.6 : 1)) brocken1(m.p, [seite.x * 3 - dir.x * 2 + zuf(1), 2.5 + Math.random() * 2, seite.z * 3 - dir.z * 2 + zuf(1)], "#c9a24a", 0.05 + 0.25 * k, 3, true);
  let rohr = -1, best = 2;
  m.von?.plan.parts.forEach((p, i) => {
    if (p.t !== "geschuetz") return;
    const mp = PH.muendungPos(m.von, i);
    const d = mp ? Math.hypot(mp.pos[0] - m.p[0], mp.pos[1] - m.p[1], mp.pos[2] - m.p[2]) : 1e9;
    if (d < best) { best = d; rohr = i; }
  });
  rohrRauch.push({ veh: m.von, rohr, p: [...m.p], dir: [...m.dir], k, t: 0, dauer: 3 + 4 * k, akku: 0 });
}

function rohrQualm(dt) {
  for (let i = rohrRauch.length - 1; i >= 0; i--) {
    const r = rohrRauch[i];
    r.t += dt;
    if (r.t > r.dauer) { rohrRauch.splice(i, 1); continue; }
    let p = r.p, d = r.dir;
    if (r.rohr >= 0 && r.veh) {
      const mp = PH.muendungPos(r.veh, r.rohr);
      if (!mp) { rohrRauch.splice(i, 1); continue; }
      p = mp.pos; d = mp.dir;
    }
    r.akku += (10 + 30 * r.k) * (1 - r.t / r.dauer) * dt;
    while (r.akku >= 1) {
      r.akku -= 1;
      const pos = new THREE.Vector3(p[0] + zuf(0.05), p[1] + zuf(0.05), p[2] + zuf(0.05));
      tmpVel.set(d[0], d[1], d[2]).multiplyScalar(0.8 + Math.random() * 2).add(new THREE.Vector3(zuf(0.5), 0.3 + Math.random() * 0.6, zuf(0.5)));
      rauch.emit(pos, tmpVel, tmpFarbe.set(Math.random() < 0.5 ? "#7a7d82" : "#9a9da2"), 0.12 + 0.3 * r.k, 0.8 + 2 * r.k, 1.4 + Math.random() * 1.6, 0.35, 0.5);
    }
  }
}
const zuf = s => (Math.random() - 0.5) * s;

const geschossMeshes = new Map();
const UP = new THREE.Vector3(0, 1, 0);
const tracerGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
const tracerMats = [0xffc766, 0xe8f4ff, 0xff7a3d, 0xff5a5a].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
function zeigeGeschosse(dt = 0) {
  for (const m of PH.muendungen.splice(0)) muendungsfeuer(m);
  rohrQualm(dt);
  for (const [g, m] of geschossMeshes) {
    if (!PH.geschosse.includes(g)) { scene.remove(m); geschossMeshes.delete(g); }
  }
  for (const g of PH.geschosse) {
    const k = Math.max(0.15, g.kal / 155);
    let m = geschossMeshes.get(g);
    if (!m) {
      m = new THREE.Mesh(tracerGeo, tracerMats[g.art || 0]);
      const laenge = 4 + 10 * k;
      m.scale.set(0.06 + 0.22 * k, laenge, 0.06 + 0.22 * k);
      m.userData.letzte = [...g.p];
      scene.add(m);
      geschossMeshes.set(g, m);
    }
    const richtung = tmpD.set(g.v[0], g.v[1], g.v[2]).normalize();
    m.quaternion.setFromUnitVectors(UP, richtung);
    m.position.set(g.p[0], g.p[1], g.p[2]).addScaledVector(richtung, -m.scale.y * 0.45);
    const l = m.userData.letzte;
    const weg = Math.hypot(g.p[0] - l[0], g.p[1] - l[1], g.p[2] - l[2]);
    const schritte = Math.min(12, Math.ceil(weg / 5));
    for (let j = 0; j < schritte; j++) {
      const t = (j + 1) / schritte;
      const pos = new THREE.Vector3(l[0] + (g.p[0] - l[0]) * t, l[1] + (g.p[1] - l[1]) * t, l[2] + (g.p[2] - l[2]) * t);
      tmpVel.set(zuf(1.5), zuf(1.5), zuf(1.5));
      feuer.emit(pos, tmpVel, tmpFarbe.setHSL(0.08 + Math.random() * 0.05, 1, 0.65), 0.1 + 0.3 * k, 0.04, 0.12 + Math.random() * 0.12, 0.9);
      if (j % 2 === 0) rauch.emit(pos.clone(), tmpVel.set(zuf(0.8), 0.2, zuf(0.8)), tmpFarbe.set("#b9bcc1"), 0.1 + 0.2 * k, 0.6 + 1.2 * k, 0.9 + Math.random() * 0.7, 0.22, 0.2);
    }
    m.userData.letzte = [...g.p];
  }
  for (const e of PH.einschlaege.splice(0)) einschlagEffekt(e);
  pflegeEffekte(dt);
}

function einschlagEffekt(e) {
  const k = Math.max(0.15, e.kal / 155);
  const pos = new THREE.Vector3(e.p[0], e.p[1], e.p[2]);
  const abstand = camera.position.distanceTo(pos);
  const art = e.art || 0;
  if (art !== 3) knall(e.p, (0.3 + k * 1.2) * (art === 0 ? 1.4 : 0.8), false);
  else blitz(e.p, 0xffd080, 3, 6, 0.06);
  const vor = new THREE.Vector3(e.dir[0], e.dir[1], e.dir[2]);
  if (art === 2) {
    blitz(e.p, 0xbfe3ff, 14 + 20 * k, 14, 0.15);
    for (let j = 0; j < 40 + 60 * k; j++) {
      tmpVel.copy(vor).multiplyScalar(30 + Math.random() * 60).add(new THREE.Vector3(zuf(8), zuf(8), zuf(8)));
      feuer.emit(pos.clone(), tmpVel, tmpFarbe.setHSL(0.58 + Math.random() * 0.05, 0.6, 0.85), 0.08 + 0.12 * k, 0.02, 0.12 + Math.random() * 0.2, 1);
    }
  } else if (art === 1 && e.treffer) {
    for (let j = 0; j < 30 + 40 * k; j++) {
      tmpVel.set(zuf(2), Math.random(), zuf(2)).normalize().multiplyScalar(20 + Math.random() * 40).addScaledVector(vor, 10);
      feuer.emit(pos.clone(), tmpVel, tmpFarbe.setHSL(0.11, 1, 0.75), 0.05 + 0.06 * k, 0.01, 0.3 + Math.random() * 0.4, 1);
    }
    for (let j = 0; j < 6; j++) brocken1(e.p, [zuf(14), 3 + Math.random() * 6, zuf(14)], "#6b6f75", 0.06 + 0.1 * k, 2.5);
  }
  if (!e.treffer && art !== 3) {
    brandfleck(e.p, 0.8 + 3 * k * (art === 0 ? 1.5 : 1));
    for (let j = 0; j < 4 + 10 * k; j++) brocken1(e.p, [zuf(10), 5 + Math.random() * 9, zuf(10)], Math.random() < 0.5 ? "#6b5a42" : "#4f4232", 0.1 + 0.25 * k, 2 + Math.random());
  }
  TON.einschlag(e.kal, abstand, e.treffer);
  ruckeKamera(pos, e.treffer ? 0.15 + 0.5 * k : 0.02 + 0.12 * k, e.treffer ? 1e9 : 70);
  const rueck = new THREE.Vector3(-e.dir[0], -e.dir[1], -e.dir[2]);
  for (let j = 0; j < 12 + 40 * k; j++) {
    tmpVel.copy(rueck).multiplyScalar(4 + Math.random() * 22).add(new THREE.Vector3(zuf(14), Math.random() * 8, zuf(14)));
    feuer.emit(pos.clone(), tmpVel, tmpFarbe.setHSL(0.1 + Math.random() * 0.05, 0.9, 0.7), 0.06 + 0.1 * k, 0.02, 0.15 + Math.random() * 0.35, 0.95);
  }
  if (!e.treffer) {
    for (let j = 0; j < 8 + 20 * k; j++) {
      tmpVel.set(zuf(5), 1 + Math.random() * 5, zuf(5));
      rauch.emit(pos.clone(), tmpVel, tmpFarbe.set(Math.random() < 0.5 ? "#7a6a52" : "#9a8a70"), 0.4 + 0.8 * k, 2 + 5 * k, 1.5 + Math.random() * 1.8, 0.5, 0.25);
    }
  }
}

const blitzLichter = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb060, 0, 30, 2); scene.add(l); return { l, t: 1, dauer: 1, staerke: 0 }; });
function blitz(pos, farbe, staerke, weite, dauer = 0.12) {
  const b = blitzLichter.reduce((a, x) => (x.t / x.dauer > a.t / a.dauer ? x : a));
  b.l.position.set(pos[0], pos[1], pos[2]);
  b.l.color.set(farbe);
  b.l.distance = weite;
  b.staerke = staerke;
  b.t = 0;
  b.dauer = dauer;
}
const brocken = [];
const brockenGeo = new THREE.BoxGeometry(1, 1, 1);
const huelseGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const brockenMat = new Map();
const brockenFarbe = f => { if (!brockenMat.has(f)) brockenMat.set(f, new THREE.MeshStandardMaterial({ color: f, roughness: 0.6, metalness: f === "#c9a24a" ? 0.8 : 0.1, transparent: true })); return brockenMat.get(f); };
function brocken1(pos, vel, farbe, groesse, leben = 2.5, huelse = false) {
  if (brocken.length > 160) { const alt = brocken.shift(); scene.remove(alt.m); }
  const m = new THREE.Mesh(huelse ? huelseGeo : brockenGeo, brockenFarbe(farbe).clone());
  m.scale.set(groesse * (huelse ? 0.35 : 1), groesse * (huelse ? 1.4 : 0.7 + Math.random() * 0.6), groesse * (huelse ? 0.35 : 1));
  m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = true;
  scene.add(m);
  const hit = world.castRay(new RAPIER.Ray({ x: pos[0], y: pos[1] + 0.5, z: pos[2] }, { x: 0, y: -1, z: 0 }), 80, true);
  const boden = hit ? pos[1] + 0.5 - (hit.timeOfImpact ?? hit.toi ?? 80) : pos[1] - 80;
  brocken.push({ m, v: [...vel], dreh: [zuf(18), zuf(18), zuf(18)], t: 0, leben, boden });
}
const ringe = [];
const ringGeo = new THREE.RingGeometry(0.85, 1, 48);
function druckring(pos, r) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(pos[0], pos[1] + 0.2, pos[2]);
  m.rotation.x = -Math.PI / 2;
  scene.add(m);
  ringe.push({ m, t: 0, r });
}
const flecken = [];
const fleckGeo = new THREE.CircleGeometry(1, 20);
function brandfleck(pos, r) {
  if (flecken.length > 60) { const alt = flecken.shift(); scene.remove(alt.m); alt.m.material.dispose(); }
  const m = new THREE.Mesh(fleckGeo, new THREE.MeshBasicMaterial({ color: 0x15120f, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.position.set(pos[0], pos[1] + 0.06, pos[2]);
  m.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
  m.scale.set(r * (0.8 + Math.random() * 0.4), r, 1);
  scene.add(m);
  flecken.push({ m, t: 0 });
}
const brennende = [];
function pflegeEffekte(dt) {
  for (const b of blitzLichter) {
    b.t += dt;
    b.l.intensity = b.t < b.dauer ? b.staerke * Math.pow(1 - b.t / b.dauer, 2) : 0;
  }
  for (let i = brocken.length - 1; i >= 0; i--) {
    const b = brocken[i];
    b.t += dt;
    b.v[1] -= 9.81 * dt;
    b.m.position.x += b.v[0] * dt; b.m.position.y += b.v[1] * dt; b.m.position.z += b.v[2] * dt;
    b.m.rotation.x += b.dreh[0] * dt; b.m.rotation.y += b.dreh[1] * dt; b.m.rotation.z += b.dreh[2] * dt;
    if (b.m.position.y < b.boden) {
      b.m.position.y = b.boden;
      b.v = [b.v[0] * 0.45, Math.abs(b.v[1]) * 0.3, b.v[2] * 0.45];
      b.dreh = b.dreh.map(x => x * 0.5);
    }
    const rest = b.leben - b.t;
    if (rest < 0.6) b.m.material.opacity = Math.max(0, rest / 0.6);
    if (rest <= 0) { scene.remove(b.m); b.m.material.dispose(); brocken.splice(i, 1); }
  }
  for (let i = ringe.length - 1; i >= 0; i--) {
    const r = ringe[i];
    r.t += dt;
    const k = r.t / 0.55;
    r.m.scale.setScalar(0.5 + r.r * 2.2 * Math.sqrt(k));
    r.m.material.opacity = 0.55 * (1 - k);
    if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); ringe.splice(i, 1); }
  }
  for (let i = flecken.length - 1; i >= 0; i--) {
    const f = flecken[i];
    f.t += dt;
    if (f.t > 30) f.m.material.opacity = Math.max(0, 0.6 * (1 - (f.t - 30) / 10));
    if (f.t > 40) { scene.remove(f.m); f.m.material.dispose(); flecken.splice(i, 1); }
  }
  for (let i = brennende.length - 1; i >= 0; i--) {
    const b = brennende[i];
    b.t += dt;
    if (b.t > b.dauer || !b.obj.parent) { brennende.splice(i, 1); continue; }
    b.obj.getWorldPosition(tmpV);
    const flammen = b.t < b.dauer * 0.6;
    b.akku += (flammen ? 22 : 6) * dt;
    while (b.akku >= 1) {
      b.akku -= 1;
      const pos = tmpV.clone().add(new THREE.Vector3(zuf(0.3), 0.1, zuf(0.3)));
      if (flammen) feuer.emit(pos, tmpVel.set(zuf(0.6), 1.5 + Math.random() * 1.5, zuf(0.6)), tmpFarbe.setHSL(0.05 + Math.random() * 0.06, 1, 0.55), 0.35, 0.05, 0.5 + Math.random() * 0.4, 0.9, 0.6);
      rauch.emit(pos.clone(), tmpVel.set(zuf(0.5), 1.2 + Math.random(), zuf(0.5)), tmpFarbe.set(flammen ? "#2a2b2e" : "#55585d"), 0.3, 1.6 + Math.random(), 2.5 + Math.random() * 2, 0.45, 0.5);
    }
  }
}

let kameraRuck = 0;
function ruckeKamera(pos, staerke, grenze) {
  const abstand = camera.position.distanceTo(pos);
  if (abstand >= grenze) return;
  kameraRuck = Math.max(kameraRuck, staerke * (1 - abstand / grenze));
}

function emitEffekte(besitzer, planX, grafik, fx, dt) {
  if (!grafik) return;
  for (const [i, staerke] of fx) {
    const p = planX.parts[i];
    const e = grafik.emit.get(i);
    if (!p || !e) continue;
    e.obj.localToWorld(tmpV.copy(e.punkt));
    tmpD.set(0, 1, 0).transformDirection(e.obj.matrixWorld);
    const key = besitzer + ":" + i;
    let akku = fxAkku.get(key) || 0;
    let rate = 0, burstRate = 0;
    switch (p.t) {
      case "auspuff": rate = 14 + 46 * staerke; break;
      case "nebel": rate = 55; break;
      case "duese": rate = 160; break;
      case "rakete": rate = 300; break;
      case "funken": rate = 90 * staerke; break;
      case "regenbogen": rate = 55 * staerke; break;
      case "staubspur": rate = 28 * staerke; break;
      case "plasma": rate = 130 * staerke; break;
      case "konfetti": rate = 600 * staerke * staerke; break;
      case "rauchwerfer": rate = 170 * Math.min(1, staerke * 2); break;
      case "fackel": rate = 70; break;
      case "feuerloescher": rate = 220; break;
      case "explosive": {
        const zeit = (1 - staerke) * BLITZ_ZEIT;
        const ausbruch = Math.pow(Math.max(0, 1 - zeit / 1.6), 2);
        burstRate = 4000 * ausbruch * Math.min(2.5, 0.5 + (p.k.reichweite ?? 3) * 0.12);
        rate = burstRate + 70 * Math.min(2.5, 0.5 + (p.k.reichweite ?? 3) * 0.12);
        break;
      }
    }
    akku += rate * dt;
    const zufall = s => (Math.random() - 0.5) * s;
    if (p.t === "feuerloescher" && brennende.length) {
      const meine = new Set(grafik.teilObj.values());
      for (let b = brennende.length - 1; b >= 0; b--) if (meine.has(brennende[b].obj)) brennende.splice(b, 1);
    }
    while (akku >= 1) {
      akku -= 1;
      const pos = tmpV.clone().add(new THREE.Vector3(zufall(0.05), zufall(0.05), zufall(0.05)));
      const versatz = Math.random() * dt;
      if (p.t === "funken") {
        tmpVel.copy(tmpD).multiplyScalar(1 + Math.random() * 4).add(new THREE.Vector3(zufall(2.5), 0.5 + Math.random() * 1.5, zufall(2.5)));
        feuer.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#ffb347").offsetHSL(zufall(0.06), 0, Math.random() * 0.2), 0.09, 0.02, 0.3 + Math.random() * 0.5, 0.95, -5);
      } else if (p.t === "regenbogen") {
        tmpVel.copy(tmpD).multiplyScalar(1.2).add(new THREE.Vector3(zufall(0.5), 0.2, zufall(0.5)));
        rauch.emit(pos, tmpVel, tmpFarbe.setHSL(((performance.now() / 1500) + Math.random() * 0.05) % 1, 1, 0.55), 0.14, 0.9, 1.1 + Math.random() * 0.5, 0.65, 0.3);
      } else if (p.t === "staubspur") {
        tmpVel.copy(tmpD).multiplyScalar(0.8).add(new THREE.Vector3(zufall(1), 0.4 + Math.random() * 0.5, zufall(1)));
        rauch.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#b59a73"), 0.25, 1.8, 1.4 + Math.random() * 0.8, 0.35, 0.15);
      } else if (p.t === "plasma") {
        tmpVel.copy(tmpD).multiplyScalar(0.5 + Math.random()).add(new THREE.Vector3(zufall(1.4), zufall(1.4), zufall(1.4)));
        feuer.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#6fb7ff").lerp(new THREE.Color("#ffffff"), Math.random() * 0.5), 0.16, 0.02, 0.2 + Math.random() * 0.2, 0.95);
      } else if (p.t === "konfetti") {
        tmpVel.copy(tmpD).multiplyScalar(5 + Math.random() * 7).add(new THREE.Vector3(zufall(5), zufall(5), zufall(5)));
        feuer.emit(pos, tmpVel, tmpFarbe.setHSL(Math.random(), 1, 0.6), 0.08, 0.08, 1.4 + Math.random() * 1.2, 0.95, -7);
      } else if (p.t === "rauchwerfer") {
        tmpVel.copy(tmpD).multiplyScalar(5 + Math.random() * 3).add(new THREE.Vector3(zufall(2.5), zufall(1.5), zufall(2.5)));
        rauch.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#d9dde3"), 0.6, 4.8, 5 + Math.random() * 3, 0.85, 0.12);
      } else if (p.t === "fackel") {
        tmpVel.copy(tmpD).multiplyScalar(2 + Math.random() * 2).add(new THREE.Vector3(zufall(1.2), zufall(0.6), zufall(1.2)));
        feuer.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#ff5a2a").offsetHSL(zufall(0.05), 0, Math.random() * 0.2), 0.5, 0.05, 0.4 + Math.random() * 0.3, 0.95);
        if (Math.random() < 0.3) rauch.emit(pos.clone(), tmpVel.multiplyScalar(0.4), tmpFarbe.set("#c9ccd1"), 0.2, 1.4, 1.8 + Math.random(), 0.3, 0.5);
      } else if (p.t === "feuerloescher") {
        tmpVel.copy(tmpD).multiplyScalar(8 + Math.random() * 3).add(new THREE.Vector3(zufall(1.5), zufall(1.5), zufall(1.5)));
        rauch.emit(pos, tmpVel, tmpFarbe.set("#f4f8ff"), 0.15, 1.1, 0.9 + Math.random() * 0.5, 0.75, -0.4);
      } else if (p.t === "auspuff") {
        tmpVel.copy(tmpD).multiplyScalar(1.5 + staerke * 2).add(new THREE.Vector3(zufall(0.4), 0.3, zufall(0.4)));
        rauch.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#5b5f66"), 0.12, 0.7 + staerke * 0.5, 1.1 + Math.random() * 0.6, 0.55, 0.6);
      } else if (p.t === "nebel") {
        tmpVel.copy(tmpD).multiplyScalar(2.2).add(new THREE.Vector3(zufall(0.8), zufall(0.4), zufall(0.8)));
        rauch.emit(pos, tmpVel, tmpFarbe.set(p.k.farbe || "#e8f0ff"), 0.3, 2.6, 3.2 + Math.random() * 1.5, 0.5, 0.25);
      } else if (p.t === "explosive") {
        const r = Math.max(1, p.k.reichweite ?? 3);
        tmpVel.set(zufall(2), zufall(2), zufall(2)).normalize().multiplyScalar(Math.min(2 * r, 80) * (0.3 + Math.random() * 0.9));
        pos.addScaledVector(tmpVel, versatz);
        const heiss = Math.random();
        const nurRauch = Math.random() * rate >= burstRate;
        if (!nurRauch) feuer.emit(pos, tmpVel, tmpFarbe.setHSL(0.04 + heiss * 0.09, 1, 0.5 + heiss * 0.45), Math.min(0.35 + r * 0.22, 12), 0.05, 0.9 + Math.random() * 1.1, 0.95);
        if (nurRauch || Math.random() < 0.35) {
          rauch.emit(pos, tmpVel.multiplyScalar(nurRauch ? 0.04 : 0.25), tmpFarbe.set(Math.random() < 0.5 ? "#3a3d42" : "#8b8f98"), Math.min(0.4 + r * 0.15, 8), Math.min(1 + r * 0.9, 30), 5 + Math.random() * 4, 0.55, 0.35);
        }
      } else {
        const rak = p.t === "rakete";
        const v = rak ? 22 : 14;
        tmpVel.copy(tmpD).multiplyScalar(v * (0.7 + Math.random() * 0.5)).add(new THREE.Vector3(zufall(1), zufall(1), zufall(1)));
        pos.addScaledVector(tmpVel, versatz);
        feuer.emit(pos, tmpVel, tmpFarbe.setHSL(0.07 + Math.random() * 0.06, 1, 0.55 + Math.random() * 0.15), rak ? 0.45 : 0.3, 0.05, rak ? 0.22 : 0.14, 0.9);
        if (Math.random() < (rak ? 0.5 : 0.18)) {
          tmpVel.multiplyScalar(0.35);
          rauch.emit(pos.addScaledVector(tmpD, 0.6), tmpVel, tmpFarbe.set(rak ? "#d8d4cc" : "#9aa0a8"), 0.3, rak ? 2.4 : 1.2, 1.6 + Math.random(), 0.4, 0.4);
        }
      }
    }
    fxAkku.set(key, akku);
  }
}

const schirme = new Map();

const lichtPool = [];
const blitzPool = [];
const wellePool = [];
function blitzLicht(staerke) {
  const zeit = (1 - staerke) * BLITZ_ZEIT;
  return Math.pow(Math.max(0, 1 - zeit / 2.4), 2);
}
function gluehen(staerke) {
  const zeit = (1 - staerke) * BLITZ_ZEIT;
  return Math.pow(Math.max(0, 1 - zeit / 9), 1.5);
}
const gluehPool = [];
const gluehFarbe = new THREE.Color();
const BLITZ_ZEIT = 10;
function aktualisiereLichter() {
  const kandidaten = [];
  const blitze = [];
  const sammle = (planX, grafik, fx) => {
    if (!grafik) return;
    const jetzt = performance.now() / 1000;
    for (const [i, linse] of grafik.lampen) {
      const staerke = fx.get(i) ?? 0;
      const an = staerke > 0;
      const typ = planX.parts[i]?.t;
      const blitz = typ === "explosive";
      if (typ === "laser" || typ === "schild") {
        linse.visible = an;
        if (typ === "schild" && an) linse.material.opacity = (0.08 + 0.22 * staerke) * (0.85 + 0.15 * Math.sin(jetzt * 5));
        continue;
      }
      let helligkeit = 2.2, farbeJetzt = null;
      if (typ === "blinker") helligkeit = Math.sin(jetzt * 15.7) > 0 ? 6 : 0.15;
      else if (typ === "blaulicht") {
        const dreh = Math.sin(jetzt * 11);
        helligkeit = 1 + 5 * Math.abs(dreh);
        farbeJetzt = dreh > 0 ? planX.parts[i].k.farbe || "#2f6bff" : "#ff2b2b";
      } else if (typ === "stoersender") helligkeit = 1.5 + 3 * (0.5 + 0.5 * Math.sin(jetzt * 9));
      else if (typ === "fackel") helligkeit = (4 + 3 * Math.random()) * Math.max(0.2, staerke);
      else if (typ === "unterboden") helligkeit = 3;
      else if (typ === "strahler") helligkeit = 3.5;
      if (farbeJetzt) linse.material.emissive.set(farbeJetzt);
      linse.material.emissiveIntensity = an ? (blitz ? 30 * blitzLicht(staerke) + 4 * gluehen(staerke) : helligkeit) : 0;
      const e = grafik.emit.get(i);
      if (!an || !e) continue;
      if (typ === "blinker" || typ === "stoersender") continue;
      e.obj.updateWorldMatrix(true, false);
      const pos = e.obj.localToWorld(e.punkt.clone());
      if (blitz) {
        const o = grafik.sprengOrt?.get(i);
        blitze.push({ fest: o ? new THREE.Vector3(o[0], o[1], o[2]) : pos, pos, farbe: planX.parts[i].k.farbe || "#ffffff", staerke, r: planX.parts[i].k.reichweite ?? 3, d: pos.distanceToSquared(camera.position) });
        continue;
      }
      const dir = new THREE.Vector3(0, 1, 0).transformDirection(e.obj.matrixWorld);
      const form = {
        strahler: [1.1, 90, 1400], unterboden: [1.3, 9, 450], blaulicht: [1.5, 40, 1100], fackel: [1.5, 70, 2600]
      }[typ] || [0.5, 70, 900];
      kandidaten.push({ pos, dir, farbe: farbeJetzt || planX.parts[i]?.k.farbe || "#fff6d0", form: typ === "fackel" ? [form[0], form[1], form[2] * Math.max(0.2, staerke)] : form, d: pos.distanceToSquared(camera.position) });
    }
  };
  if (meinFahrzeug) sammle(plan, meineGrafik, meinFahrzeug.fx);
  for (const r of andere.values()) if (r.m === "fahr" && r.plan && r.grafik) sammle(r.plan, r.grafik, r.fx);
  kandidaten.sort((a, b) => a.d - b.d);
  for (let n = 0; n < Math.min(5, kandidaten.length); n++) {
    if (!lichtPool[n]) {
      const licht = new THREE.SpotLight("#fff6d0", 0, 70, 0.5, 0.6, 2);
      scene.add(licht, licht.target);
      lichtPool[n] = licht;
    }
  }
  lichtPool.forEach((licht, n) => {
    const k = kandidaten[n];
    licht.intensity = k ? k.form[2] : 0;
    if (!k) return;
    licht.angle = k.form[0];
    licht.distance = k.form[1];
    licht.color.set(k.farbe);
    licht.position.copy(k.pos);
    licht.target.position.copy(k.pos).addScaledVector(k.dir, 10);
  });

  blitze.sort((a, b) => a.d - b.d);
  for (let n = 0; n < Math.min(2, blitze.length); n++) {
    if (!blitzPool[n]) {
      const licht = new THREE.PointLight("#ffffff", 0, 90, 2);
      scene.add(licht);
      blitzPool[n] = licht;
    }
  }
  blitzPool.forEach((licht, n) => {
    const b = blitze[n];
    licht.intensity = b ? (20000 * gluehen(b.staerke) + 220000 * blitzLicht(b.staerke)) * Math.min(3, 0.5 + b.r * 0.15) : 0;
    if (!b) return;
    licht.distance = 20 + b.r * 8;
    const kuehl = 1 - gluehen(b.staerke);
    licht.color.set(b.farbe).lerp(gluehFarbe.set("#ff6a1a"), Math.min(1, kuehl * 1.6));
    licht.position.copy(b.pos);
  });

  for (let n = 0; n < Math.min(4, blitze.length * 2); n++) {
    if (!wellePool[n]) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 48, 32),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          fog: false,
          uniforms: { farbe: { value: new THREE.Color("#ffffff") }, stark: { value: 0 } },
          vertexShader: "varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
          fragmentShader: "varying vec3 vN; varying vec3 vV; uniform vec3 farbe; uniform float stark; void main() { float rand = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5); gl_FragColor = vec4(farbe * (0.25 + 4.5 * rand) * stark, 1.0); }"
        })
      );
      m.frustumCulled = false;
      m.userData.keinSchatten = true;
      scene.add(m);
      wellePool[n] = m;
    }
  }
  wellePool.forEach((m, n) => {
    const b = blitze[n >> 1];
    const echo = n & 1;
    m.visible = !!b;
    if (!b) return;
    const t = (1 - b.staerke) * BLITZ_ZEIT - (echo ? 0.3 : 0);
    m.visible = t > 0;
    const lauf = Math.min(1, Math.max(0, t) / 1.6);
    m.position.copy(b.fest);
    m.scale.setScalar(Math.max(0.05, b.r * 2.2 * (echo ? 0.8 : 1) * (1 - Math.pow(1 - lauf, 3))));
    m.material.uniforms.farbe.value.set(b.farbe);
    m.material.uniforms.stark.value = Math.max(0, 1 - t / 3.8) * (echo ? 0.55 : 1);
  });

  for (let n = 0; n < Math.min(2, blitze.length); n++) {
    if (!gluehPool[n]) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 20),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          fog: false,
          uniforms: { farbe: { value: new THREE.Color("#ff8a3a") }, stark: { value: 0 } },
          vertexShader: "varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
          fragmentShader: "varying vec3 vN; varying vec3 vV; uniform vec3 farbe; uniform float stark; void main() { float kern = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); gl_FragColor = vec4(farbe * kern * stark, 1.0); }"
        })
      );
      m.frustumCulled = false;
      m.userData.keinSchatten = true;
      scene.add(m);
      gluehPool[n] = m;
    }
  }
  gluehPool.forEach((m, n) => {
    const b = blitze[n];
    m.visible = !!b;
    if (!b) return;
    const g = gluehen(b.staerke);
    m.position.copy(b.pos);
    m.scale.setScalar(Math.max(0.5, Math.min(b.r * 0.9, 150)));
    m.material.uniforms.farbe.value.set("#ffd9a0").lerp(gluehFarbe.set("#ff4a10"), Math.min(1, (1 - g) * 1.4));
    m.material.uniforms.stark.value = 0.7 * g;
  });
}

function setzeRotoren(grafik, fx, dt) {
  for (const [i, r] of grafik.rotoren) {
    const s = fx.get(i) ?? 0;
    r.winkel += dt * (s > 0.02 ? 6 + 70 * s : 0);
    r.rotor.rotation.y = r.winkel;
    r.scheibe.visible = s > 0.4;
    r.rotor.visible = s <= 0.75;
  }
}

function setzeKlappen(grafik, planX, fx) {
  for (const [i, klappe] of grafik.klappen) {
    const p = planX.parts[i];
    const s = fx.get(i);
    const norm = s === undefined || !p ? 0 : (s - 0.5) * 2;
    klappe.rotation.x = -norm * ((p?.k.winkel ?? 25) * Math.PI) / 180;
  }
}

function aktualisiereSchirme(besitzer, planX, grafik, fx, dt, da) {
  for (const [i, offen] of fx) {
    const p = planX.parts[i];
    const e = grafik.emit.get(i);
    if (!p || p.t !== "fallschirm" || !e) continue;
    const key = besitzer + ":" + i;
    da.add(key);
    const anker = e.obj.localToWorld(e.punkt.clone());
    let s = schirme.get(key);
    if (!s) {
      const start = new THREE.Vector3(0, 1, 0).transformDirection(e.obj.matrixWorld);
      s = { obj: schirmModell(p.k.flaeche ?? 12, p.k.farbe || "#ff6a1a"), vorher: anker.clone(), richtung: start, v: new THREE.Vector3() };
      scene.add(s.obj);
      schirme.set(key, s);
    }
    if (dt > 0) s.v.lerp(anker.clone().sub(s.vorher).divideScalar(dt), Math.min(1, dt * 10));
    s.vorher.copy(anker);
    const soll = s.v.lengthSq() > 1 ? s.v.clone().negate().normalize() : s.richtung.clone();
    soll.y += 0.35;
    s.richtung.lerp(soll.normalize(), Math.min(1, dt * 5)).normalize();
    s.obj.position.copy(anker);
    s.obj.lookAt(anker.clone().add(s.richtung));
    const k = Math.max(0.05, offen);
    s.obj.scale.set(k, k, 0.4 + 0.6 * k);
  }
}

let chatItems = [];

function sprechblase(text) {
  const breite = 560;
  const font = "bold 34px system-ui, sans-serif";
  const messen = document.createElement("canvas").getContext("2d");
  messen.font = font;
  const zeilen = [];
  let zeile = "";
  for (const wort of text.split(/\s+/)) {
    const test = zeile ? `${zeile} ${wort}` : wort;
    if (messen.measureText(test).width > breite - 70 && zeile) {
      zeilen.push(zeile);
      zeile = wort;
    } else zeile = test;
  }
  if (zeile) zeilen.push(zeile);
  const zh = 44, koerper = zeilen.length * zh + 34, hoehe = koerper + 30;
  const c = document.createElement("canvas");
  c.width = breite;
  c.height = hoehe;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.strokeStyle = "rgba(20,30,50,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(8, 6, breite - 16, koerper, 30);
  else ctx.rect(8, 6, breite - 16, koerper);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(breite / 2 - 20, koerper + 3);
  ctx.lineTo(breite / 2, hoehe - 4);
  ctx.lineTo(breite / 2 + 20, koerper + 3);
  ctx.fill();
  ctx.fillStyle = "#101827";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  zeilen.forEach((l, i) => ctx.fillText(l.slice(0, 60), breite / 2, 23 + zh / 2 + i * zh));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.center.set(0.5, 0);
  s.scale.set(3.2, (3.2 * hoehe) / breite, 1);
  s.renderOrder = 10;
  return s;
}

function setzeBlase(figur, item) {
  const jetzt = figur.userData.blaseId || null;
  const soll = item ? item.id : null;
  if (jetzt === soll) return;
  if (figur.userData.blase) {
    figur.remove(figur.userData.blase);
    entsorge(figur.userData.blase);
    figur.userData.blase = null;
  }
  figur.userData.blaseId = soll;
  if (item) {
    const b = sprechblase(String(item.text));
    b.position.set(0, 2.4, 0);
    figur.add(b);
    figur.userData.blase = b;
  }
}

function aktualisiereBlasen() {
  const jetzt = Date.now();
  chatItems = chatItems.filter(i => i.expires > jetzt);
  const neueste = new Map();
  const blockiert = Konto.blockiert();
  for (const i of chatItems) if (!(i.acc && blockiert.has(String(i.acc).toLowerCase()))) neueste.set(String(i.playerId), i);
  setzeBlase(meineFigur, neueste.get(meineId) || null);
  for (const [id, r] of andere) setzeBlase(r.figur, neueste.get(id) || null);
}

const chatProtokoll = document.createElement("ul");
chatProtokoll.id = "chatProtokoll";
chatProtokoll.setAttribute("aria-live", "polite");
chatProtokoll.setAttribute("aria-label", "Chat");
game.append(chatProtokoll);
function chatProtokollNeu(item) {
  if (item.acc && Konto.blockiert().has(String(item.acc).toLowerCase())) return;
  const li = document.createElement("li");
  const punkt = document.createElement("i");
  const sprecher = String(item.playerId) === String(meineId) ? null : andere.get(String(item.playerId));
  punkt.style.background = sprecher ? sprecher.color : spielerFarbe;
  const name = document.createElement("b");
  name.textContent = item.name;
  li.append(punkt, name, document.createTextNode(": " + item.text));
  chatProtokoll.append(li);
  while (chatProtokoll.children.length > 6) chatProtokoll.firstElementChild.remove();
  setTimeout(() => li.classList.add("verblasst"), 12000);
  setTimeout(() => li.remove(), 14000);
}

function chatHinweis() {
  const an = Konto.angemeldet();
  chatInput.readOnly = !an;
  chatInput.classList.toggle("gesperrt", !an);
  chatInput.placeholder = an ? tr("Nachricht (Enter)") : tr("Zum Chatten anmelden");
  if (!an) chatInput.value = "";
  const senden = document.querySelector("#chatForm button[type=submit]");
  if (senden) senden.disabled = !an;
}
chatInput.addEventListener("focus", () => {
  if (!Konto.angemeldet()) {
    chatInput.blur();
    document.body.classList.remove("chat-offen");
    Konto.oeffneKonto();
  }
});
chatHinweis();
setInterval(chatHinweis, 1000);
$("#chatForm").addEventListener("submit", e => {
  e.preventDefault();
  const text = chatInput.value.trim().slice(0, 100);
  if (text && !Konto.angemeldet()) {
    meldung("Zum Chatten musst du angemeldet sein");
    chatInput.blur();
    document.body.classList.remove("chat-offen");
    Konto.oeffneKonto();
    return;
  }
  if (text && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "chat", text }));
  chatInput.value = "";
  chatInput.blur();
  document.body.classList.remove("chat-offen");
});

const WORKER_HOST = "bastelkarre-online.kroxenstudios.workers.dev";
const params = new URLSearchParams(location.search);
let raumId = raumName(params.get("raum")) || raumName((() => { try { return localStorage.getItem("krox-raum"); } catch { return null; } })()) || "r1";
function serverBasis() {
  if (params.get("server")) return params.get("server").replace(/^ws/, "http").replace(/\/ws.*$/, "");
  const eigener = location.host === WORKER_HOST || location.port === "8787";
  return eigener ? `${location.protocol}//${location.host}` : `https://${WORKER_HOST}`;
}
function socketUrl() {
  const basis = serverBasis().replace(/^http/, "ws");
  return `${basis}/ws?room=${encodeURIComponent(raumId)}`;
}
let bewussterWechsel = false;
async function wechsleRaum(id) {
  if (!id || id === raumId) return;
  try {
    const r = await (await fetch(`${serverBasis()}/roominfo?room=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(6000) })).json();
    if (r.count >= r.max) { meldung("Raum voll"); return; }
  } catch {}
  raumId = id;
  try { localStorage.setItem("krox-raum", id); } catch {}
  history.replaceState(null, "", `${location.pathname}?raum=${encodeURIComponent(id)}${location.hash}`);
  chatItems = [];
  if (socket && socket.readyState <= WebSocket.OPEN) {
    bewussterWechsel = true;
    try { socket.close(1000, "raum"); } catch { bewussterWechsel = false; verbinde(); }
  } else {
    verbinde();
  }
  meldung(`${tr("Raum")}: ${raumTitel(id)}`);
}
async function freienRaumWaehlen() {
  try {
    const r = await (await fetch(`${serverBasis()}/roominfo?room=${encodeURIComponent(raumId)}`, { signal: AbortSignal.timeout(6000) })).json();
    if (r.count < r.max) return;
    const alle = (await (await fetch(`${serverBasis()}/rooms`, { signal: AbortSignal.timeout(6000) })).json()).rooms;
    const frei = alle.find(x => x.count < x.max);
    if (frei) { raumId = frei.id; meldung(`${tr("Raum voll")} – ${raumTitel(frei.id)}`); }
  } catch {}
}

let socket = null;
let wiederverbinden = 0;
const andere = new Map();

let spielerListeKey = "";
function zeigeSpielerZahl() {
  const el = document.getElementById("spielerZahl");
  if (!el) return;
  const online = socket?.readyState === WebSocket.OPEN;
  el.hidden = !online;
  el.textContent = `${andere.size + 1}`;
  const liste = document.getElementById("spielerListe");
  if (!liste) return;
  if (!online) { liste.hidden = true; spielerListeKey = ""; return; }
  const freunde = Konto.freunde();
  const meinKonto = Konto.angemeldet() ? String(Konto.benutzer() || "").toLowerCase() : null;
  const eintraege = [{ name: spielerName, color: spielerFarbe, ich: true, acc: meinKonto, freund: false }];
  for (const r of andere.values()) if (r.name) eintraege.push({ name: r.name, color: r.color, ich: false, acc: r.acc || null, freund: !!r.acc && freunde.has(r.acc) });
  const key = JSON.stringify(eintraege);
  if (key === spielerListeKey) return;
  spielerListeKey = key;
  liste.replaceChildren(...eintraege.map(e => {
    const li = document.createElement("li");
    const punkt = document.createElement("i");
    punkt.style.background = e.color;
    const name = document.createElement("b");
    name.textContent = e.name;
    li.append(punkt, name);
    if (e.ich) li.append(document.createTextNode(` (${tr("du")})`));
    if (e.acc) {
      li.className = "klick konto" + (e.freund ? " freund" : "");
      li.title = tr("Profil ansehen");
      li.addEventListener("click", () => oeffneSpielerProfil(e.acc));
    } else if (!e.ich) {
      li.title = tr("Gast ohne Konto");
    }
    return li;
  }));
}

function oeffneSpielerProfil(konto) {
  let dlg = document.getElementById("spielerDialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "spielerDialog";
    const inhalt = document.createElement("div");
    inhalt.className = "kontoInhalt";
    dlg.append(inhalt);
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  const inhalt = dlg.firstElementChild;
  const zu = document.createElement("button");
  zu.type = "button";
  zu.className = "kontoZu";
  zu.textContent = "✕";
  zu.onclick = () => dlg.close();
  const box = document.createElement("div");
  box.className = "kontoBox";
  inhalt.replaceChildren(zu, box);
  if (!dlg.open) dlg.showModal();
  zeigeProfil(box, konto, {
    onLaden: async m => {
      try {
        const d = await Konto.anfrage("POST", `/models/${m.id}/download`);
        planAusKonto(d.data);
        dlg.close();
      } catch (e) { alert(Konto.fehlerText(e.message)); }
    }
  });
}
{
  const z = document.getElementById("spielerZahl"), l = document.getElementById("spielerListe");
  z?.addEventListener("click", () => { if (l) l.hidden = !l.hidden; });
  addEventListener("pointerdown", e => { if (l && !l.hidden && !l.contains(e.target) && e.target !== z) l.hidden = true; });
}

async function verbinde() {
  if (!socket && !params.has("offline")) await freienRaumWaehlen();
  if (params.has("offline")) {
    statusEl.textContent = tr("Offline");
    statusEl.dataset.state = "offline";
    return;
  }
  try {
    socket = new WebSocket(socketUrl());
  } catch {
    return;
  }
  statusEl.textContent = tr("Verbinde …");
  delete statusEl.dataset.state;

  const sock = socket;
  sock.addEventListener("open", async () => {
    wiederverbinden = 0;
    statusEl.textContent = tr("Online");
    statusEl.dataset.state = "online";
    zeigeSpielerZahl();
    const ticket = await Konto.ticket();
    if (sock.readyState !== WebSocket.OPEN) return;
    sock.send(JSON.stringify({ type: "join", name: spielerName, color: spielerFarbe, look: spielerLook, fh: autoHash, ...(hausWahlV >= 0 ? { hv: hausWahlV } : {}), ...(hausWahlV === HAUS_EIGEN && meinHausDoc ? { hd: meinHausDoc } : {}), ...(ticket ? { ticket } : {}) }));
    sendePlan();
  });
  socket.addEventListener("message", e => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    empfange(m);
  });
  const weg = ev => {
    if (ev?.code === 1013) { location.reload(); return; }
    if (bewussterWechsel) {
      bewussterWechsel = false;
      wiederverbinden = 0;
      for (const id of [...andere.keys()]) entferneAnderen(id);
      zeigeSpielerZahl();
      verbinde();
      return;
    }
    statusEl.textContent = tr("Offline – du kannst trotzdem bauen und fahren");
    statusEl.dataset.state = "offline";
    wartet = false;
    $("#wartePanel").hidden = true;
    npcs?.stop();
    for (const id of [...andere.keys()]) entferneAnderen(id);
    zeigeSpielerZahl();
    if (wiederverbinden++ < 20) setTimeout(verbinde, Math.min(30000, 3000 * wiederverbinden));
  };
  socket.addEventListener("close", weg);
}

function empfange(m) {
  switch (m.type) {
    case "lot":   // der server setzt einen angemeldeten spieler auf sein noch stehendes haus um
    case "welcome": {
      if (m.type === "welcome") meineId = String(m.id);
      const neu = Number(m.lot) || 0;
      if (neu !== meinLot) {
        meinLot = neu;
        setzeBauZiel();
        baueBauansicht();
        if (modus === "fahr") erzeugeEigenes();
      }
      $("#lotNr").textContent = `P${meinLot + 1}`;
      aktualisiereSchilder();
      break;
    }
    case "schluessel":   // der server gibt dem besitzer den code seines hauses: das ist sein hausschlüssel
      if (m.art === "haus" && typeof m.code === "string" && m.code) {
        INV.setzeHausschluessel(Math.max(0, Math.min(39, Number(m.lot) || 0)), m.code.replace(/[^a-z0-9]/g, "").slice(0, 16));
        meldung("Hausschlüssel im Inventar");
      }
      break;
    case "kiste":
      kisteWarte?.(m);
      break;
    case "hausDoc": {   // das dokument eines selbstgebauten hauses (der server hat es geprüft, wir prüfen noch einmal)
      const d = bereinigeHaus(m.doc);
      if (d) HAEUSER.setzeDoc(Math.max(0, Math.min(39, Number(m.lot) || 0)), d);
      break;
    }
    case "hausDocs":
      for (const e of Array.isArray(m.docs) ? m.docs : []) {
        const d = bereinigeHaus(e?.doc);
        if (d) HAEUSER.setzeDoc(Math.max(0, Math.min(39, Number(e.lot) || 0)), d);
      }
      break;
    case "plans":
      for (const e of m.list || []) setzePlanAnderer(String(e.id), e.dv, e.plan);
      break;
    case "plan":
      setzePlanAnderer(String(m.id), m.dv, m.plan);
      break;
    case "state": {
      if (m.hs) {
        HAEUSER.setze(m.hs);
        // das eigene haus ist (noch) da oder nicht mehr: der bauort wechselt zwischen haus und großem parkplatz
        if (ortHaus(meinLot) !== letzterOrtHaus) wechsleBauort();
      }
      const da = new Set();
      for (const p of m.players || []) {
        const id = String(p.id);
        if (id === meineId && p.ph === 1) serverZustand(p);
        if (id === meineId || npcs?.ids().includes(id)) continue;
        da.add(id);
        aktualisiereAnderen(id, p);
      }
      for (const id of [...andere.keys()]) if (!da.has(id)) entferneAnderen(id);
      chatItems = Array.isArray(m.chat) ? m.chat : chatItems;
      fightZustand.fb = Array.isArray(m.fb) ? m.fb : [];
      fightZustand.pt = m.pt && typeof m.pt === "object" ? m.pt : {};
      KR.verarbeite(m);
      aktualisiereFight();
      aktualisiereSchilder();
      zeigeSpielerZahl();
      break;
    }
    case "warteStand":
      if (m.karte < 0) break;
      if (wartet) zeigeWarte(m);
      break;
    case "match":
      if (wartet) matchStart(m);
      break;
    case "chat":
      if (m.item) { chatItems.push(m.item); chatProtokollNeu(m.item); }
      break;
    case "nameGeaendert":
      meldung(`„${m.wunsch}“ ${tr("gehört einem registrierten Konto. Du heißt hier „Gast“ – melde dich an oder wähle im Konto einen anderen Namen.")}`, 7000);
      break;
    case "chatStumm":
      meldung("Du bist vom Moderator stummgeschaltet");
      break;
    case "chatNurKonto":
      meldung("Zum Chatten musst du angemeldet sein");
      break;
    case "leave":
      entferneAnderen(String(m.id));
      zeigeSpielerZahl();
      break;
  }
}

let planTimer = null;
function sendePlanBald() {
  clearTimeout(planTimer);
  planTimer = setTimeout(sendePlan, 400);
}
function sendePlan() {
  if (socket?.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "plan", plan: JSON.stringify(BAU.kompakt(plan)) }));
}

let letztePose = 0;
const r3 = v => Math.round(v * 1000) / 1000;
function sendePose(sofort = false) {
  if (socket?.readyState !== WebSocket.OPEN) return;
  const jetzt = performance.now();
  const takt = modus === "fahr" ? 50 : 1000;
  if (!sofort && jetzt - letztePose < takt) return;
  letztePose = jetzt;
  const msg = { type: "pose", m: modus, s: spawnZaehler, b: [], w: [], fx: [], g: [], sp: [] };
  if (modus === "fahr" && meinFahrzeug) {
    if (meinFahrzeug.serverModus) {
      msg.ph = 1;
      msg.st = meinFahrzeug.serverStart;
      msg.pl = fightAktiv() ? fightKarte : -1;
      msg.vb = verbrauchAn;
      msg.ts = Math.round(jetzt);
      const t0 = meinFahrzeug.bodies[0]?.rb.translation();
      if (t0) {
        serverAbbild.verlauf.push({ t: msg.ts, x: t0.x, y: t0.y, z: t0.z });
        if (serverAbbild.verlauf.length > 90) serverAbbild.verlauf.shift();
      }
      if (istFahrer()) {
        const e = mitSitzRechten(eingabe());
        msg.in = [r3(e.gas), r3(e.lenk), e.bremse ? 1 : 0, [...e.tasten].filter(t => typeof t === "string" && t.length <= 12).slice(0, 24), r3(e.achsen?.nick || 0), r3(e.achsen?.roll || 0), !!meinFahrzeug.motorAn, ichSitz.i];
      }
    } else {
      for (const b of meinFahrzeug.bodies) {
        const t = b.rb.translation(), q = b.rb.rotation();
        msg.b.push([r3(t.x), r3(t.y), r3(t.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)]);
      }
      for (const z of letzterRadZustand) msg.w.push(z.teil, r3(z.feder), r3(z.lenk), r3(z.dreh % 1000));
      for (const [i, s] of meinFahrzeug.fx) msg.fx.push([i, r3(s * 10)]);
      meinFahrzeug.gelenke.forEach((g, i) => { if (!g.aktiv) msg.g.push(i); });
    }
    msg.sp = meinFahrzeug.sprengReihe;
    msg.fm = meinFahrzeug.kampf;
    if (msg.fm) {
      const f = alleKarten()[fightKarte]?.erzeuge();
      if (f) msg.kb = [fightKarte, ...f.basen.flatMap(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10])];
    }
    if (!meinFahrzeug.serverModus) msg.sh = [meinFahrzeug.schussZaehler, ...meinFahrzeug.schussReihe];
    msg.zs = [...meinFahrzeug.zerstoert];
  }
  if (modus === "fahr") {
    if (fussRb) msg.f = [r3(meineFigur.position.x), r3(meineFigur.position.y), r3(meineFigur.position.z), r3(meineFigur.rotation.y)];
    if (ichSitz) msg.sit = [idVon(ichSitz.o), ichSitz.i];
    if (ichSitz && ichSitz.o !== "ich") {
      const pl = besitzerGrafik(ichSitz.o)?.plan;
      if (pl && sitzRechte(pl, ichSitz.i)?.fremd) {
        const e = filtereEingabe(eingabe(), pl, ichSitz.i);
        msg.ei = [r3(e.gas), r3(e.lenk), e.bremse ? 1 : 0, [...e.tasten].filter(t => typeof t === "string" && t.length <= 12).slice(0, 24), r3(e.achsen?.nick || 0), r3(e.achsen?.roll || 0)];
      }
    }
  }
  let sig = "";
  if (!sofort && modus === "fahr" && meinFahrzeug) {
    const t0 = meinFahrzeug.bodies[0]?.rb.translation(), q0 = meinFahrzeug.bodies[0]?.rb.rotation();
    const ts = msg.ts;
    msg.ts = 0;
    sig = JSON.stringify(msg) + (t0 ? `${Math.round(t0.x * 20)},${Math.round(t0.y * 20)},${Math.round(t0.z * 20)},${Math.round(q0.y * 100)},${Math.round(q0.w * 100)}` : "");
    msg.ts = ts;
    if (sig === letzteSig && jetzt - letzteSendung < 500) return;
  }
  letzteSig = sig;
  letzteSendung = jetzt;
  socket.send(JSON.stringify(msg));
}
let letzteSig = "", letzteSendung = 0;
setInterval(() => {
  if (socket?.readyState === WebSocket.OPEN && performance.now() - letzteSendung > 8000) socket.send(JSON.stringify({ type: "ping" }));
}, 10000);
addEventListener("pagehide", () => { try { socket?.close(1000, "pagehide"); } catch {} });

function anderer(id) {
  let r = andere.get(id);
  if (!r) {
    r = { id, name: "", color: "#7bb7ff", look: lookAus(null), lot: 0, m: "bau", s: -1, dv: -1, plan: null, grafik: null, kin: null, puffer: [], neu: true, fx: new Map() };
    r.figur = spielfigur(r.color, r.look);
    r.figur.scale.setScalar(0.62);
    scene.add(r.figur);
    andere.set(id, r);
  }
  return r;
}

function setzePlanAnderer(id, dv, text) {
  const r = anderer(id);
  if (dv === r.dv) return;
  r.dv = dv;
  r.planText = text;
  parsePlanAnderer(r);
}

function parsePlanAnderer(r) {
  try {
    r.plan = BAU.bereinige(JSON.parse(r.planText), { admin: r.acc === BAU.ADMIN_NAME });
  } catch {
    r.plan = null;
  }
  r.neu = true;
}

function aktualisiereAnderen(id, p) {
  const r = anderer(id);
  const altAcc = r.acc;
  r.acc = typeof p.acc === "string" ? p.acc : null;
  r.fh = typeof p.fh === "string" ? p.fh : "";   // hash des autoschlüssels seines fahrzeugs
  if (r.planText && (r.acc === BAU.ADMIN_NAME) !== (altAcc === BAU.ADMIN_NAME)) parsePlanAnderer(r);
  const name = String(p.name || "Spieler").slice(0, 20);
  const tag = typeof p.tg === "string" ? p.tg : "";
  if (name !== r.name || tag !== r.tag) {
    r.name = name;
    r.tag = tag;
    if (r.label) { r.figur.remove(r.label); entsorge(r.label); }
    r.label = namensSprite(name, tag);
    r.label.position.set(0, 2.0, 0);
    r.figur.add(r.label);
  }
  const look = lookAus(p.look);
  const neueFarbe = /^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : r.color;
  if (neueFarbe !== r.color || JSON.stringify(look) !== JSON.stringify(r.look)) {
    r.color = neueFarbe;
    r.look = look;
    figurAktualisieren(r.figur, r.color, r.look);
  }
  const lot = Number(p.lot) || 0;
  if (lot !== r.lot || p.m !== r.m || p.s !== r.s) {
    r.lot = lot;
    r.m = p.m === "fahr" ? "fahr" : "bau";
    r.s = p.s;
    r.puffer = [];
    r.fPuffer = [];
    r.neu = true;
  }
  r.npc = p.npc === 1;
  r.sit = Array.isArray(p.sit) ? [String(p.sit[0]), Number(p.sit[1])] : null;
  r.ei = Array.isArray(p.ei) ? p.ei : null;
  if (r.m === "fahr" && Array.isArray(p.f) && p.f.length === 4) {
    (r.fPuffer ||= []).push({ t: performance.now(), f: p.f });
    if (r.fPuffer.length > 30) r.fPuffer.shift();
  }
  if (r.m === "fahr" && Array.isArray(p.b) && p.b.length) {
    r.spZiel = Array.isArray(p.sp) ? p.sp.filter(Number.isInteger).slice(0, 4096) : [];
    r.fm = p.fm === true;
    r.shL = Array.isArray(p.sh) ? p.sh : [];
    r.zsL = Array.isArray(p.zs) ? p.zs.filter(Number.isInteger) : [];
    r.puffer.push({ t: performance.now(), b: p.b, w: p.w || [], fx: p.fx || [] });
    if (r.puffer.length > 30) r.puffer.shift();
  }
}

function baueAnderen(r) {
  r.neu = false;
  entferneGrafik(r.grafik);
  if (r.kin) PH.entferneFahrzeug(world, r.kin);
  r.grafik = null;
  r.kin = null;
  r.spN = 0;
  r.shN = undefined;
  const steh = figurStand(r.lot, HAEUSER.hat(r.lot));
  r.angebunden = null;
  if (!r.plan || !r.plan.parts.length) {
    setzeFigurInSitz(r.figur, null, steh);
    return;
  }
  const fahr = r.m === "fahr";
  const lift = fahr ? BAU.bodenAbstand(r.plan, BAU.RAD_TIEFE) : BAU.bodenAbstand(r.plan);
  const basis = lotBasis(r.lot, lift);
  r.grafik = fahrzeugGrafik(r.plan);
  for (const g of r.grafik.groups) scene.add(g);
  stelleAuf(r.grafik, basis);
  r.kin = PH.erzeugeFahrzeug(RAPIER, world, r.plan, { basis: basis.toArray(), kinematisch: true, spielerId: r.id });
  setzeFigurInSitz(r.figur, null, steh);
}

function entferneAnderen(id) {
  const r = andere.get(id);
  if (!r) return;
  entferneGrafik(r.grafik);
  if (r.kin) PH.entferneFahrzeug(world, r.kin);
  setzeBlase(r.figur, null);
  r.figur.removeFromParent();
  entsorge(r.figur);
  andere.delete(id);
}

function bewegeFigurAnderer(r, jetzt, dt) {
  if (r.m !== "fahr") return;
  let ziel = null;
  if (r.sit) {
    const g = besitzerGrafik(r.sit[0]);
    ziel = g?.sitze.find(s => s.index === r.sit[1])?.obj || null;
  }
  if (ziel) {
    if (r.angebunden !== ziel) {
      figurAnSitz(r.figur, ziel);
      r.angebunden = ziel;
    }
    return;
  }
  const buf = r.fPuffer;
  if (!buf || !buf.length) return;
  if (r.angebunden !== "fuss") {
    figurFrei(r.figur);
    r.angebunden = "fuss";
  }
  const zeit = jetzt - 130;
  let von = buf[0], bis = buf[0];
  for (const s of buf) {
    if (s.t <= zeit) von = bis = s;
    else { bis = s; break; }
  }
  const k = bis !== von ? THREE.MathUtils.clamp((zeit - von.t) / (bis.t - von.t), 0, 1) : 0;
  const px = r.figur.position.x, pz = r.figur.position.z;
  r.figur.position.set(
    von.f[0] + (bis.f[0] - von.f[0]) * k,
    von.f[1] + (bis.f[1] - von.f[1]) * k,
    von.f[2] + (bis.f[2] - von.f[2]) * k
  );
  let d = bis.f[3] - r.figur.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.figur.rotation.y += d * Math.min(1, dt * 12);
  gehAnim(r.figur, dt > 0 ? Math.hypot(r.figur.position.x - px, r.figur.position.z - pz) / dt : 0);
}

function serverZustand(p) {
  const v = meinFahrzeug;
  if (!v?.serverModus) return;
  if (p.px?.abgelehnt || p.px?.fehler) {
    serverVerbot = true;
    meldung("Server-Physik nicht verfügbar: dein Fahrzeug wird lokal berechnet");
    erzeugeEigenes();
    return;
  }
  if (!Array.isArray(p.b) || !p.b.length) return;
  const a = serverAbbild;
  a.puffer = [1];
  const px = p.px || {};
  if (Number.isFinite(px.ts)) {
    const h = a.verlauf.find(e => e.t === px.ts);
    const s = p.b[0];
    if (h && s) {
      const ex = s[0] - h.x, ey = s[1] - h.y, ez = s[2] - h.z;
      const fehler = Math.hypot(ex, ey, ez);
      const tempo = Math.abs(PH.tempo(v));
      const spiel = 1.5 + 0.12 * tempo;
      if (fehler > 8 + 0.5 * tempo) {
        const alt = v.bodies[0].rb.translation();
        a.versatz.x += alt.x - s[0]; a.versatz.y += alt.y - s[1]; a.versatz.z += alt.z - s[2];
        a.zug = null;
        v.bodies.forEach((k, i) => {
          const q = p.b[i];
          if (!q) return;
          k.rb.setTranslation({ x: q[0], y: q[1], z: q[2] }, true);
          k.rb.setRotation({ x: q[3], y: q[4], z: q[5], w: q[6] }, true);
          k.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          k.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
        });
        a.verlauf.length = 0;
      } else if (fehler > spiel) {
        const f = 1 - spiel / fehler;
        a.zug = { x: ex * f, y: ey * f, z: ez * f };
      } else a.zug = null;
    }
  }
  if (Array.isArray(p.g)) for (const i of p.g) if (v.gelenke[i]) v.gelenke[i].aktiv = false;
  const sp = Array.isArray(p.sp) ? p.sp : [];
  const eigene = new Set();
  const reihe = v.sprengReihe;
  for (let k = 0; k + 1 < reihe.length; k += 2 + reihe[k + 1]) eigene.add(reihe.slice(k, k + 2 + reihe[k + 1]).join(","));
  while (a.spN + 1 < sp.length) {
    const i = sp[a.spN], anzahl = sp[a.spN + 1];
    if (a.spN + 2 + anzahl > sp.length) break;
    const liste = sp.slice(a.spN + 2, a.spN + 2 + anzahl);
    const zeichen = sp.slice(a.spN, a.spN + 2 + anzahl).join(",");
    a.spN += 2 + anzahl;
    if (eigene.has(zeichen) || a.angewendet.has(zeichen)) continue;
    a.angewendet.add(zeichen);
    if (plan.parts[i] && liste.every(n => plan.parts[n])) {
      PH.sprenge(v, i, liste);
      pflegeTrennungen(v, meineGrafik);
      const ort = v.sprengPos.get(i);
      const typ = plan.parts[i].t;
      if (ort && ["explosive", "tank", "verschluss", "munition"].includes(typ)) {
        if (typ === "explosive") TON.explosion(plan.parts[i].k.reichweite ?? 3, camera.position.distanceTo(tmpV.set(ort[0], ort[1], ort[2])));
        else knall(ort, PH.sprengReichweite(plan.parts[i]) * 0.6);
      }
    }
  }
  for (const i of p.zs || []) if (Number.isInteger(i) && plan.parts[i]) v.zerstoert.add(i);
}

function serverAbgleichen() {
  const a = serverAbbild;
  if (!a.puffer.length && meinFahrzeug && performance.now() - a.start > 3000) {
    serverVerbot = true;
    meldung("Server-Physik nicht verfügbar: dein Fahrzeug wird lokal berechnet");
    erzeugeEigenes();
  }
}

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
function bewegeAndere(jetzt, dt) {
  for (const r of andere.values()) {
    if (r.neu) baueAnderen(r);
    bewegeFigurAnderer(r, jetzt, dt);
    if (!r.grafik || r.m !== "fahr" || !r.puffer.length) continue;
    if (r.kin && r.spZiel) {
      r.spN = r.spN || 0;
      while (r.spN + 1 < r.spZiel.length) {
        const i = r.spZiel[r.spN], anzahl = r.spZiel[r.spN + 1];
        if (r.spN + 2 + anzahl > r.spZiel.length) break;
        const liste = r.spZiel.slice(r.spN + 2, r.spN + 2 + anzahl);
        r.spN += 2 + anzahl;
        if (r.plan?.parts[i] && liste.every(n => r.plan.parts[n])) {
          PH.sprenge(r.kin, i, liste);
          pflegeTrennungen(r.kin, r.grafik);
          const typ = r.plan.parts[i].t;
          const ort = r.kin.sprengPos.get(i);
          const sprengend = ["explosive", "tank", "verschluss", "munition"].includes(typ);
          if (sprengend && ort) {
            if (typ === "explosive") TON.explosion(r.plan.parts[i].k.reichweite ?? 3, camera.position.distanceTo(tmpV.set(ort[0], ort[1], ort[2])));
            else knall(ort, PH.sprengReichweite(r.plan.parts[i]) * 0.6);
            if (r.fm && meinFahrzeug?.kampf) { meinFahrzeug.letzterTaeter = r.id; meinFahrzeug.taeterZeit = Date.now(); PH.explosionSchaden(meinFahrzeug, ort, PH.sprengReichweite(r.plan.parts[i])); }
            if (r.fm) for (const v of npcs?.fahrzeuge() || []) PH.explosionSchaden(v, ort, PH.sprengReichweite(r.plan.parts[i]));
          }
        }
      }
    }
    if (r.kin && r.fm && r.shL?.length) {
      const n = r.shL[0], l = r.shL.slice(1);
      const anzahl = Math.floor(l.length / 7);
      const neuAnz = r.shN === undefined ? 0 : Math.max(0, Math.min(n - r.shN, anzahl));
      for (let j = anzahl - neuAnz; j < anzahl; j++) {
        PH.feuere(r.kin, l.slice(j * 7, j * 7 + 3), l.slice(j * 7 + 3, j * 7 + 6), l[j * 7 + 6] % 1000, Math.min(3, Math.floor(l[j * 7 + 6] / 1000)));
      }
      r.shN = n;
    }
    if (r.kin && r.zsL) for (const i of r.zsL) { r.kin.zerstoert.add(i); markiereZerstoert(r.grafik, i); }
    const zeit = jetzt - 130;
    let von = r.puffer[0], bis = r.puffer[0];
    for (const s of r.puffer) {
      if (s.t <= zeit) von = bis = s;
      else { bis = s; break; }
    }
    const k = bis !== von ? THREE.MathUtils.clamp((zeit - von.t) / (bis.t - von.t), 0, 1) : 0;
    const n = Math.min(r.grafik.groups.length, bis.b.length);
    for (let i = 0; i < n; i++) {
      const a = von.b[i] || bis.b[i], b = bis.b[i];
      const g = r.grafik.groups[i];
      g.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      qa.set(a[3], a[4], a[5], a[6]).normalize();
      qb.set(b[3], b[4], b[5], b[6]).normalize();
      g.quaternion.copy(qa.slerp(qb, k));
      const kb = r.kin?.bodies[i]?.rb;
      if (kb) {
        kb.setNextKinematicTranslation(g.position);
        kb.setNextKinematicRotation(g.quaternion);
      }
    }
    const w = bis.w;
    const zust = [];
    for (let i = 0; i + 3 < w.length; i += 4) zust.push({ teil: w[i], feder: w[i + 1], lenk: w[i + 2], dreh: w[i + 3] });
    setzeRaeder(r.grafik, zust);
    r.fx = new Map(bis.fx.map(([i, s]) => [i, s / 10]));
    if (r.plan) setzeKlappen(r.grafik, r.plan, r.fx);
    setzeRotoren(r.grafik, r.fx, dt);
    animiereSensoren(r.grafik, performance.now() / 1000, null);
  }
}

function aktualisiereSchilder() {
  const namen = new Map();
  namen.set(meinLot, spielerName);
  for (const r of andere.values()) namen.set(r.lot, r.name);
  lotSchilder.forEach((s, i) => {
    const name = namen.get(i) || "";
    if (s.name === name) return;
    s.name = name;
    const pos = s.schild.position.clone();
    scene.remove(s.schild);
    entsorge(s.schild);
    s.schild = textSprite(name ? `P${i + 1} · ${name}` : `P${i + 1} · ${tr("frei")}`, {
      skala: 2.6,
      bg: i === meinLot ? "rgba(200,120,20,0.95)" : "rgba(20,60,160,0.92)"
    });
    s.schild.position.copy(pos);
    scene.add(s.schild);
  });
}

let letzteZeit = 0;
let akku = 0;
let letzterRadZustand = [];

const SPUR_MAX = 700;
const spurPos = new Float32Array(SPUR_MAX * 4 * 3);
const spurGeo = new THREE.BufferGeometry();
spurGeo.setAttribute("position", new THREE.BufferAttribute(spurPos, 3).setUsage(THREE.DynamicDrawUsage));
{
  const idx = [];
  for (let i = 0; i < SPUR_MAX; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); }
  spurGeo.setIndex(idx);
}
const spurMesh = new THREE.Mesh(spurGeo, new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
}));
spurMesh.frustumCulled = false;
spurMesh.renderOrder = 1;
scene.add(spurMesh);
let spurNext = 0;
const spurLetzte = new Map();

function zeichneSpuren(zustand) {
  const aktiv = new Set();
  for (const z of zustand) {
    const s = z.spur;
    if (!s) continue;
    aktiv.add(z.teil);
    const alt = spurLetzte.get(z.teil);
    if (!alt) { spurLetzte.set(z.teil, s.p); continue; }
    const d = [s.p[0] - alt[0], s.p[1] - alt[1], s.p[2] - alt[2]];
    const len = Math.hypot(...d);
    if (len > 2) { spurLetzte.set(z.teil, s.p); continue; }
    if (len < 0.05) continue;
    spurLetzte.set(z.teil, s.p);
    let q = [s.n[1] * d[2] - s.n[2] * d[1], s.n[2] * d[0] - s.n[0] * d[2], s.n[0] * d[1] - s.n[1] * d[0]];
    const ql = Math.hypot(...q) || 1;
    const hb = 0.11 + 0.06 * s.t;
    q = q.map(v => (v / ql) * hb);
    const o = 0.025, b = spurNext * 12;
    const ecken = [
      [alt[0] - q[0], alt[1] - q[1], alt[2] - q[2]], [alt[0] + q[0], alt[1] + q[1], alt[2] + q[2]],
      [s.p[0] - q[0], s.p[1] - q[1], s.p[2] - q[2]], [s.p[0] + q[0], s.p[1] + q[1], s.p[2] + q[2]]
    ];
    ecken.forEach((e, k) => {
      spurPos[b + k * 3] = e[0] + s.n[0] * o;
      spurPos[b + k * 3 + 1] = e[1] + s.n[1] * o;
      spurPos[b + k * 3 + 2] = e[2] + s.n[2] * o;
    });
    spurNext = (spurNext + 1) % SPUR_MAX;
    spurGeo.attributes.position.needsUpdate = true;
  }
  for (const k of [...spurLetzte.keys()]) if (!aktiv.has(k)) spurLetzte.delete(k);
}
const tmpQ = new THREE.Quaternion();

function rundlauf() {
  const ref = meinFahrzeug ? PH.sitzKoerper(meinFahrzeug)?.rb : fussRb;
  if (!ref) return;
  const t = ref.translation();
  const v = meer.wrapVerschiebung(t.x, t.z);
  if (!v) return;
  const [dx, dz] = v;
  const schiebe = rb => { const p = rb.translation(); rb.setTranslation({ x: p.x + dx, y: p.y, z: p.z + dz }, true); };
  if (meinFahrzeug) for (const b of meinFahrzeug.bodies) schiebe(b.rb);
  if (fussRb) schiebe(fussRb);
  for (const k of [fahrKamera.pos, fahrKamera.blick, camera.position]) { k.x += dx; k.z += dz; }
  spurLetzte.clear();
  meldung("Weltrand: du tauchst auf der anderen Seite auf");
}

function schleife(zeit) {
  requestAnimationFrame(schleife);
  const dt = letzteZeit ? Math.min((zeit - letzteZeit) / 1000, 0.05) : 0;
  letzteZeit = zeit;

  if (hausEditor?.aktiv()) {
    hausEditor.frame(dt);
    return;
  }
  if (kartenEditor?.aktiv()) {
    kartenEditor.frame(dt);
    return;
  }
  if (weltEditor?.aktiv()) {   // dev-kamera: der editor setzt die kamera, die welt wird normal gezeichnet
    weltEditor.frame(dt);
    renderer.render(scene, camera);
    return;
  }

  bewegeAndere(zeit, dt);

  akku += dt;
  let schritte = 0;
  pollGamepad();
  zielenAktualisieren(dt);
  KR.aktualisiere(dt, zeit / 1000);
  const ein = modus === "fahr"
    ? gesamtEingabe()
    : null;
  if (modus === "fahr") {
    pflegeSitz();
    steuereFuss();
  }
  if (meinFahrzeug?.serverModus) serverAbgleichen();
  while (akku >= PH.PHYSIK_TAKT && schritte < 4) {
    if (meinFahrzeug?.serverModus) serverZug();
    if (meinFahrzeug) {
      PH.schritt(world, meinFahrzeug, ein, PH.PHYSIK_TAKT);
      PH.heliumKraefte(meinFahrzeug, PH.PHYSIK_TAKT);
      if (meer) PH.wasserKraefte(meinFahrzeug, WASSER_Y, PH.PHYSIK_TAKT);
    }
    if (meer && fussRb && fussRb.translation().y < WASSER_Y - 0.3) fussRb.applyImpulse({ x: 0, y: 70 * 9.81 * 1.15 * PH.PHYSIK_TAKT, z: 0 }, true);
    if (npcs?.aktiv) npcs.schritt(PH.PHYSIK_TAKT);
    PH.bewegeGeschosse(world, PH.PHYSIK_TAKT, modus === "fahr" ? [meinFahrzeug, ...(npcs?.fahrzeuge() || [])] : null);
    world.step();
    akku -= PH.PHYSIK_TAKT;
    schritte++;
  }
  if (meer) {
    meer.aktualisiere(camera, zeit);
    if (modus === "fahr" && !meinFahrzeug?.serverModus) rundlauf();
  }
  pflegeTrennungen(meinFahrzeug, meineGrafik);
  pflegeTod(dt);
  if (npcs) { npcs.nachSchritt(dt); zeigeNpcs(); }
  zeigeGeschosse(dt);
  if (meinFahrzeug && meineGrafik) {
    for (const [i, st] of meinFahrzeug.sprengung) {
      if (st.knall) continue;
      st.knall = true;
      const ort = meinFahrzeug.sprengPos.get(i);
      if (!ort) continue;
      if (plan.parts[i]?.t === "explosive") TON.explosion(plan.parts[i].k.reichweite ?? 3, camera.position.distanceTo(tmpV.set(ort[0], ort[1], ort[2])));
      else knall(ort, PH.sprengReichweite(plan.parts[i]) * 0.6);
    }
    for (const i of meinFahrzeug.zerstoert) markiereZerstoert(meineGrafik, i);
  }
  if (schritte && modus === "fahr") {
    plan.parts.forEach((p, i) => {
      if (p.t === "kamera" && angetippt.has(p.k.taste)) aktiveKamera = aktiveKamera === i ? null : i;
    });
    // türen, klappen, truhen und briefkästen: taste e, auf touch der knopf unten rechts (hausKnopf)
    if (angetippt.has("e")) interagiere();
  }
  HAEUSER.aktualisiere(dt);
  {
    const nah = modus === "fahr" && fussRb && !ichSitz && !fightAktiv() ? HAEUSER.naechstesZiel(fussRb.translation()) : null;
    if (hausKnopf.hidden === !!nah) hausKnopf.hidden = !nah;
    if (nah) {
      const text = nah.art === "tuer" ? (nah.block.ziel ? "Tür schließen (E)" : nah.block.innen ? "Innentür öffnen (E)" : hatHausSchluessel(nah.lot) ? "Tür aufschließen (E)" : "Tür: abgeschlossen")
        : nah.art === "leiter" ? "Leiter besteigen (E)" : nah.art === "klappe" ? "Klappe öffnen / schließen (E)" : nah.art === "truhe" ? "Truhe öffnen (E)" : "Briefkasten öffnen (E)";
      if (hausKnopf.dataset.t !== text) { hausKnopf.dataset.t = text; hausKnopf.textContent = tr(text); }
    }
    if (!nah && INV_UI.kisteOffen()) INV_UI.schliesse();   // zu weit von der truhe weg
  }
  if (schritte) angetippt.clear();
  if (modus === "fahr") {
    aktualisiereFuss(dt);
    const txt = tr(ichSitz ? "Aussteigen (X)" : "Einsteigen (X)");
    const knopfText = $("#btnAus .txt");
    if (knopfText.textContent !== txt) knopfText.textContent = txt;
  }
  if (schritte === 4) akku = 0;

  for (const p of pylonen) {
    p.mesh.position.copy(p.rb.translation());
    p.mesh.quaternion.copy(p.rb.rotation());
  }

  if (modus === "fahr" && meinFahrzeug) {
    const vs = serverAbbild.versatz;
    const abkl = Math.exp(-dt / 0.2);
    vs.x *= abkl; vs.y *= abkl; vs.z *= abkl;
    meinFahrzeug.bodies.forEach((b, i) => {
      const g = meineGrafik.groups[i];
      g.position.copy(b.rb.translation());
      g.position.x += vs.x; g.position.y += vs.y; g.position.z += vs.z;
      g.quaternion.copy(b.rb.rotation());
    });
    letzterRadZustand = PH.radZustand(meinFahrzeug, dt);
    setzeRaeder(meineGrafik, letzterRadZustand);
    zeichneSpuren(letzterRadZustand);
    setzeKlappen(meineGrafik, plan, meinFahrzeug.fx);
    setzeRotoren(meineGrafik, meinFahrzeug.fx, dt);

    const sb = PH.sitzKoerper(meinFahrzeug);
    const kmh = Math.abs(PH.tempo(meinFahrzeug)) * 3.6;
    const hoehe = sb ? sb.rb.translation().y : 0;
    const ts = PH.tankStand(meinFahrzeug, Math.max(0, meinFahrzeug.ana.sitzBody));
    const tankText = ts.aktiv ? ` · ${ts.kap <= 0 ? tr("Kein Tank verbunden") : ts.menge <= 0.01 ? tr("Tank leer") : `${tr("Tank")} ${Math.round((ts.menge / ts.kap) * 100)}%`}` : "";
    const tb = document.getElementById("tankBalken");
    if (tb) tb.style.width = `${ts.kap ? (ts.menge / ts.kap) * 100 : 0}%`;
    const muni = meinFahrzeug.munition.size
      ? " · " + [...PH.munitionStand(meinFahrzeug)].map(([name, n]) => `${name}: ${n}`).join(", ")
      : "";
    const ps = plan.parts.some(p => p.t === "motor") ? ` · ${PH.motorPS(meinFahrzeug)} PS` : "";
    const masseText = ` · ${Math.round(PH.fahrzeugMasse(meinFahrzeug))} kg`;
    $("#tacho").textContent = `${kmh.toFixed(0)} km/h · ${Math.round(hoehe)} m${masseText}${ps}${tankText}${muni}${PH.gravFaktor(hoehe) < 0.02 ? " · " + tr("schwerelos") : ""}${meinFahrzeug.motorAn ? "" : " · " + tr("Motor aus")}`;
    if (sb && sb.rb.translation().y < -30) neuStarten();

    const sensorZeit = performance.now() / 1000;
    const sensorWerte = messeSensoren({ RAPIER, world, veh: meinFahrzeug, grafik: meineGrafik, koerper: sb?.rb, dt, andere, bodenHoehe });
    animiereSensoren(meineGrafik, sensorZeit, sensorWerte?.norm);
    sensorHud.zeige(istFahrer() ? sensorWerte : null, sensorZeit);

    const balken = document.getElementById("treibstoffBalken");
    if (balken) {
      let summe = 0, max = 0;
      plan.parts.forEach((p, i) => {
        if (p.t !== "rakete") return;
        const st = meinFahrzeug.raketen.get(i);
        summe += st ? st.treibstoff : p.k.dauer;
        max += p.k.dauer;
      });
      balken.style.width = `${max ? (summe / max) * 100 : 0}%`;
    }
    if (!!ichSitz !== egoFahrer) { egoFahrer = !!ichSitz; egoBlick.yaw = 0; egoBlick.pitch = 0; }
    if (istFahrer()) kameraFahr(dt);
    else kameraFuss();
    kameraVonTeil();
    meineFigur.visible = !(ansicht === 2 && aktiveKamera === null);
  } else {
    sensorHud.aus();
    begrenzeBauZiel();
    meineFigur.visible = true;
    const k = bauKamera;
    const s = dt * k.dist * 0.6;
    const vor = new THREE.Vector3(-Math.sin(k.yaw), 0, -Math.cos(k.yaw));
    const rechts = new THREE.Vector3(Math.cos(k.yaw), 0, -Math.sin(k.yaw));
    if (!tippt()) {
      if (gedrueckt.has("w") || gedrueckt.has("arrowup")) k.ziel.addScaledVector(vor, s);
      if (gedrueckt.has("s") || gedrueckt.has("arrowdown")) k.ziel.addScaledVector(vor, -s);
      if (gedrueckt.has("d") || gedrueckt.has("arrowright")) k.ziel.addScaledVector(rechts, s);
      if (gedrueckt.has("a") || gedrueckt.has("arrowleft")) k.ziel.addScaledVector(rechts, -s);
    }
    if (MENUE.offen()) menueKamera(zeit);
    kameraBau();
    aktualisiereGeist();
  }

  aktualisiereVorschau(performance.now() / 1000);
  aktualisiereNamen(performance.now() / 1000);
  scene.updateMatrixWorld();

  if (meinFahrzeug && meineGrafik) emitEffekte("ich", plan, meineGrafik, meinFahrzeug.fx, dt);
  for (const r of andere.values()) {
    if (r.m === "fahr" && r.grafik && r.plan) emitEffekte(r.id, r.plan, r.grafik, r.fx, dt);
  }
  rauch.update(dt);
  feuer.update(dt);
  const schirmeDa = new Set();
  if (meinFahrzeug && meineGrafik) aktualisiereSchirme("ich", plan, meineGrafik, meinFahrzeug.fx, dt, schirmeDa);
  for (const r of andere.values()) {
    if (r.m === "fahr" && r.grafik && r.plan) aktualisiereSchirme(r.id, r.plan, r.grafik, r.fx, dt, schirmeDa);
  }
  for (const [key, s] of schirme) {
    if (!schirmeDa.has(key)) {
      scene.remove(s.obj);
      schirme.delete(key);
    }
  }

  const fokus = modus === "fahr" ? fahrKamera.blick : bauKamera.ziel;
  const fokusY = Number.isFinite(fokus.y) ? fokus.y : 0;
  sonne.target.position.set(fokus.x, fokusY, fokus.z);
  sonne.position.set(fokus.x - 18, fokusY + 34, fokus.z + 14);

  aktualisiereBlasen();
  sendePose();
  aktualisiereLichter();
  aktualisiereHimmel(zeit);
  if (meer) meer.nachHimmel(camera, scene, sonne.position.clone().sub(sonne.target.position));
  const kameraRuhig = camera.position.clone();
  if (kameraRuck > 0.002) {
    camera.position.x += zuf(kameraRuck * 2);
    camera.position.y += zuf(kameraRuck * 2);
    camera.position.z += zuf(kameraRuck * 2);
    kameraRuck *= Math.exp(-dt * 9);
  } else {
    kameraRuck = 0;
  }
  aktualisiereZiel();
  renderer.render(scene, camera);
  camera.position.copy(kameraRuhig);
}

function kameraFahr(dt) {
  if (ansicht === 2) return kameraEgoFahrzeug();
  const anderer = ichSitz && ichSitz.o === "ich" && ichSitz.i !== meinFahrzeug.ana.sitz ? sitzObjekt(ichSitz) : null;
  const sitzKoerperIdx = anderer ? meinFahrzeug.ana.bodyOf[ichSitz.i] : undefined;
  const b = (sitzKoerperIdx !== undefined && meinFahrzeug.bodies[sitzKoerperIdx]) || PH.sitzKoerper(meinFahrzeug);
  if (!b) return;
  const pos = b.rb.translation();
  const rot = b.rb.rotation();
  const vor = new THREE.Vector3(...meinFahrzeug.vorwaerts).applyQuaternion(tmpQ.set(rot.x, rot.y, rot.z, rot.w));
  if (Math.hypot(vor.x, vor.z) > 0.2) {
    const zielYaw = Math.atan2(-vor.x, -vor.z);
    let d = zielYaw - fahrKamera.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    fahrKamera.yaw += d * Math.min(1, dt * 3.5);
  }
  if (performance.now() - fahrKamera.zuletztGezogen > 2500) {
    fahrKamera.yawOffset *= Math.exp(-dt * 2);
  }
  let schirm = 0;
  for (const [i, s] of meinFahrzeug.fx) if (plan.parts[i]?.t === "fallschirm") schirm = Math.max(schirm, s);
  fahrKamera.schirm = (fahrKamera.schirm || 0) + (schirm - (fahrKamera.schirm || 0)) * Math.min(1, dt * 3);
  const dist = (ansicht === 1 ? 4.2 : fahrKamera.dist) + fahrKamera.schirm * 5;
  const yaw = fahrKamera.yaw + fahrKamera.yawOffset;
  const p = fahrKamera.pitch + fahrKamera.schirm * 0.6;
  const blick = new THREE.Vector3(pos.x, pos.y + 0.9, pos.z);
  if (anderer) {
    anderer.obj.updateWorldMatrix(true, false);
    anderer.obj.getWorldPosition(blick);
    blick.y += 0.9;
  }
  fahrKamera.blick.lerp(blick, fahrKamera.blick.lengthSq() ? Math.min(1, dt * 12) : 1);
  const soll = new THREE.Vector3(
    fahrKamera.blick.x + Math.sin(yaw) * Math.cos(p) * dist,
    Math.max(0.4, fahrKamera.blick.y + Math.sin(p) * dist),
    fahrKamera.blick.z + Math.cos(yaw) * Math.cos(p) * dist
  );
  soll.y = Math.max(soll.y, bodenHoehe(soll.x, soll.z) + 0.6);
  if (!fahrKamera.pos.lengthSq()) fahrKamera.pos.copy(soll);
  fahrKamera.pos.lerp(soll, Math.min(1, dt * 8));
  camera.position.copy(fahrKamera.pos);
  camera.position.y = Math.max(camera.position.y, bodenHoehe(camera.position.x, camera.position.z) + 0.5);
  camera.lookAt(fahrKamera.blick);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  for (const p of [rauch, feuer]) p.setzeSkala(innerHeight * renderer.getPixelRatio(), camera.fov);
});
for (const p of [rauch, feuer]) p.setzeSkala(innerHeight * renderer.getPixelRatio(), fov);

const istEingabe = el => !!(el && el.closest && el.closest("input, textarea, select"));
addEventListener("contextmenu", e => { if (!istEingabe(e.target)) e.preventDefault(); });
document.addEventListener("selectstart", e => {
  const el = e.target.nodeType === 1 ? e.target : e.target.parentElement;
  if (!istEingabe(el)) e.preventDefault();
});
setBtn("#btnModus", "▶", tr("Losfahren"));
setBtn("#btnAus", "⇄", tr("Einsteigen (X)"));
$("#btnAnsicht").title = $("#btnAnsicht").ariaLabel = tr("Ansicht umschalten (C)");
$("#langBtn").innerHTML = EN ? "DE | <b>EN</b>" : "<b>DE</b> | EN";
$("#langBtn").onclick = () => window.WG && WG.set(EN ? "de" : "en");
if (window.ResizeObserver) {
  new ResizeObserver(() => document.documentElement.style.setProperty("--bar", `${$("#baupanel").offsetHeight || 0}px`)).observe($("#baupanel"));
}
$("#chatToggle").onclick = () => {
  const offen = document.body.classList.toggle("chat-offen");
  if (offen) chatInput.focus();
  else chatInput.blur();
  $("#chatToggle").blur();
};
$("#chatForm").addEventListener("focusout", e => {
  if (e.relatedTarget && $("#chatForm").contains(e.relatedTarget)) return;
  setTimeout(() => { if (!$("#chatForm").contains(document.activeElement)) document.body.classList.remove("chat-offen"); }, 0);
});

{
  const menuBtn = $("#menuBtn"), menu = $("#hud");
  const setzeMenu = offen => {
    menu.hidden = !offen;
    menuBtn.setAttribute("aria-expanded", String(offen));
  };
  menuBtn.onclick = e => { e.stopPropagation(); setzeMenu(menu.hidden); menuBtn.blur(); };
  document.addEventListener("pointerdown", e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) setzeMenu(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) setzeMenu(false); });
  menu.addEventListener("click", e => { if (e.target.closest("#kontoBtn, #raumBtn, #coinsBtn")) setzeMenu(false); });
}
$("#lotNr").textContent = `P${meinLot + 1}`;
document.body.classList.add("bau");
baueBauansicht();
aktualisiereSchilder();
verbinde();
Konto.start({ getPlan: () => BAU.kompakt(plan), setPlan: planAusKonto, paketWarnung });
{
  let geprueft = false;
  const pruefen = () => {
    if (geprueft || (Konto.angemeldet() && Konto.stand.coins === null)) return;
    geprueft = true;
    const r = BAU.paketFilter(plan, Konto.stand.owned, istAdminKonto);
    if (!r.fehlend.length) return;
    plan = r.plan;
    planGeaendert();
    paketWarnung(r.fehlend);
  };
  window.addEventListener("krox-stand", pruefen);
  pruefen();
}
startRaeume({ httpBasis: serverBasis(), aktuell: () => raumId, wechseln: wechsleRaum });
{
  const warnung = Konto.warnungText();
  if (warnung) meldung(warnung, 12000);
}
startModelle();
startShop();
window.addEventListener("krox-stand", () => baueFarben());
startKarten({
  waehle: (dok, id, name) => { if (waehleEigene(dok, id, name)) { setzeSpielModus("fight"); return true; } return false; },
  bearbeite: (dok, herkunft) => oeffneKartenEditor(dok, herkunft),
  aktuelleKarte: () => ({ eigeneId, dok: alleKarten()[fightKarte]?.dokument?.() || null })
});
ladeOffizielleKarten();

// hauptmenü: beim start links über der szene vor dem eigenen haus (menue.js)
let letzterOrtHaus = false;
// bau- und fahrzeugort neu setzen (nach dem knopf oder wenn das haus erscheint): kamera, bauansicht, figur
function wechsleBauort() {
  letzterOrtHaus = ortHaus(meinLot);
  setzeBauZiel();
  baueBauansicht();
  if (modus === "fahr") erzeugeEigenes();
}
const MENUE = startMenue({
  L: (de, en) => (window.WG ? WG.L(de, en) : de),
  konto: Konto,
  aktionen: {
    spielen: () => $("#btnSpielen").click(),
    einstellungen: () => $("#menuBtn").click(),
    shop: () => $("#btnShop")?.click(),
    hangar: () => document.getElementById("modelleBtn")?.click(),
    haus: () => HAUSWAHL.oeffne(),
    hausBauen: () => oeffneHausEditor(),
    istAdmin: () => Konto.istAdmin(),
    weltEditor: () => oeffneWeltEditor(),
    konto: () => $("#kontoBtn")?.click(),
    hilfe: () => HILFE.oeffne(),
    beimSchliessen: () => { bauKamera.yaw = 0.75; bauKamera.pitch = 0.55; setzeBauZiel(); baueBauansicht(); }
  }
});
window.addEventListener("krox-stand", () => MENUE.aktualisiereLogin());
// esc führt ins hauptmenü, wenn es sonst nichts zu schließen gibt: ein offenes panel (einstellungen, hausauswahl, kiste, dialog) schließt sich selbst,
// danach hat sich der stand geändert und das menü bleibt zu. die editoren behandeln esc selbst (abbrechen, sonst schließen sie sich und rufen das menü)
// welt-editor (nur das admin-konto): fliegende dev-kamera in der echten welt, grundstücke und assets setzen, speichern auf dem konten-server
let weltEditor = null;
function oeffneWeltEditor() {
  if (!Konto.istAdmin()) return meldung("Nur das Konto KroxenStudios darf die Welt bearbeiten");
  if (!WELTDATEN) return meldung("Ohne Gelände (welt.json) gibt es keinen Welt-Editor");
  if (modus === "fahr") wechsleModus();
  MENUE.schliesse();
  $("#hud").hidden = true;
  weltEditor ||= erzeugeWeltEditor({
    scene, camera, renderer,
    schnittstelle: {
      hoehe: (x, z) => bodenHoehe(x, z),
      start: () => { const p = hausPos(meinLot); return { x: p.x, y: p.y, z: p.z }; },
      speichern: async w => { await Konto.anfrage("PUT", "/admin/world", { data: w }); },
      baueAssets: assets => {
        if (weltAssetGruppe) scene.remove(weltAssetGruppe);
        weltAssetGruppe = assets.length ? baueWeltAssets(scene, assets, bodenHoehe) : null;
        return weltAssetGruppe;
      },
      hauptmenue: () => oeffneHauptmenue()
    }
  });
  weltEditor.oeffne(WELT);
}
function oeffneHauptmenue() {
  weltEditor?.schliesse();
  hausEditor?.schliesse();
  kartenEditor?.schliesse();
  $("#hud").hidden = true;
  MENUE.oeffne();
}
addEventListener("keydown", e => {
  if (e.key !== "Escape" || e.repeat || tippt()) return;
  if (e.target?.closest?.("input, textarea, select")) return;
  const stand = () => [MENUE.offen(), !$("#hud").hidden, HAUSWAHL.offen(), hausEditor?.aktiv(), kartenEditor?.aktiv(), weltEditor?.aktiv(), INV_UI.kisteOffen(), !!document.querySelector("[role=dialog].an")].join();
  const vorher = stand();
  setTimeout(() => { if (stand() === vorher && !MENUE.offen() && !hausEditor?.aktiv() && !kartenEditor?.aktiv() && !weltEditor?.aktiv()) oeffneHauptmenue(); }, 0);
}, true);
{
  const b = document.createElement("button");
  b.type = "button";
  b.id = "btnHauptmenue";
  b.textContent = tr("Hauptmenü");
  b.onclick = () => { $("#hud").hidden = true; MENUE.oeffne(); };
  $("#hud").prepend(b);
}
// kamera des menüs: auf das eigene haus, das haus steht rechts im bild, die kamera schwingt leicht
function menueKamera(zeit) {
  const hp = hausPos(meinLot);
  bauKamera.ziel.set(hp.x - 1.6, hp.y + 1.0, hp.z + 1);
  bauKamera.pitch = 0.2;
  bauKamera.dist = 10;
  bauKamera.yaw = MENUE.schwank(zeit / 1000);
}
requestAnimationFrame(schleife);

// der download-hinweis ist nur fuer die web-version gedacht
if (window.JUNKWING_DESKTOP) document.getElementById("appLink")?.remove();

if (/^https?:$/.test(location.protocol) && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  const pixel = new Image();
  pixel.referrerPolicy = "no-referrer";
  pixel.src = `https://kroxenstudios.goatcounter.com/count?p=${encodeURIComponent("/bastelkarre")}&t=Junkwing&rnd=${Math.random().toString(36).slice(2)}`;
}

window.bastelkarre = { bodenHoehe, weltDaten: () => WELTDATEN, leiterPos: () => meineGrafik.leitern.map(o => o.getWorldPosition(new THREE.Vector3()).toArray()), setzeFuss: (x, y, z) => fussRb && fussRb.setTranslation({ x, y, z }, true), lichter: () => lichtPool.map(l => +l.intensity.toFixed(0)), oeffneInspector, klickSitz, maus, treffer: () => { raycaster.setFromCamera(maus, camera); const out = []; const gs = [meineGrafik, ...[...andere.values()].map(r => r.grafik)].filter(Boolean); for (const g of gs) for (const h of raycaster.intersectObjects(g.groups, true).slice(0, 3)) out.push([h.object.userData.teil, +h.distance.toFixed(1), h.object.type]); return out; }, fussKamera: fuss, sitzPixel: (o, i) => {
    const s = sitzObjekt({ o, i });
    if (!s) return null;
    const v = s.obj.localToWorld(new THREE.Vector3(0, -0.1, 0.1)).project(camera);
    const r = canvas.getBoundingClientRect();
    return [((v.x + 1) / 2) * r.width + r.left, ((1 - v.y) / 2) * r.height + r.top, v.z];
  }, planGeaendert, sitz: () => ichSitz, fuss: () => fussRb && fussRb.translation(), ausEinsteigen, plan: () => plan, modus: () => modus, wechsleModus, setzeIchSitz, kameraPos: () => camera.position.toArray(), sitzPos: (o, i) => sitzObjekt({ o, i })?.obj.getWorldPosition(new THREE.Vector3()).toArray(), fahrzeug: () => meinFahrzeug, gedrueckt, andere };

{
  const fp = document.querySelector("#fahrpanel");
  const kopf = fp.querySelector(".kopf");
  const setze = zu => {
    fp.classList.toggle("zu", zu);
    kopf.setAttribute("aria-expanded", String(!zu));
    try { localStorage.setItem("bk_steuerung_zu", zu ? "1" : "0"); } catch {}
  };
  kopf.tabIndex = 0;
  kopf.setAttribute("role", "button");
  kopf.addEventListener("click", () => setze(!fp.classList.contains("zu")));
  kopf.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kopf.click(); } });
  let gemerkt = false;
  try { gemerkt = localStorage.getItem("bk_steuerung_zu") === "1"; } catch {}
  setze(gemerkt);
}
