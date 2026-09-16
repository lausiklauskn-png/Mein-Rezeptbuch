/* Probe: Kategorien umbenennen + Emoji-Auswahl + fremde Kategorien sichtbar.
   Uebertragen aus Mein Mixarium (2026-09-15). Gemessen wird im ECHTEN
   Browser an der GEBAUTEN index.html — eine Probe, die nur den Quelltext
   liest, misst nicht, ob die Seite laeuft. */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

const WURZEL = process.cwd();
const TYP = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".json":"application/json",
              ".css":"text/css", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg" };
let gruen = 0, rot = 0;
const ok = (t,b)=>{ if(b){gruen++;console.log("  ✓ "+t);} else {rot++;console.log("  ✗ ROT — "+t);} };

const server = createServer((q,a)=>{
  const pfad = join(WURZEL, decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,"") || "index.html");
  if(!existsSync(pfad)||!pfad.startsWith(WURZEL)){a.writeHead(404);a.end();return;}
  a.writeHead(200,{"content-type":TYP[extname(pfad)]||"application/octet-stream"});
  a.end(readFileSync(pfad));
});
await new Promise(r=>server.listen(0,r));
const port = server.address().port;

/* „sushi" und „salat" kennt dieses Buch NICHT — genau der Fall, der bisher
   still verschwand. „fleisch" ist eine echte eigene Kategorie. */
const BESTAND = [
  { id:1, name:"Gulasch",       cat:"fleisch", shut:true, ings:[], steps:[] },
  { id:2, name:"Maki-Rolle",    cat:"sushi",   shut:true, ings:[], steps:[] },
  { id:3, name:"Gurkensalat",   cat:"salat",   shut:true, ings:[], steps:[] },
  /* ⚠ ZWEI HEIMATLOSE: der erste hat GAR KEINE Kategorie, der zweite zeigt
     auf einen Ordner, den es nicht gibt. Beide waren bisher nur ueber die
     Suche zu finden — genau Klaus' Sushi-Befund vom 2026-09-16. */
  { id:4, name:"Heimatlos-Ohne", cat:"", shut:true, ings:[], steps:[] },
  { id:5, name:"Heimatlos-Ordner", cat:"fld_999", shut:true, ings:[], steps:[] },
  { id:6, name:"Mitgebracht-Bekannt", cat:"afckt", shut:true, ings:[], steps:[] },
];

const browser = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--no-sandbox"] });

/* ⚠ EINE PROBE, DIE WIRFT, IST ROT — NICHT EIN TOTER LAUF (2026-09-16).
   Ohne diesen Fang starb die Probe bei einem null-Zugriff oder einem
   `page.click`-Timeout OHNE Schlusszeile. Die Gegenprobe urteilt an den roten
   Zeilen und an der Schlusszeile; fehlt beides, kann sie nur „ROT AUS FALSCHEM
   GRUND" sagen — und der Fall, der sauber zugeschlagen hat, sieht aus wie ein
   Fehler im Werkzeug. Gemessen an zwei Faellen desselben Tages, beide von Hand
   nachgestellt. (Sages Laeufer kennt dieselbe Regel; hier gibt es keinen
   Laeufer, also steht sie in der Probe selbst.)
   Kein `process.exit()` — das verwirft den stdout-Puffer, und dann waeren die
   roten Zeilen genau in dem Fall weg, in dem man sie am noetigsten braucht. */
let _abgestuerzt=false;
async function _schlussNachAbsturz(e){
  if(_abgestuerzt)return; _abgestuerzt=true;
  rot++;
  console.log("  ✗ ROT — die Probe ist abgestuerzt: "+String((e&&e.message)||e).split("\n")[0]);
  try{ await browser.close(); }catch(_){}
  try{ server.close(); }catch(_){}
  console.log(`\n${gruen} grün · ${rot} ROT`);
  process.exitCode=1;
}
process.on("unhandledRejection",_schlussNachAbsturz);
process.on("uncaughtException",_schlussNachAbsturz);
const seite = await browser.newPage();
let seitenfehler = [];
seite.on("pageerror", e => seitenfehler.push(String(e)));
await seite.addInitScript(b=>{ localStorage.setItem("mrz9m", JSON.stringify(b)); localStorage.setItem("mlang9m","de"); }, BESTAND);
await seite.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil:"domcontentloaded" });
await seite.waitForFunction(()=>typeof catsAlle==="function" && typeof R!=="undefined" && Array.isArray(R), null, {timeout:25000});
await seite.waitForFunction(()=>document.querySelectorAll("#catNav .cpill").length>0, null, {timeout:25000});

console.log("\n── 0 · Die Seite läuft ohne Fehler ──");
ok("kein Seitenfehler beim Laden" + (seitenfehler.length?" — "+seitenfehler[0].slice(0,90):""), seitenfehler.length===0);

console.log("\n── 1 · Fremde Kategorien bekommen einen Reiter ──");
const reiter = await seite.evaluate(()=>[...document.querySelectorAll("#catNav .cpill")].map(e=>e.textContent.trim()));
ok("ein Reiter trägt „sushi“", reiter.some(t=>/sushi/i.test(t)));
ok("ein Reiter trägt „salat“", reiter.some(t=>/salat/i.test(t)));

console.log("\n── 2 · Sie werden auch gezeichnet ──");
const alle = await seite.evaluate(()=>{ CAT="all"; render(); return document.getElementById("rcont").textContent; });
ok("„Alle“ zeigt die Maki-Rolle", /Maki-Rolle/.test(alle));
ok("„Alle“ zeigt den Gurkensalat", /Gurkensalat/.test(alle));
ok("„Alle“ zeigt weiterhin das Gulasch", /Gulasch/.test(alle));

console.log("\n── 3 · Umbenennen wirkt, die Kennung bleibt ──");
await seite.evaluate(()=>{ CATS_EIGEN={ sushi:{name:"Japanisch",ico:"🍣"} }; svCatsEigen(); renderCatNav(); });
const nach = await seite.evaluate(()=>[...document.querySelectorAll("#catNav .cpill")].map(e=>e.textContent.trim()));
ok("der Reiter heisst „Japanisch“", nach.some(t=>/Japanisch/.test(t)));
ok("das eigene Symbol steht davor", nach.some(t=>t.includes("🍣")));
ok("r.cat bleibt 'sushi'", await seite.evaluate(()=>R.find(r=>r.name==="Maki-Rolle").cat==="sushi"));
ok("das Rezept steht im umbenannten Reiter", await seite.evaluate(()=>{
   CAT="sushi"; render(); return document.getElementById("rcont").textContent.includes("Maki-Rolle"); }));

console.log("\n── 4 · Der Dialog ──");
await seite.evaluate(()=>{ CATS_EIGEN={}; svCatsEigen(); openKatUmbenennen(); });
ok("er steht da", await seite.locator("#katRenameOv").count()===1);
ok("er listet jede Kategorie, auch die mitgebrachten",
   await seite.locator("#katRenameOv .kat-row").count() === await seite.evaluate(()=>catsAlle().length));
ok("die mitgebrachten sind gekennzeichnet", await seite.locator("#katRenameOv .kat-fremd").count()>=2);

console.log("\n── 5 · Emoji-Auswahl ──");
ok("das Raster ist zu, solange niemand tippt",
   await seite.evaluate(()=>document.getElementById("katEmojiRaster").hidden===true));
/* ⚠ EINE PROBE, DIE ABSTUERZT STATT ZU MELDEN, ZEIGT AUF DEN BOTEN.
   Fehlt die Zeile „sushi", wartete `page.click` dreissig Sekunden und warf —
   die Probe starb ohne Schlusszeile, und die Gegenprobe meldete „ROT AUS
   FALSCHEM GRUND" statt der gebrochenen Zusicherung. Dass die mitgebrachte
   Kategorie ueberhaupt da ist, ist selbst ein BEFUND und gehoert als roter
   Haken gemeldet, nicht als Absturz. */
const sushiZeile = await seite.locator('#katRenameOv .kat-row[data-kid="sushi"] .kat-ico').count();
ok("die mitgebrachte Kategorie „sushi\u201c hat eine Zeile im Dialog", sushiZeile===1);
if(sushiZeile===1) await seite.click('#katRenameOv .kat-row[data-kid="sushi"] .kat-ico');
console.log("    [messung] " + await seite.evaluate(()=>JSON.stringify({
  raster: document.querySelectorAll("#katEmojiRaster").length,
  overlays: document.querySelectorAll("#katRenameOv").length,
  hidden: document.getElementById("katEmojiRaster")?.hidden,
  ziel: typeof _katZiel === "undefined" ? "undef" : (_katZiel ? _katZiel.parentElement.dataset.kid : null)
})));
ok("ein Tipp aufs Symbol-Feld öffnet es",
   await seite.evaluate(()=>document.getElementById("katEmojiRaster").hidden===false));
/* ⚠ HIER STAND „… und es steht direkt unter der bearbeiteten Zeile".
   DIESE ZUSICHERUNG GILT NICHT MEHR, und sie ist nicht still getauscht:
   Klaus hat am 2026-09-15 gemeldet, die Auswahl sei „nicht vollkommen
   aufgeklappt". Gemessen im Browser war sie **12 px hoch** statt 598 px
   Inhalt — `.kat-list` ist ein Flex-Container, und ein Kind mit
   `overflow-y:auto` bekommt dort die Mindesthoehe 0. Der alte Waechter war
   dabei GRUEN: er fragte, WO das Raster haengt, nie WIE HOCH es ist.
   Ein Waechter auf die Lage misst nicht die Sichtbarkeit. */
ok("… und es steht AUSSERHALB der scrollenden Liste", await seite.evaluate(()=>{
   const r=document.getElementById("katEmojiRaster");
   return !r.closest(".kat-list") && !!r.closest(".kat-box"); }));
ok("… und es ist wirklich aufgeklappt (mehrere ganze Reihen hoch)", await seite.evaluate(()=>{
   const r=document.getElementById("katEmojiRaster").getBoundingClientRect();
   const k=document.querySelector("#katEmojiRaster .kat-emoji").getBoundingClientRect();
   /* ⚠ OHNE `k.height > 0` IST DIESER WAECHTER BLIND. Legt man das Gitter
      auf `display:none`, hat auch der Knopf keine Box — und `hoehe >= 3*0`
      ist IMMER wahr. Gefangen hat das die Gegenprobe, nicht das Nachdenken. */
   if(!(k.height > 0)) return false;
   /* Gemessen gegen die KNOPFHOEHE, nicht gegen eine genagelte Zahl: die
      Hoehe haengt am Schirm, eine feste Zahl waere auf dem naechsten Geraet
      falsch. Drei Reihen sind die Untergrenze. */
   return r.height >= 3 * k.height; }));
/* ⚠ DER WAECHTER AUF DIE URSACHE. Zweimal ist an derselben Stelle dasselbe
   passiert: `scrollIntoView` und das Schrumpfen der Liste haben beide die
   angetippte Zeile unter dem Finger wegbewegt — der danach folgende `click`
   landete woanders, und die Auswahl schloss sich sofort wieder. Ein
   Verhaltens-Waechter allein faengt das nur manchmal. */
ok("… und beim Oeffnen bewegt sich die angetippte Zeile NICHT", await seite.evaluate(()=>{
   katEmojiSchliessen();
   const feld=document.querySelector('#katRenameOv .kat-row[data-kid="sushi"] .kat-ico');
   const vorher=feld.getBoundingClientRect();
   katEmojiOeffnen(feld);
   const nachher=feld.getBoundingClientRect();
   return Math.abs(vorher.top-nachher.top) < 1 && Math.abs(vorher.left-nachher.left) < 1; }));
ok("… und der ganze Dialog passt dabei noch auf den Schirm", await seite.evaluate(()=>{
   const b=document.querySelector("#katRenameOv .kat-box").getBoundingClientRect();
   const r=document.getElementById("katEmojiRaster").getBoundingClientRect();
   return b.top >= 0 && b.bottom <= innerHeight && r.bottom <= innerHeight; }));
/* ⚠ EIN WAECHTER AUF „passt auf den Schirm" REICHT NICHT: ein Raster, das
   den ganzen Dialog verdeckt, passt auch auf den Schirm. Gemessen wird die
   UEBERLAPPUNG mit dem Speichern-Knopf — ein Knopf, den man sieht und der
   nichts tut, ist die schlimmere Sorte toter Knopf. */
ok("… und es verdeckt den Speichern-Knopf nicht", await seite.evaluate(()=>{
   const r=document.getElementById("katEmojiRaster").getBoundingClientRect();
   const b=document.querySelector("#katRenameOv .share-btn-p").getBoundingClientRect();
   return r.bottom <= b.top + 1 || r.top >= b.bottom - 1
       || r.right <= b.left + 1 || r.left >= b.right - 1; }));
ok("… die bearbeitete Zeile ist markiert", await seite.evaluate(()=>{
   const m=document.querySelectorAll("#katRenameOv .kat-row-aktiv");
   return m.length === 1 && m[0].dataset.kid === "sushi"; }));
ok("… und die Kopfzeile nennt sie beim Namen", await seite.evaluate(()=>{
   const kopf=document.getElementById("katEmojiKopf").textContent||"";
   const z=document.querySelector('#katRenameOv .kat-row[data-kid="sushi"] .kat-name');
   return kopf.length > 0 && kopf.includes(z.value||z.placeholder); }));
ok("es bietet eine Auswahl an", await seite.locator("#katEmojiRaster .kat-emoji").count()>=40);
await seite.evaluate(()=>[...document.querySelectorAll("#katEmojiRaster .kat-emoji")].find(b=>b.textContent==="🍣").click());
ok("ein Tipp aufs Emoji schreibt es ins Feld",
   await seite.inputValue('#katRenameOv .kat-row[data-kid="sushi"] .kat-ico')==="🍣");
ok("… und schliesst das Raster", await seite.evaluate(()=>document.getElementById("katEmojiRaster").hidden===true));
ok("… und gibt der Liste ihren Platz zurueck", await seite.evaluate(()=>
   !document.querySelector("#katRenameOv .kat-box").classList.contains("emoji-auf")
   && document.querySelectorAll("#katRenameOv .kat-row-aktiv").length === 0));

/* ⚠ EIN WAECHTER AUF DIE URSACHE, nicht nur aufs Verhalten. Der Wächter
   darüber („öffnet es") war FLATTERHAFT: `scrollIntoView` verschob die Liste
   zwischen focus und click, der Klick landete woanders, und der
   „Tipp-daneben"-Riegel schloss sofort. Gemessen: drei Läufe derselben
   Datei, zweimal offen, einmal zu. Ein Verhaltens-Wächter allein hätte das
   in zwei von drei Läufen durchgelassen. */
ok("das Öffnen verschiebt die Liste nicht (kein scrollIntoView)", await (async ()=>{
  const { readFileSync } = await import("node:fs");
  const q = readFileSync("QC_MeinRezb_24_04_26.html","utf8");
  const i = q.indexOf("function katEmojiOeffnen"); const j = q.indexOf("function katEmojiSchliessen", i);
  /* ⚠ OHNE DIE KOMMENTARE. Der Erklaerblock an genau dieser Stelle NENNT
     `scrollIntoView` — ein Waechter, der frei im Text sucht, wird davon rot,
     obwohl der Code sauber ist. Dieselbe Falle wie ein Waechter, der im
     Kommentar fuendig wird, nur in die andere Richtung. */
  const code = q.slice(i,j).replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
  return i>=0 && j>i && !/scrollIntoView/.test(code);
})());
/* ⚠ UND EIN WAECHTER AUF DIE ZWEITE URSACHE: das Raster gehoert NICHT in
   `.kat-list` — dort drueckt der Flex-Container es platt. */
ok("das Raster wird nicht in die scrollende Liste gebaut", await (async ()=>{
  const { readFileSync } = await import("node:fs");
  const q = readFileSync("QC_MeinRezb_24_04_26.html","utf8").replace(/\/\*[\s\S]*?\*\//g,"");
  return !/<div class="kat-list">\$\{zeilen\}\$\{katEmojiRaster\(\)\}/.test(q)
      && /<div class="kat-list">\$\{zeilen\}<\/div>/.test(q);
})());

console.log("\n── 6 · Speichern und Neuladen ──");
await seite.fill('#katRenameOv .kat-row[data-kid="sushi"] .kat-name', "Japanisch");
await seite.evaluate(()=>katSpeichern());
ok("der Dialog ist zu", await seite.locator("#katRenameOv").count()===0);
const fertig = await seite.evaluate(()=>[...document.querySelectorAll("#catNav .cpill")].map(e=>e.textContent.trim()));
ok("der Reiter trägt Namen und Symbol", fertig.some(t=>/Japanisch/.test(t)&&t.includes("🍣")));
/* ⚠ DIESE ZEILE GEHÖRT HIERHIN, NICHT NACH OBEN. Abschnitt 3 setzt
   CATS_EIGEN von Hand — eine Sabotage IM Speicher-Weg kommt dort nie vorbei.
   Die Gegenprobe hat den Fall prompt „aus falschem Grund" gemeldet. */
ok("auch über den echten Speicher-Weg bleibt r.cat = 'sushi'",
   await seite.evaluate(()=>R.find(r=>r.name==="Maki-Rolle").cat==="sushi"));
ok("es überlebt ein Neuladen", await seite.evaluate(()=>{
   const g=JSON.parse(localStorage.getItem("mrzcats9m")||"{}");
   return g.sushi?.name==="Japanisch" && g.sushi?.ico==="🍣"; }));
ok("und es liegt NICHT unter Muttis Schlüssel (geteilte Adresse!)",
   await seite.evaluate(()=>localStorage.getItem("mrzcats9")===null));

/* ⚠ „bietet eine Auswahl an (mindestens 40)" WAR ZU LOSE. Die Gegenprobe hat
   es gefangen: sechs Getraenke-Symbole zu entfernen faellt unter 40 nicht auf.
   Eine Untergrenze, die weit unter dem Bestand liegt, misst den Bestand nicht.
   Gemessen wird jetzt die Zusicherung: es SIND Getraenke-Symbole dabei. */
ok("die Auswahl traegt eigene Getraenke-Symbole (Klaus 2026-09-16)", await seite.evaluate(()=>
   ["🍶","🍼","🚰","🫧"].every(e=>KAT_EMOJIS.indexOf(e)>=0)
   && KAT_EMOJIS.length>=130
   && new Set(KAT_EMOJIS).size===KAT_EMOJIS.length));

console.log("\n── 11 · Klartext statt Kennung ──");
const reiterN = await seite.evaluate(()=>{ CATS_EIGEN={}; svCatsEigen(); renderCatNav();
  return [...document.querySelectorAll("#catNav .cpill")].map(e=>e.textContent.trim()); });
/* ⚠ GEMESSEN WIRD DER NAME, NICHT DIE ANWESENHEIT. Eine rohe Kennung im
   Reiter war der halbe Weg: sichtbar ja, verstaendlich nein. Klaus am
   2026-09-15 vor der Ordner-Liste: „AFCKT, was ist das?" */
/* ⚠ BENANNTE GRENZE: in DIESEM Buch feuert das Woerterbuch nie. Gemessen am
   2026-09-16: seine eigenen CATS tragen bereits alle 18 Kennungen der
   Familie — Essen UND Getraenke. Ein Import aus dem Mixarium kommt hier gar
   nicht als „fremd" an. Muttis Rezeptbuch fuehrt nur die sieben
   Essens-Kategorien; dort ist `afckt` fremd, und genau dort hat Klaus es
   gesehen. Gemessen wird deshalb die Zusicherung, die HIER gilt. */
ok("die eigenen Kategorien decken die ganze Familie ab", await seite.evaluate(()=>{
   const eigen=new Set(CATS.map(c=>c.id));
   return KAT_FAMILIE.every(k=>eigen.has(k.id)); }));
/* ⚠ UND DIE GEGENRICHTUNG: eine unbekannte Kennung wird NICHT erfunden.
   Ohne diesen Waechter waere auch ein Woerterbuch gruen, das raet. */
ok("… eine UNBEKANNTE Kennung bekommt keinen erfundenen Namen", await seite.evaluate(()=>{
   const c=catsFremd().find(x=>x.id==="sushi"); return !!c && c.unbekannt===true && c.de===c.id && c.ico==="📦"; }));
ok("das Woerterbuch deckt beide Schwester-Apps ab", await seite.evaluate(()=>
   KAT_FAMILIE.length===18 && ["afckt","mock","bowle","smooth","vorsp","fleisch","drk"]
     .every(k=>KAT_FAMILIE.some(x=>x.id===k))));

console.log("\n── 12 · Rezepte ohne Zuhause werden als eigene Kategorie gefuehrt ──");
ok("ein Reiter sammelt sie ein", reiterN.some(t=>/Ohne Kategorie/.test(t)));
ok("… und er zaehlt BEIDE (ohne Kategorie + toter Ordner)", await seite.evaluate(()=>{
   const p=[...document.querySelectorAll("#catNav .cpill")].find(e=>/Ohne Kategorie/.test(e.textContent));
   return !!p && /(^|\D)2(\D|$)/.test(p.textContent); }));
const alleN = await seite.evaluate(()=>{ CAT="all"; render(); return document.getElementById("rcont").textContent; });
ok("„Alle“ zeichnet das Rezept ohne Kategorie", /Heimatlos-Ohne/.test(alleN));
ok("„Alle“ zeichnet das Rezept mit totem Ordner", /Heimatlos-Ordner/.test(alleN));
/* ⚠ EIN REITER, DER SICH OEFFNEN LAESST UND NICHTS ZEIGT, IST EIN TOTER
   KNOPF MIT BESCHRIFTUNG — die schlimmere Sorte. */
const ohneAnsicht = await seite.evaluate(()=>{ CAT=KAT_OHNE; render(); return document.getElementById("rcont").textContent; });
ok("der Reiter selbst zeigt sie auch",
   /Heimatlos-Ohne/.test(ohneAnsicht) && /Heimatlos-Ordner/.test(ohneAnsicht));
ok("und OHNE Heimatlose gibt es den Reiter nicht", await seite.evaluate(()=>{
   const sich=R.slice(); R=R.filter(r=>!/^Heimatlos/.test(r.name||""));
   const weg=catsAlle().some(c=>c.id===KAT_OHNE); R=sich; return !weg; }));

console.log("\n── 13 · Ordner-Ansicht und Kategorie-Leiste zaehlen DIESELBE Zahl ──");
/* ⚠ Klaus 2026-09-16: „Sushi steht in den Ordnern mit null Rezepten, obwohl
   mindestens sechs drin sind. Oben in der Kategorie-Leiste steht Sushi mit
   sechs." Zwei Stellen zaehlten dieselbe Sache verschieden — die Leiste ueber
   `katVonRezept`, der Ordner-Baum ueber das ROHE Feld `r.cat`.
   ⚠ GEMESSEN WIRD DIE UEBEREINSTIMMUNG, NICHT EINE ZAHL. Ein Waechter auf
   „der Ordner zeigt 6" waere blind, sobald sich die Leiste bewegt — und
   genau diese Sorte Fehler (zwei Stellen, eine Wahrheit) ist hier schon
   dreimal zugeschnappt. */
const paare = await seite.evaluate(()=>{
  CAT="all"; renderCatNav(); renderFolders();
  const leiste={};
  document.querySelectorAll("#catNav .cpill").forEach(e=>{
    const m=/setCAT\('([^']+)'\)/.exec(e.getAttribute("onclick")||"");
    const s=e.querySelector("span");
    if(m&&s)leiste[m[1]]=Number(s.textContent.trim());
  });
  const out=[];
  document.querySelectorAll("#fldTree .fld-grp").forEach(g=>{
    const gid=g.dataset.gid||"";
    const c=g.querySelector(".fld-cnt");
    if(!c)return;
    const id=gid.startsWith("cat_")?gid.slice(4):(gid.startsWith("cfd_")?"fld_"+gid.slice(4):null);
    if(!id)return;
    /* Wie viele dieser Kategorie liegen in einem Ordner? Genau diese Zahl ist
       der Unterschied zwischen den beiden Ansichten — und sie wird gemessen,
       nicht geschaetzt. */
    const imOrdner=gid.startsWith("cat_")
      ? R.filter(r=>r.folder&&katVonRezept(r)===id&&r.name&&!r.blank).length : 0;
    out.push({id:id, ordner:parseInt(c.textContent,10)||0, leiste:leiste[id]||0, imOrdner:imOrdner});
  });
  return out;
});
/* ⚠ TAFEL-EVOLUTIONS-KLAUSEL, AUSDRUECKLICH BENANNT. Hier stand bis zum
   2026-09-16 die Zusicherung „jede Gruppe zeigt in BEIDEN Ansichten dieselbe
   Zahl". Sie war richtig, solange ein Ordner die Kategorie auffrass: ein
   Rezept hatte entweder das eine oder das andere.
   Seit Ordner und Kategorie getrennt sind, hat ein Gericht BEIDES — und die
   zwei Ansichten beantworten zwei verschiedene Fragen:
     · die Kategorie-Leiste: „wie viele Rezepte haben diese Kategorie?"
       (die in Ordnern zaehlen mit — sie haben sie ja)
     · der Ordner-Baum: „was liegt hier?" (jedes Rezept steht GENAU EINMAL,
       im Ordner ODER unter seiner Kategorie)
   Ersetzt, nicht stillschweigend gelockert: gemessen wird weiter die
   Uebereinstimmung, nur mit dem Unterschied ausgerechnet statt weggelassen. */
const uneins = paare.filter(p=>p.ordner+p.imOrdner!==p.leiste);
ok("Leiste = Baum + die, die in einem Ordner liegen",
   paare.length>0 && uneins.length===0);
if(uneins.length)console.log("     uneins: "+uneins.map(p=>`${p.id} ${p.ordner}+${p.imOrdner}≠${p.leiste}`).join(", "));
/* ⚠ UND DIE GEGENRICHTUNG: ohne eine fremde Kategorie MIT Inhalt misst der
   Waechter oben nichts — alle Zahlen waeren 0 und stimmten trivial ueberein. */
ok("… und eine mitgebrachte Kategorie ist wirklich dabei",
   paare.some(p=>p.id==="sushi" && p.ordner>0));
/* ⚠ EIN ORDNER, DEN ES NOCH GIBT, ZAEHLT IN BEIDEN ANSICHTEN GLEICH.
   Die Leiste zaehlt `r.folder ODER r.cat==='fld_…'`, der Baum zaehlte nur
   `r.folder` — dieselbe Sorte Abweichung, nur eine Zeile tiefer. */
ok("ein Rezept, das nur ueber r.cat im Ordner liegt, faellt nirgends heraus",
   await seite.evaluate(()=>{
     const sich=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
     FD.push({id:"9911",name:"Probe-Ordner",ico:"📁"});
     R.push({id:99110,name:"Nur-ueber-cat",cat:"fld_9911",folder:"",blank:false});
     renderCatNav(); renderFolders();
     const p=[...document.querySelectorAll("#catNav .cpill")]
       .find(e=>/setCAT\('fld_9911'\)/.test(e.getAttribute("onclick")||""));
     const g=document.querySelector('#fldTree .fld-grp[data-gid="cfd_9911"] .fld-cnt');
     const a=p?Number(p.querySelector("span").textContent.trim()):-1;
     const b=g?parseInt(g.textContent,10):-2;
     R=sich; FD=sichF; renderCatNav(); renderFolders();
     return a===1 && b===1;
   }));

console.log("\n── 14 · Ordner und Kategorie sind zwei Sachen ──");
/* ⚠ Klaus 2026-09-16, drei Befunde aus EINEM Bild: „das Sushi taucht zweimal
   auf" · „wenn ich es aufklappe, hat das Sushi Ordner als Emojis" · „wenn ich
   jetzt das Hauptemoji fuer die Kategorie aendere, aendern sich die unteren
   Emojis fuer die einzelnen Gerichte nicht".
   Alle drei hatten EINE Ursache: ein Ordner-Umzug schrieb `fld_<id>` in
   `r.cat` und nahm dem Gericht damit seine Kategorie. */
const trennung = await seite.evaluate(()=>{
  const sichR=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
  const sichE=JSON.parse(JSON.stringify(CATS_EIGEN));
  const ev={preventDefault(){},stopPropagation(){}};
  FD.push({id:"7701",name:"Sushi-Ordner",ico:"📁"});
  R.push({id:77010,name:"Avocado-Rolle",cat:"sushi",folder:"",blank:false});
  R.push({id:77011,name:"Altbestand-Rolle",cat:"fld_9999",folder:"",blank:false});

  // 1 · Umzug in den Ordner
  _dd={type:"card",rid:77010,overRow:null,overPos:null};
  fldGrpDrop(ev,"cfd_7701");
  const a=R.find(r=>r.id===77010);
  const katBleibt=(a.cat==="sushi"), ordnerGesetzt=(String(a.folder)==="7701");

  // 2 · Die Zeile im Ordner traegt das Symbol ihrer KATEGORIE
  renderFolders();
  const zeile=()=>{
    const g=document.querySelector('#fldTree .fld-grp[data-gid="cfd_7701"]');
    const z=g&&[...g.querySelectorAll(".fld-rrow")].find(x=>x.dataset.rid==="77010");
    return z?z.firstElementChild.textContent.trim():"";
  };
  /* ⚠ GEMESSEN WIRD DIE ZUSICHERUNG, NICHT DAS ZEICHEN. Ein fest genageltes
     🍣 waere hier schon rot geworden, weil Abschnitt 6 der Kategorie „sushi"
     laengst ein eigenes Symbol gegeben hat — rot, ohne dass eine Zusicherung
     gefallen waere. Verglichen wird gegen das Symbol, das die Kategorie
     WIRKLICH traegt, und gegen das des Ordners. */
  const symVorher=zeile();
  const symKat=katSymbol(catsAlle().find(c=>c.id==="sushi"));
  const symOrdner=FD.find(f=>String(f.id)==="7701").ico;

  // 3 · Ein Wechsel des Kategorie-Symbols erreicht das Gericht im Ordner
  CATS_EIGEN=Object.assign({},CATS_EIGEN,{sushi:{ico:"🧪",name:""}});
  renderFolders();
  const symNachher=zeile();

  // 4 · Kein Rezept steht im Baum zweimal
  const rids=[...document.querySelectorAll("#fldTree .fld-rrow")].map(e=>e.dataset.rid);
  const doppelt=rids.filter((v,i)=>rids.indexOf(v)!==i);

  // 5 · Eine Altbestands-Kennung wird beim Umzug nicht mitgeschleppt
  _dd={type:"card",rid:77011,overRow:null,overPos:null};
  fldGrpDrop(ev,"cfd_7701");
  const b=R.find(r=>r.id===77011);
  const altGeleert=(b.cat===""&&String(b.folder)==="7701");

  // 6 · Ein geloeschter Ordner erfindet keine Kategorie
  const cf=window.confirm; window.confirm=()=>true;
  deleteFolder("7701","Sushi-Ordner");
  window.confirm=cf;
  const c1=R.find(r=>r.id===77010), c2=R.find(r=>r.id===77011);
  const nachLoeschen={kat:c1.cat, ordner:String(c1.folder||""), altKat:c2.cat};

  R=sichR; FD=sichF; CATS_EIGEN=sichE; renderCatNav(); renderFolders();
  return {katBleibt,ordnerGesetzt,symVorher,symNachher,symKat,symOrdner,doppelt,altGeleert,nachLoeschen};
});
ok("ein Umzug in einen Ordner laesst die Kategorie stehen", trennung.katBleibt);
/* ⚠ GEGENRICHTUNG: ohne diese Zeile waere „die Kategorie bleibt" auch dann
   gruen, wenn der Umzug ueberhaupt nichts tut. */
ok("… und setzt den Ordner wirklich", trennung.ordnerGesetzt);
ok("das Gericht im Ordner traegt das Symbol seiner Kategorie, nicht das des Ordners",
   trennung.symVorher===trennung.symKat && trennung.symVorher!==trennung.symOrdner);
if(trennung.symVorher!==trennung.symKat)
  console.log(`     Zeile ${trennung.symVorher} · Kategorie ${trennung.symKat} · Ordner ${trennung.symOrdner}`);
ok("ein Wechsel des Kategorie-Symbols erreicht es (Klaus' dritter Befund)",
   trennung.symNachher==="🧪" && trennung.symVorher!==trennung.symNachher);
ok("kein Rezept steht im Ordner-Baum zweimal", trennung.doppelt.length===0);
if(trennung.doppelt.length)console.log("     doppelt: "+trennung.doppelt.join(", "));
ok("eine Altbestands-Kennung fld_ wird beim Umzug nicht mitgeschleppt",
   trennung.altGeleert);
/* ⚠ Bis 2026-09-16 setzte deleteFolder `r.cat='fleisch'` — ein geratenes
   Zuhause fuer jedes Rezept des Ordners. */
ok("ein geloeschter Ordner erfindet keine Kategorie",
   trennung.nachLoeschen.kat==="sushi" && trennung.nachLoeschen.ordner==="" &&
   trennung.nachLoeschen.altKat==="");
/* ⚠ UND DAS ABZEICHEN AM REITER ZAEHLT DIESELBEN GRUPPEN. Es rechnet seine
   Zahl selbst aus `R`, nicht aus dem gezeichneten Baum — zwei Stellen, eine
   Wahrheit, und genau diese Sorte ist hier schon dreimal auseinandergelaufen. */
ok("das Abzeichen zaehlt genau die Gruppen mit Inhalt",
   await seite.evaluate(()=>{
     const sichR=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
     FD.push({id:"7704",name:"Probe-Ordner",ico:"📁"});
     R.push({id:77040,name:"Im-Ordner",cat:"sushi",folder:"7704",blank:false});
     /* ⚠ ALLE Sushi in den Ordner. Bliebe auch nur eines draussen, zaehlte das
        Abzeichen die Kategorie ohnehin mit, und der Waechter waere blind — genau
        das hat die Gegenprobe beim ersten Lauf gemeldet. */
     R.forEach(r=>{if(r.name&&!r.blank&&katVonRezept(r)==="sushi")r.folder="7704";});
     renderFolders(); badge();
     const voll=[...document.querySelectorAll("#fldTree .fld-grp .fld-cnt")]
       .filter(e=>(parseInt(e.textContent,10)||0)>0).length;
     const b=parseInt(document.getElementById("fldBadge").textContent,10)||0;
     R=sichR; FD=sichF; renderCatNav(); renderFolders(); badge();
     return voll>0 && b===voll;
   }));
/* ⚠ EIN ORDNER, DEN ES NICHT MEHR GIBT, IST KEIN SYMBOL. `catIco('fld_9999')`
   gibt ein nacktes 📁 zurueck — ein Ordner-Zeichen fuer einen Ordner, der nicht
   existiert. Gedeutet steht dort das Zeichen von „Ohne Kategorie", und das ist
   die Wahrheit ueber dieses Rezept. */
ok("ein Rezept mit toter Ordner-Kennung zeigt Ohne-Kategorie statt 📁",
   await seite.evaluate(()=>{
     const sichR=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
     FD.push({id:"7703",name:"Probe-Ordner",ico:"📁"});
     R.push({id:77030,name:"Tote-Kennung",cat:"fld_9999",folder:"7703",blank:false});
     renderFolders();
     const g=document.querySelector('#fldTree .fld-grp[data-gid="cfd_7703"]');
     const z=g&&[...g.querySelectorAll(".fld-rrow")].find(x=>x.dataset.rid==="77030");
     const sym=z?z.firstElementChild.textContent.trim():"";
     const soll=catIco(KAT_OHNE);
     R=sichR; FD=sichF; renderCatNav(); renderFolders();
     return sym===soll && sym!=="📁";
   }));
/* ⚠ Und die Anlage-Maske hat ZWEI Felder: der Ordner darf die Kategorie nicht
   mehr ueberstimmen. */
ok("ein im Ordner angelegtes Rezept bekommt trotzdem seine Kategorie",
   await seite.evaluate(()=>{
     const sichR=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
     FD.push({id:"7702",name:"Probe-Ordner",ico:"📁"}); renderCatNav();
     document.getElementById("newName").value="Frisch-im-Ordner";
     document.getElementById("newCat").value="sushi";
     document.getElementById("newFolder").value="7702";
     document.getElementById("newFlavor").value="";
     createRecipe();
     const n=R.find(r=>r.name==="Frisch-im-Ordner");
     const gut=!!n && n.cat==="sushi" && String(n.folder)==="7702";
     R=sichR; FD=sichF; renderCatNav(); renderFolders();
     return gut;
   }));

console.log("\n── 15 · Der Import nimmt einer Kategorie nicht ihr Zuhause ──");
/* ⚠ HIER LAG DIE WURZEL, gemessen am 2026-09-16. Klaus' sechs Sushi ohne
   Kategorie sind NICHT beim Verschieben von Hand entstanden, sondern beim
   IMPORT: der Zuordnungs-Dialog schlug fuer jede unbekannte Kategorie „als
   eigener Ordner" vor — vorausgewaehlt —, und `_applyCatMapping` schrieb
   daraufhin `r.cat='fld_<id>'`. Danach stand in der Leiste die Kategorie UND
   der neue Ordner: zweimal derselbe Name. */
const einf = await seite.evaluate(()=>{
  const sichR=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
  FD.push({id:"6601",name:"Sushi",ico:"🐟"});
  const probe=[{id:66010,name:"Maki",cat:"sushi",folder:"",blank:false},
               {id:66011,name:"Nigiri",cat:"sushi",folder:"",blank:false}];
  _applyCatMapping(probe,{sushi:"fld_6601"});
  const a=probe[0];
  const ordnerWeg={kat:a.cat, ordner:String(a.folder||"")};

  // „behalten" aendert gar nichts
  const probe2=[{id:66020,name:"Temaki",cat:"sushi",folder:"",blank:false}];
  _applyCatMapping(probe2,{sushi:"__behalten__"});
  const behalten={kat:probe2[0].cat, ordner:String(probe2[0].folder||"")};

  // eine echte Zuordnung auf eine feste Kategorie wirkt weiter
  const probe3=[{id:66030,name:"Reisbowl",cat:"sushi",folder:"",blank:false}];
  _applyCatMapping(probe3,{sushi:"fleisch"});
  const umgehaengt=probe3[0].cat;

  // eine fremde Kennung ueberlebt die Normalisierung
  const probe4=[{id:66040,name:"Fremd",cat:"sushi",folder:"",blank:false}];
  _normalizeRecs(probe4);
  const ueberlebt=probe4[0].cat;

  R=sichR; FD=sichF; renderCatNav(); renderFolders();
  return {ordnerWeg,behalten,umgehaengt,ueberlebt};
});
ok("ein Ordner aus dem Import laesst die Kategorie stehen", einf.ordnerWeg.kat==="sushi");
/* ⚠ GEGENRICHTUNG: ohne diese Zeile waere „die Kategorie bleibt" auch dann
   gruen, wenn die Zuordnung ueberhaupt nichts tut. */
ok("… und setzt den Ordner wirklich", einf.ordnerWeg.ordner==="6601");
ok("„behalten“ laesst Kategorie UND Ordner unberuehrt",
   einf.behalten.kat==="sushi" && einf.behalten.ordner==="");
ok("eine Zuordnung auf eine feste Kategorie wirkt weiter", einf.umgehaengt==="fleisch");
/* ⚠ Bis 2026-09-16 machte `_normalizeRecs` aus jeder unbekannten Kennung
   „fleisch" — die Kategorie war nach einem Import weg, bevor der Nutzer sie
   ueberhaupt zu sehen bekam. */
ok("eine fremde Kennung ueberlebt die Normalisierung", einf.ueberlebt==="sushi");
/* ⚠ UND DIE VORAUSWAHL IM DIALOG IST DIE EIGENTLICHE ENTSCHEIDUNG. Wer den
   Dialog wegklickt, bekommt die Vorgabe — und die hat bisher die Kategorie
   zerstoert. Gemessen wird der WIRKLICH gewaehlte Wert, nicht der Quelltext. */
ok("der Zuordnungs-Dialog hat „Kategorie behalten“ vorausgewaehlt",
   await seite.evaluate(()=>{
     const sichR=JSON.parse(JSON.stringify(R));
     let gewaehlt=null;
     _showCatMapDialog([{id:1,name:"X",cat:"voellig-unbekannt-9911",folder:""}],()=>{});
     const sel=document.querySelector(".catmap-sel");
     if(sel)gewaehlt=sel.value;
     const ov=sel&&sel.closest(".share-ov"); if(ov)ov.remove();
     R=sichR;
     return gewaehlt==="__behalten__";
   }));
/* ⚠ UND DIE ZAHL AUF DEM ORDNER-BILDSCHIRM SAGT, WAS FEHLT. Klaus: „oben
   steht Sushi mit 7, im Ordner mit 1." Beide Zahlen waren richtig — der
   Unterschied stand nirgends. */
const zusatz = await seite.evaluate(()=>{
  const sichR=JSON.parse(JSON.stringify(R)), sichF=JSON.parse(JSON.stringify(FD));
  FD.push({id:"6602",name:"Probe-Ordner",ico:"📁"});
  R.push({id:66120,name:"Drin-1",cat:"sushi",folder:"6602",blank:false});
  R.push({id:66121,name:"Drin-2",cat:"sushi",folder:"6602",blank:false});
  renderFolders();
  const mit=document.querySelector('#fldTree .fld-grp[data-gid="cat_sushi"] .fld-cnt').textContent.trim();
  // Gegenrichtung: ohne welche in Ordnern steht dort NICHTS dazu
  R=R.filter(r=>r.id!==66120&&r.id!==66121);
  renderFolders();
  const ohne=document.querySelector('#fldTree .fld-grp[data-gid="cat_sushi"] .fld-cnt').textContent.trim();
  R=sichR; FD=sichF; renderCatNav(); renderFolders();
  return {mit,ohne};
});
/* ⚠ UND ER PRUEFT DAS WORT, NICHT NUR DIE ZAHL. Die erste Fassung fragte nur
   nach „+2" — und war blind dafuer, dass daneben der SCHLUESSELNAME stand
   („+6 fldInOrdnern"). Klaus hat es im Bild gesehen, keine Probe. */
ok("die Kategorie-Zeile nennt die, die in Ordnern liegen", /\+2 /.test(zusatz.mit));
ok("… und zwar mit einem Wort, nicht mit dem Schluesselnamen",
   /\+2 in Ordnern/.test(zusatz.mit) && !/fldInOrdnern/.test(zusatz.mit));
ok("… und schweigt, wenn keines in einem Ordner liegt", !/\+/.test(zusatz.ohne));
if(!/\+2 /.test(zusatz.mit))console.log(`     mit: „${zusatz.mit}" · ohne: „${zusatz.ohne}"`);

console.log("\n── 16 · Jeder benutzte Text-Schluessel steht wirklich in LANGS ──");
/* ⚠ `T(k)` gibt bei einem FEHLENDEN Schluessel den Schluessel ZURUECK:
     function T(k){return(LANGS[CL]||LANGS.de)[k]||k;}
   Der Rueckgabewert ist damit immer truthy — ein `T('x')||'Rueckfall'`
   dahinter kann NIE greifen, und auf dem Schirm steht der Schluesselname.
   Genau das ist am 2026-09-16 passiert („+6 fldInOrdnern"), und gefunden hat
   es Klaus im Bild, nicht diese Probe. Gemessen wird deshalb die FAMILIE:
   jeder Schluessel, den der Code benutzt, muss in LANGS.de stehen. */
const fehlend = await seite.evaluate(()=>{
  const quelle=document.documentElement.innerHTML;
  const schluessel=new Set();
  const re=/\bT\(\s*'([A-Za-z_][A-Za-z0-9_]*)'\s*\)/g;
  let m; while((m=re.exec(quelle)))schluessel.add(m[1]);
  const de=(typeof LANGS!=="undefined"&&LANGS.de)||{};
  return {gesamt:schluessel.size, fehlt:[...schluessel].filter(k=>!(k in de))};
});
ok(`alle ${fehlend.gesamt} benutzten Schluessel sind in LANGS.de vorhanden`,
   fehlend.gesamt>20 && fehlend.fehlt.length===0);
if(fehlend.fehlt.length)console.log("     fehlt: "+fehlend.fehlt.join(", "));
/* ⚠ GEGENRICHTUNG: ohne diese Zeile waere der Waechter oben auch dann gruen,
   wenn der Sammler gar nichts findet. */
ok("… und der Sammler findet ueberhaupt Schluessel", fehlend.gesamt>20);

console.log("\n── 17 · Eine Kennung kommt genau einmal vor ──");
/* ⚠ Klaus 2026-09-16 mit Bild: ZWEI Pillen „Sushi", und ein einziger Tipp
   markierte BEIDE. Eine Pille traegt `on` genau dann, wenn `CAT===c.id` —
   markiert ein Tipp zwei, tragen beide dieselbe Kennung. Es sind also nicht
   zwei Kategorien, sondern EINE, die zweimal gezeichnet wird. */
const doppelt = await seite.evaluate(()=>{
  const sichC=CATS.slice(), sichR=JSON.parse(JSON.stringify(R));
  const vorlage=CATS.find(c=>c.id==='fleisch');
  // dieselbe Kennung ein zweites Mal in die Liste — Klaus' Lage nachgestellt
  CATS.push(Object.assign({},vorlage));
  const wieOft=catsAlle().filter(c=>c.id==='fleisch').length;
  CAT='fleisch'; renderCatNav();
  const markiert=[...document.querySelectorAll('#catNav .cpill.on')]
    .filter(e=>/setCAT\('fleisch'\)/.test(e.getAttribute("onclick")||"")).length;
  renderFolders();
  const gruppen=document.querySelectorAll('#fldTree .fld-grp[data-gid="cat_fleisch"]').length;
  // Gegenrichtung: ohne das Duplikat bleibt die Liste vollstaendig
  CATS.length=0; sichC.forEach(c=>CATS.push(c));
  const normal=catsAlle().length, ohneAll=CATS.filter(c=>c.id!=='all').length;
  R=sichR; CAT='all'; renderCatNav(); renderFolders();
  return {wieOft,markiert,gruppen,normal,ohneAll};
});
ok("eine doppelte Kennung erscheint in catsAlle nur EINMAL", doppelt.wieOft===1);
ok("… ein Tipp markiert genau eine Pille (Klaus' Befund)", doppelt.markiert===1);
ok("… und der Ordner-Baum zeichnet die Gruppe nur einmal", doppelt.gruppen===1);
/* ⚠ GEGENRICHTUNG: ein Riegel, der zu viel wegwirft, waere schlimmer als das
   Duplikat — dann fehlten Kategorien. Gemessen wird, dass ohne Duplikat
   nichts verloren geht. */
ok("… und ohne Duplikat geht keine Kategorie verloren",
   doppelt.normal>=doppelt.ohneAll && doppelt.ohneAll>0);
/* ⚠ UND DIE QUELLE WIRD GEMESSEN: kommt das Duplikat aus der fest
   eingebauten Liste, sagt es dieser Waechter — sonst raetselt man an der
   falschen Stelle. */
ok("die fest eingebaute Liste CATS traegt keine Kennung zweimal",
   await seite.evaluate(()=>{
     const ids=CATS.map(c=>c.id);
     return new Set(ids).size===ids.length;
   }));
/* ⚠ UND DIE KENNUNG STEHT IM DIALOG, MIT ZEICHENZAHL. Zwei Kategorien
   koennen denselben NAMEN tragen — die Kennung ist das, woran die Rezepte
   haengen. Ein fuehrendes oder folgendes Leerzeichen sieht man nur so. */
const kennung = await seite.evaluate(()=>{
  const sichR=JSON.parse(JSON.stringify(R));
  R.push({id:88010,name:"Mit-Leerzeichen",cat:"luecke ",folder:"",blank:false});
  openKatUmbenennen();
  const row=document.querySelector('#katRenameOv .kat-row[data-kid="luecke "]');
  /* ⚠ EINE PROBE, DIE ABSTUERZT STATT ZU MELDEN, ZEIGT AUF DEN BOTEN.
     Fehlt `.kat-kenn`, warf der Zugriff — und die Gegenprobe meldete „ROT AUS
     FALSCHEM GRUND" statt der gebrochenen Zusicherung. */
  const k=row&&row.querySelector('.kat-kenn');
  const txt=k?k.textContent.trim():"";
  const ov=document.getElementById('katRenameOv'); if(ov)ov.remove();
  R=sichR; renderCatNav(); renderFolders();
  return txt;
});
ok("der Dialog zeigt die Kennung", /luecke/.test(kennung));
ok("… in Anfuehrungszeichen, sodass ein Leerzeichen sichtbar wird",
   kennung.indexOf('"luecke "')===0);
ok("… und mit der Zeichenzahl daneben", /·7$/.test(kennung));
if(!/·7$/.test(kennung))console.log(`     gelesen: „${kennung}"`);

console.log("\n── 18 · Kategorien loeschen, zusammenlegen, neu anlegen ──");
/* ⚠ Klaus 2026-09-16: „mache es bitte moeglich, die Kategorien einzeln zu
   loeschen, auch ganze Kategorien zu loeschen und neu zu erstellen."
   Das ZUSAMMENLEGEN ist derselbe Weg: die eine Kategorie wird in die andere
   aufgeloest. Damit legt er seine zwei „Sushi" zusammen. */
const aufl = await seite.evaluate(()=>{
  const sichR=JSON.parse(JSON.stringify(R)), sichN=JSON.parse(JSON.stringify(CATS_NEU));
  const sichA=CATS_AUS.slice(), sichE=JSON.parse(JSON.stringify(CATS_EIGEN));
  R.push({id:91001,name:"Sushi-A-1",cat:"sushiA",folder:"",blank:false});
  R.push({id:91002,name:"Sushi-A-2",cat:"sushiA",folder:"",blank:false});
  R.push({id:91003,name:"Sushi-B-1",cat:"sushiB",folder:"",blank:false});

  const vorher=katAnzahl("sushiB");
  // zusammenlegen: B in A aufloesen
  katWegNehmen("sushiB","sushiA");
  const nachA=katAnzahl("sushiA"), nachB=katAnzahl("sushiB");
  /* ⚠ EINE MITGEBRACHTE KENNUNG VERSCHWINDET VON SELBST, sobald kein Rezept
     mehr auf sie zeigt — `catsFremd()` sammelt sie ja aus `R`. Der Waechter
     war damit BLIND fuer den Riegel, um den es geht (CATS_AUS): die
     Gegenprobe konnte ihn ausbauen, und „verschwindet aus der Liste" blieb
     gruen. Gemessen wird deshalb an einer FESTEN Kategorie — die steht im
     Code und geht nur ueber das Ausblenden weg. */
  const bWeg=!catsAlle().some(c=>String(c.id)==="sushiB");
  const fest=String(CATS.find(c=>c.id!=="all").id);
  R.push({id:91004,name:"Fest-1",cat:fest,folder:"",blank:false});
  katWegNehmen(fest,"sushiA");
  const festWeg=!catsAlle().some(c=>String(c.id)===fest);

  // in „Ohne Kategorie" aufloesen ist eine WAHL, kein fehlender Wert
  katWegNehmen("sushiA","");
  const ohne=R.filter(r=>[91001,91002,91003].indexOf(r.id)>=0&&katVonRezept(r)===KAT_OHNE).length;

  document.querySelectorAll('#katRenameOv,#katAuflOv').forEach(e=>e.remove());
  R=sichR;CATS_NEU=sichN;CATS_AUS=sichA;CATS_EIGEN=sichE;
  renderCatNav();renderFolders();
  return {vorher,nachA,nachB,bWeg,festWeg,ohne};
});
ok("zwei Kategorien lassen sich zusammenlegen", aufl.vorher===1 && aufl.nachA===3);
ok("… die aufgeloeste ist danach leer", aufl.nachB===0);
ok("… und verschwindet aus der Liste", aufl.bWeg);
ok("… auch eine FESTE Kategorie verschwindet (der Riegel greift wirklich)", aufl.festWeg);
ok("„Ohne Kategorie“ ist eine Wahl, kein fehlender Wert", aufl.ohne===3);

/* ⚠ EINE KATEGORIE MIT INHALT WIRD NICHT STILL AUSGEBLENDET. Das waere der
   Schaden vom 2026-09-15 zurueck: Rezepte liegen in R, werden gespeichert und
   mitexportiert — und tauchen nirgends auf. */
ok("eine ausgeblendete Kategorie MIT Inhalt bleibt sichtbar",
   await seite.evaluate(()=>{
     const sichR=JSON.parse(JSON.stringify(R)), sichA=CATS_AUS.slice();
     R.push({id:91010,name:"Noch-da",cat:"bleibt9",folder:"",blank:false});
     CATS_AUS.push("bleibt9");
     const sichtbar=catsAlle().some(c=>String(c.id)==="bleibt9");
     // Gegenrichtung: ohne Inhalt verschwindet sie sehr wohl
     R=R.filter(r=>r.id!==91010);
     const wegOhneInhalt=!catsAlle().some(c=>String(c.id)==="bleibt9");
     R=sichR;CATS_AUS=sichA;renderCatNav();renderFolders();
     return sichtbar && wegOhneInhalt;
   }));

/* ⚠ EINE NEUE KATEGORIE IST EINE NEUE ZEILE, kein zweiter Dialog — der Nutzer
   tippt den Namen dort, wo er alle anderen auch tippt. */
const neuK = await seite.evaluate(()=>{
  const sichN=JSON.parse(JSON.stringify(CATS_NEU)), sichE=JSON.parse(JSON.stringify(CATS_EIGEN));
  openKatUmbenennen();
  const vorher=document.querySelectorAll('#katRenameOv .kat-row').length;
  katNeuAnlegen();
  const rows=[...document.querySelectorAll('#katRenameOv .kat-row')];
  const nachher=rows.length;
  /* ⚠ NICHT „die letzte Zeile" — `catsAlle()` haengt die mitgebrachten
     Kategorien dahinter. Gesucht wird die Zeile mit der NEUEN Kennung. */
  const neue=rows.find(r=>/^eig_/.test(r.dataset.kid||""));
  const kid=neue?neue.dataset.kid:"";
  const fokus=!!neue&&document.activeElement===neue.querySelector('.kat-name');
  const istLetzte=rows.length>0&&rows[rows.length-1]===neue;
  // ohne Namen wird sie beim Speichern wieder entfernt — sonst bliebe eine
  // leere „Neue Kategorie" stehen, obwohl der Nutzer abgebrochen hat
  katSpeichern();
  const bleibtOhneNamen=CATS_NEU.some(c=>c.id===kid);
  CATS_NEU=sichN;CATS_EIGEN=sichE;svCatsNeu();svCatsEigen();
  document.querySelectorAll('#katRenameOv,#katAuflOv').forEach(e=>e.remove());
  renderCatNav();renderFolders();
  return {vorher,nachher,kid,fokus,istLetzte,bleibtOhneNamen};
});
ok("„＋ Neue Kategorie“ legt eine Zeile an", neuK.nachher===neuK.vorher+1);
ok("… mit eigener Kennung", /^eig_/.test(neuK.kid));
/* ⚠ UND ER STEHT IN DER RICHTIGEN ZEILE. Die erste Fassung nahm „die letzte",
   und das war eine FREMDE Kategorie — wer lostippt, benennt die falsche um.
   Gefunden hat es dieser Waechter, nicht das Nachdenken. */
ok("… und der Finger steht gleich im Namensfeld DER NEUEN", neuK.fokus===true);
ok("… obwohl sie nicht die letzte Zeile ist", neuK.istLetzte===false);
ok("… ohne Namen wird sie beim Speichern wieder entfernt", neuK.bleibtOhneNamen===false);

await browser.close(); server.close();
console.log(`\n${gruen} grün · ${rot} ROT`);
process.exit(rot?1:0);
