# Mitgelieferte und nachgeladene Bibliotheken

Fremde Bestandteile behalten ihre eigenen Lizenzen. Die hier genannten erlauben
die Nutzung **auch kommerziell**, ohne Gebühr; Bedingung ist, dass der
Lizenz-Hinweis beim Weitergeben erhalten bleibt.

| Wo | Bibliothek | Lizenz | Wie eingebunden |
|---|---|---|---|
| PDF einlesen (KI-Scan, Import) | PDF.js 3.11.174, Mozilla Foundation | Apache License 2.0 | beim Gebrauch von cdnjs (Cloudflare) geladen, nicht im Depot |
| QR-Codes in der App | qrcode-generator, Kazuhiko Arase | MIT | eingebettet in `index.html`, Lizenz-Kopf erhalten |
| Fehlersuche (nur auf Wunsch) | Eruda 3, liriliri | MIT | beim Gebrauch von jsDelivr geladen |

**PDF erzeugen und drucken** (Rezeptkarten, Menüplan, Einkaufsliste) läuft über
die Druckfunktion des Browsers („Als PDF speichern"). Dafür wird keine fremde
Bibliothek mitgeliefert, und es braucht keine Lizenz: das PDF-Format ist eine
offene Norm (ISO 32000). Der EPUB-Export ist eigener Code.

Lizenztexte: <https://www.apache.org/licenses/LICENSE-2.0> · <https://opensource.org/license/mit/>
