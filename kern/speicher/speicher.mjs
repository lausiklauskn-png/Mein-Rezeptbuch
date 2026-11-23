// Küchen-Kern · Speicher im Gerät (IndexedDB). Ein Zustand je Ausgabe, eigene Datenbank je Ausgabe.
// Geschrieben wird der ganze Zustand in einem Stück; ein abgebrochener Schreibvorgang lässt den alten Stand stehen.
const LADEN = 'zustand', SCHLUESSEL = 'alles';

function oeffne(name) {
  return new Promise((gut, schlecht) => {
    const a = indexedDB.open(name, 1);
    a.onupgradeneeded = () => a.result.createObjectStore(LADEN);
    a.onsuccess = () => gut(a.result); a.onerror = () => schlecht(a.error);
  });
}
export function speicher(dbName) {
  let db = null;
  const hol = async () => (db ||= await oeffne(dbName));
  return {
    async lies() { const d = await hol(); return new Promise((gut, schlecht) => { const a = d.transaction(LADEN).objectStore(LADEN).get(SCHLUESSEL); a.onsuccess = () => gut(a.result || null); a.onerror = () => schlecht(a.error); }); },
    async schreibe(zustand) { const d = await hol(); return new Promise((gut, schlecht) => { const t = d.transaction(LADEN, 'readwrite'); t.objectStore(LADEN).put(zustand, SCHLUESSEL); t.oncomplete = () => gut(); t.onerror = () => schlecht(t.error); t.onabort = () => schlecht(t.error); }); },
    /** Bittet den Browser, die Daten nicht von selbst zu löschen. */
    async dauerhaft() { try { return !!(await navigator.storage?.persist?.()); } catch { return false; } },
  };
}
