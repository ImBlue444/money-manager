# Prompt — Agente AI: App Electron "Finanza Personale"

## Contesto e obiettivo

Sei un agente AI esperto in sviluppo full-stack con Electron, React, e Node.js. Il tuo compito è costruire da zero un'applicazione desktop completa per la gestione delle finanze personali. L'app deve essere funzionante, ben strutturata, con UI moderna e persistenza locale dei dati.

Non fare domande. Esegui ogni fase in sequenza. Quando una fase è completata, passa alla successiva senza attendere conferma, a meno che tu non stia chiedendo dati strettamente necessari (es. path di installazione non standard).

---

## Stack tecnico richiesto

- **Electron** (versione stabile più recente) con `contextBridge` e `preload.js` (NO nodeIntegration)
- **React 18** + **Vite** come bundler (usa `electron-vite` o setup manuale Vite + Electron)
- **Tailwind CSS v3** per lo stile
- **better-sqlite3** per la persistenza locale (database SQLite embedded)
- **electron-store** per le preferenze utente
- **Recharts** per i grafici
- **date-fns** per la manipolazione delle date
- **Open Exchange Rates API** (free tier, no auth richiesta per EUR base) per il cambio valute live
- **Frankfurter API** (`https://api.frankfurter.app`) come alternativa gratuita e senza API key per i tassi di cambio EUR

---

## Struttura del progetto

Genera questa struttura di cartelle e file:

```
finanza-personale/
├── electron/
│   ├── main.js              # Entry point Electron
│   ├── preload.js           # Contextbridge API
│   └── ipc/
│       ├── transactions.js  # Handler IPC per transazioni
│       ├── subscriptions.js # Handler IPC per abbonamenti
│       ├── budget.js        # Handler IPC per budget
│       └── settings.js      # Handler IPC per impostazioni
├── src/
│   ├── main.jsx             # Entry React
│   ├── App.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopBar.jsx
│   │   ├── ui/              # Componenti atomici (Button, Card, Badge, Modal, Input, Select)
│   │   └── charts/
│   │       ├── SpendingDonut.jsx
│   │       ├── BalanceTrend.jsx
│   │       └── CategoryBar.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Subscriptions.jsx
│   │   ├── Budget.jsx
│   │   ├── Goals.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   ├── hooks/
│   │   ├── useTransactions.js
│   │   ├── useSubscriptions.js
│   │   ├── useBudget.js
│   │   └── useCurrency.js
│   └── lib/
│       ├── db.js            # Inizializzazione DB e query helpers
│       ├── formatters.js    # Formattatori valuta/data
│       └── categories.js    # Lista categorie predefinite
├── package.json
├── vite.config.js
├── tailwind.config.js
└── electron-builder.json
```

---

## Schema database SQLite

Crea le seguenti tabelle all'avvio dell'app (se non esistono):

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  currency TEXT DEFAULT 'EUR',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  category TEXT NOT NULL,
  next_billing_date TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'credit-card',
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL UNIQUE,
  monthly_limit REAL NOT NULL,
  month TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  target_date TEXT,
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'target',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Inserisci i settings di default all'inizializzazione:
- `base_currency`: `EUR`
- `locale`: `it-IT`
- `theme`: `light`
- `starting_balance`: `0`

---

## Feature da implementare

### 1. Dashboard (`/`)

La schermata principale mostra una panoramica immediata della situazione finanziaria:

**Cards in cima (griglia 4 colonne):**
- **Saldo attuale** — calcolato come `starting_balance + sum(income) - sum(expense)` del mese corrente
- **Entrate mese** — somma income del mese in corso, in verde
- **Uscite mese** — somma expense del mese in corso, in rosso
- **Abbonamenti attivi** — costo totale mensile di tutti gli abbonamenti attivi (normalizzato: weekly×4, quarterly/3, yearly/12)

**Grafici:**
- `BalanceTrend`: grafico a linea (Recharts `LineChart`) con l'andamento del saldo negli ultimi 6 mesi
- `SpendingDonut`: grafico a ciambella con le uscite per categoria del mese corrente

**Lista "Prossimi abbonamenti":**
- I 3 abbonamenti con `next_billing_date` più vicina
- Ogni riga mostra: icona colorata, nome, importo, data

**Lista "Ultime transazioni":**
- Le 5 transazioni più recenti, cliccabili per aprire un modale di dettaglio/modifica

---

### 2. Transazioni (`/transactions`)

Gestione completa delle entrate e uscite:

**Header con:**
- Bottone "Aggiungi transazione" → apre modale
- Filtri: tipo (tutte/entrate/uscite), categoria (select), mese (date picker mese/anno), ricerca testo libero

**Tabella transazioni:**
- Colonne: Data | Descrizione | Categoria (badge colorato) | Importo (verde se income, rosso se expense)
- Ordinabile per data e importo
- Paginazione lato client (20 righe per pagina)
- Riga cliccabile → modale modifica/eliminazione

**Modale "Aggiungi / Modifica transazione":**
- Campi: tipo (radio income/expense), importo (input numerico), valuta (select), categoria (select con icone), descrizione (input testo), data (date input, default oggi)
- Se valuta ≠ EUR, mostra il tasso di cambio live fetched da Frankfurter API e il controvalore in EUR
- Validazione client-side prima del submit

**Categorie di spesa predefinite** (con icona Lucide e colore HEX):
`Casa`, `Cibo & Ristoranti`, `Trasporti`, `Salute`, `Intrattenimento`, `Abbigliamento`, `Tecnologia`, `Istruzione`, `Viaggi`, `Regali`, `Risparmio`, `Altro`

**Categorie di entrata predefinite:**
`Stipendio`, `Freelance`, `Investimenti`, `Regalo`, `Rimborso`, `Altro`

---

### 3. Abbonamenti (`/subscriptions`)

Tracciamento di tutte le spese ricorrenti:

**Vista card grid (non tabella):**
- Ogni card ha: colore personalizzabile, nome, importo + ciclo, prossima data, badge categoria, badge "Attivo/Sospeso"
- Bottone edit e delete su hover

**Modale "Aggiungi / Modifica abbonamento":**
- Campi: nome, importo, valuta, ciclo (weekly/monthly/quarterly/yearly), categoria, prossima data di rinnovo, colore (color picker), note
- Calcola e mostra il costo mensile equivalente in tempo reale

**Sezione "Riepilogo costi":**
- 3 card: costo mensile totale | costo annuale totale | risparmio potenziale (abbonamenti sospesi)

**Notifiche di rinnovo:**
- Al lancio dell'app, se un abbonamento ha `next_billing_date` entro 3 giorni, mostra una notifica Electron (`new Notification`) e un banner in-app non dismissibile fino a interazione utente

**Auto-aggiornamento date:**
- Quando l'app si avvia, controlla gli abbonamenti con `next_billing_date` passata e aggiorna la data al prossimo ciclo

---

### 4. Budget (`/budget`)

Gestione dei limiti di spesa mensili per categoria:

**Vista mese corrente:**
- Per ogni categoria con budget impostato: barra di progresso (Recharts o CSS custom) che mostra speso/limite
- Colore barra: verde < 70%, giallo 70-90%, rosso > 90%
- Sotto la barra: `€X spesi di €Y`

**Bottone "Imposta budget":**
- Modale con select categoria + input importo mensile
- Possibilità di copiare i limiti del mese scorso

**Alert di sforamento:**
- Se una categoria supera il 90% del budget, mostra una notifica in-app con banner colorato

---

### 5. Obiettivi di risparmio (`/goals`)

Feature creativa: tracciamento di obiettivi finanziari personali:

**Vista card:**
- Nome obiettivo, icona emoji personalizzabile, data target (opzionale)
- Barra di progresso circolare (SVG custom o Recharts `RadialBarChart`) con percentuale di completamento
- Bottone "Aggiungi fondi" → modale per incrementare `current_amount`
- Badge "Completato!" se `current_amount >= target_amount`

**Modale "Nuovo obiettivo":**
- Campi: nome, importo target, importo già risparmiato, data obiettivo (opzionale), colore, icona (select da set predefinito)

**Card "Proiezione:"**
- Se l'utente indica un risparmio mensile medio, calcola e mostra la data stimata di raggiungimento dell'obiettivo

---

### 6. Report (`/reports`)

Analisi e visualizzazione dei dati storici:

**Filtro periodo:** select mese singolo, trimestre, anno, o range personalizzato

**Grafici disponibili:**
1. **Entrate vs Uscite per mese** — `BarChart` raggruppato, ultimi 12 mesi
2. **Trend spese per categoria** — `AreaChart` con serie multiple, per il periodo selezionato
3. **Top categorie di spesa** — `HorizontalBarChart` ordinato per importo

**Tabella riepilogativa:**
- Per categoria: importo speso, numero transazioni, media per transazione

**Export CSV:**
- Bottone "Esporta CSV" che usa `electron.dialog.showSaveDialog` per salvare le transazioni del periodo filtrato in CSV

---

### 7. Impostazioni (`/settings`)

**Sezione "Profilo finanziario":**
- Nome utente (mostrato nel TopBar)
- Valuta principale (select: EUR, USD, GBP, CHF, ...)
- Locale per la formattazione (it-IT, en-US, ...)

**Sezione "Saldo iniziale":**
- Input numerico per impostare il saldo di partenza (usato nel calcolo del saldo attuale)
- Spiegazione testuale: "Inserisci il tuo saldo al momento in cui hai iniziato a usare questa app"

**Sezione "Tema":**
- Toggle light/dark mode (applica classe `dark` al root, Tailwind dark mode: 'class')

**Sezione "Dati":**
- Bottone "Esporta backup (JSON)" — serializza tutto il DB in JSON e salva file tramite dialog
- Bottone "Importa backup (JSON)" — ripristina da file JSON
- Bottone "Reset completo" con doppia conferma — elimina tutti i dati e resetta il DB

---

## IPC Architecture (Electron ↔ React)

Usa il pattern `contextBridge` + `ipcRenderer`/`ipcMain`. Esponi nel `preload.js` un oggetto `window.api` con metodi async per ogni operazione CRUD.

Esempio struttura `preload.js`:

```js
contextBridge.exposeInMainWorld('api', {
  // Transactions
  getTransactions: (filters) => ipcRenderer.invoke('transactions:get', filters),
  addTransaction: (data) => ipcRenderer.invoke('transactions:add', data),
  updateTransaction: (id, data) => ipcRenderer.invoke('transactions:update', id, data),
  deleteTransaction: (id) => ipcRenderer.invoke('transactions:delete', id),

  // Subscriptions
  getSubscriptions: () => ipcRenderer.invoke('subscriptions:get'),
  addSubscription: (data) => ipcRenderer.invoke('subscriptions:add', data),
  updateSubscription: (id, data) => ipcRenderer.invoke('subscriptions:update', id, data),
  deleteSubscription: (id) => ipcRenderer.invoke('subscriptions:delete', id),

  // Budget
  getBudget: (month) => ipcRenderer.invoke('budget:get', month),
  setBudget: (data) => ipcRenderer.invoke('budget:set', data),

  // Goals
  getGoals: () => ipcRenderer.invoke('goals:get'),
  addGoal: (data) => ipcRenderer.invoke('goals:add', data),
  updateGoal: (id, data) => ipcRenderer.invoke('goals:update', id, data),
  deleteGoal: (id) => ipcRenderer.invoke('goals:delete', id),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // System
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),

  // Currency
  getExchangeRate: (from, to) => ipcRenderer.invoke('currency:getRate', from, to),
})
```

Nel `main.js`, registra ogni handler con `ipcMain.handle(channel, handler)`. Gli handler eseguono le query SQLite tramite `better-sqlite3` (sincrono, non async, thread-safe in Electron main process).

---

## Chiamata API cambio valute (Frankfurter)

Nel main process, implementa l'handler `currency:getRate`:

```js
ipcMain.handle('currency:getRate', async (event, from, to) => {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)
    const data = await res.json()
    return { rate: data.rates[to], date: data.date }
  } catch (e) {
    return { rate: null, error: 'Impossibile ottenere il tasso di cambio' }
  }
})
```

Cache il risultato in memoria per 30 minuti per evitare troppe richieste.

---

## Design e UI

**Palette colori (Tailwind custom config):**

```js
// tailwind.config.js
colors: {
  primary: { DEFAULT: '#6366f1', 50: '#eef2ff', 500: '#6366f1', 700: '#4338ca' },
  income: '#10b981',   // verde
  expense: '#ef4444',  // rosso
  warning: '#f59e0b',
}
```

**Layout generale:**
- Sidebar fissa a sinistra (240px), TopBar in cima
- Sfondo: `gray-50` (light) / `gray-900` (dark)
- Sidebar: `white` / `gray-800`, con logo in cima e nav links con icone
- Contenuto principale: padding `p-6`, max-width `1200px` centrato

**Sidebar nav links** (con icone Lucide):
- 🏠 Dashboard
- ↕️ Transazioni  
- 🔄 Abbonamenti
- 📊 Budget
- 🎯 Obiettivi
- 📈 Report
- ⚙️ Impostazioni

**Card stile:** `bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4`

**Tipografia:** usa `Inter` via CSS import (Google Fonts), body 14px, headings 500/600 weight.

---

## Qualità del codice

- Ogni componente React deve essere in un file separato
- Usa custom hooks per tutta la logica data-fetching (`useTransactions`, `useBudget`, ecc.)
- Gestisci sempre loading state (skeleton loader o spinner) e error state
- Tutte le operazioni DB nel main process devono avere try/catch con log dell'errore
- Non usare `any` type annotation — se usi TypeScript, tipa tutto; altrimenti JSDoc opzionale
- I modal usano `<dialog>` HTML nativo o un wrapper React senza librerie esterne
- Nessuna dipendenza esterna per la gestione dello stato globale (usa React Context + useReducer)

---

## Sequenza di esecuzione

Esegui in questo ordine:

1. **Setup progetto**: inizializza `package.json`, installa tutte le dipendenze, configura Vite + Tailwind + Electron
2. **Database**: crea `db.js` con schema e funzioni CRUD
3. **Main process**: `main.js` + `preload.js` + tutti gli handler IPC
4. **Layout shell**: `App.jsx` con routing, `Sidebar.jsx`, `TopBar.jsx`
5. **Componenti UI atomici**: Button, Card, Badge, Modal, Input, Select, Spinner
6. **Pagina Dashboard**: completamente funzionante con dati reali dal DB
7. **Pagina Transazioni**: CRUD completo
8. **Pagina Abbonamenti**: CRUD + notifiche + riepilogo
9. **Pagina Budget**: impostazione limiti + progress bar
10. **Pagina Obiettivi**: CRUD + proiezione
11. **Pagina Report**: grafici + export CSV
12. **Pagina Impostazioni**: preferenze + backup/restore
13. **Test end-to-end**: verifica che l'app si avvii con `npm run dev` senza errori in console
14. **electron-builder config**: prepara `electron-builder.json` per build su macOS/Windows/Linux

Alla fine, fornisci le istruzioni di installazione e avvio in un file `README.md`.
