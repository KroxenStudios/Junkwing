# Haus-Format (`junkwing-haus`, Version 1)

Ein Haus ist eine JSON-Datei (`*.bkhaus.json`). Der Haus-Editor (Hauptmenü → „Haus bauen“) schreibt und liest sie; du kannst sie auch von Hand bearbeiten.
Jede Datei wird beim Laden bereinigt (`bereinigeHaus` in `hausformat.js`, dieselbe Funktion im Editor, im Spiel und auf dem Server): Unbrauchbares fliegt raus, Zahlen werden begrenzt, Quader werden neu zusammengefasst.
Ein Beispiel steht in `beispiel.bkhaus.json`.

## Maße
Alles in **Blöcken zu 0,5 m**. Das Haus steht in der Mitte des Grundstücks. Raster: `x` 0 … masse[0]-1, `z` 0 … masse[1]-1, `y` 0 … masse[2]-1.
Grenzen: 26 × 20 × 12 Blöcke (13 × 10 × 6 m), höchstens 700 Quader, 9000 Blöcke, 16 Materialien, 40 Teile, 100 Objekte, Datei bis 60 000 Zeichen.

## Felder
| Feld | Bedeutung |
|---|---|
| `format`, `v` | immer `"junkwing-haus"` und `1` |
| `name` | Anzeigename, höchstens 30 Zeichen |
| `masse` | `[breite x, tiefe z, höhe y]` in Blöcken |
| `material` | `[{ "id": 1, "farbe": "#e8dfd0", "textur": "putz" }, …]`; Blöcke verweisen nur auf die `id`, ändert man ein Material, ändert sich jeder Block damit |
| `boden` | Material-ID einer 4-cm-Bodenplatte über der Grundfläche der Blöcke, `0` = keine |
| `quader` | die **sichtbare Wand**: `[x0, y0, z0, x1, y1, z1, material]`, Ende exklusiv. Kanonisch: gleiche Blöcke ergeben immer dieselbe Liste |
| `hitbox` | die **feste Kollision**, getrennt von der Wand (siehe unten) |
| `teile` | Türen, Klappen, Geheimwände |
| `objekte` | Einrichtung |

Texturen: `glatt`, `putz`, `ziegel`, `holz`, `stein`, `fliesen`, `beton`, `parkett`, `metall` und `glas` (durchsichtig, wirft keinen Schatten; die Farbe tönt es). Die Textur ist ein helles Muster, die Farbe des Materials färbt es ein.

## Wand und Hitbox sind getrennt
```json
"hitbox": { "auto": true, "quader": [] }
```
* `auto: true` (Standard): die Kollision folgt den Wänden. Der Editor baut beides in einem Zug.
* `auto: false`: es gilt nur die Liste `quader` (`[x0, y0, z0, x1, y1, z1]`, ohne Material). So lassen sich Wände ohne Kollision, niedrigere oder dünnere Hitboxen und unsichtbare Barrieren bauen. Im Editor: Rechte Leiste → „Bearbeiten“ → „Hitbox“.

Die Öffnungen von Türen, Klappen und Geheimwänden gelten immer für beide Listen.

## Teile
```json
{ "t": "tuer", "x": 9, "y": 0, "z": 15, "a": 0, "h": 1, "haus": true, "m": 2 }
```
* `t`: `tuer` (2 × 3 Blöcke), `klappe` (1 × 1), `geheim` (2 × 3, hat alle 12 s für 3 s keine Hitbox).
* `a`: `0` = die Wand läuft entlang x, `1` = entlang z. `(x, y, z)` ist die untere linke Zelle.
* `h`: `1` oder `-1`, die Seite der Angel. `m`: Material des Türblatts.
* `haus: true`: die **Haustür**, nur mit Hausschlüssel zu öffnen (höchstens eine). Alle anderen Türen sind Innentüren ohne Schloss.
* Beim Laden werden die Blöcke in den Feldern eines Teils entfernt: das ist die Öffnung.

## Objekte
```json
{ "a": "sofa", "x": 6.5, "y": 0, "z": 4, "r": 0 }
```
`a` ist ein Asset (`sofa`, `tisch`, `stuhl`, `bett`, `regal`, `herd`, `schreibtisch`, `lampe`, `pflanze`, `truhe`, `esstisch`, `kommode`, `kuehlschrank`, `kamin`, `klavier`, `wanne`, `schrank`, `fernseher`, `bild`, `teppich`).
`x`, `z` in Blöcken (halbe Schritte), `y` in Blöcken über dem Boden, `r` Drehung in 90°-Schritten. Die **erste `truhe`** ist die Kiste des Hauses (Gegenstände ablegen).

## Wie ein Haus ins Spiel kommt
Editor → „Als mein Haus verwenden“ (oder Hauptmenü → „Haus wählen“ → dein Haus). Der Server prüft die Datei mit derselben Funktion und schickt sie allen im Raum; das Haus bleibt wie jedes Haus 10 Minuten stehen, wenn du angemeldet gehst.
