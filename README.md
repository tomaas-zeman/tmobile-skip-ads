# Video Skip +1 min Extension

Jednoduchá Chrome extension, která posune video o 1 minutu dopředu.

## Soubory

- `manifest.json` - Konfigurace extension
- `background.js` - Service worker, který naslouchá kliknutí na ikonu
- `content.js` - Skript běžící na stránce, manipuluje video
- `images/` - Ikony extension (16x16, 48x48, 128x128 px)

## Instalace

1. Otevřete Chrome a jděte na `chrome://extensions/`
2. Zapněte "Developer mode" (pravý horní roh)
3. Klikněte "Load unpacked"
4. Vyberte složku projektu (`zradci`)

## Použití

- Na jakékoli stránce s videem klikněte na ikonu extension v toolbaru
- Video se posune o 60 sekund dopředu
- Lze klikat libovolně vícekrát

## Jak funguje

1. **background.js** - Naslouchá kliknutí na ikonu extension
2. **content.js** - Běží v kontextu stránky a manipuluje DOM
3. Komunikace mezi nimi přes `chrome.tabs.sendMessage()`
4. Skript najde první `<video>` element a zvýší `currentTime` o 60 sekund

## Poznámky

- Funguje s každým HTML5 videem (ne se všemi embeddovanými přehrávači, které nemají přístup k DOM)
- Pro YouTube, Vimeo a jiné třetí strany by bylo potřeba jiné řešení
