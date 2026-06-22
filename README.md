# MoneyLove

MoneyLove — applicazione desktop per la gestione delle finanze personali, con un tocco di colore e semplicità. Costruita con Electron, React 18, Vite, Tailwind CSS e SQLite.

## Stack tecnico

- **Electron** + **electron-vite**
- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS v3**
- **better-sqlite3** (persistenza locale)
- **electron-store** (preferenze e stato finestra)
- **Recharts** (grafici)
- **date-fns** (date)
- **Frankfurter API** (tassi di cambio)
- **OpenAI / Anthropic Claude** (LoveAI — richiede chiave API personale)

## Installazione

```bash
npm install
```

> Su macOS potrebbe essere necessario ricompilare `better-sqlite3` per l'ABI di Electron:
>
> ```bash
> npm run rebuild
> ```

## Avvio in sviluppo

```bash
npm run dev
```

## Build di produzione

```bash
npm run build
```

Per testare la build di produzione localmente:

```bash
npx electron .
```

## Creazione pacchetti distributivi

```bash
npm run dist
```

I pacchetti verranno generati nella cartella `dist/`.

## Struttura del progetto

```
├── electron/            # Processo principale e preload
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/             # Handler IPC
├── src/
│   ├── main.tsx         # Entry React
│   ├── App.tsx
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   └── context/
├── package.json
├── electron.vite.config.ts
├── tailwind.config.js
└── electron-builder.json
```

## Funzionalità

- Dashboard con saldo, entrate/uscite, abbonamenti, grafici e liste recenti
- Gestione transazioni con filtri, ordinamento, paginazione e cambio valuta
- Abbonamenti con notifiche di rinnovo e riepilogo costi
- Budget mensili per categoria con alert di sforamento
- Obiettivi di risparmio con proiezione
- Report con filtri di periodo, grafici ed export CSV
- Impostazioni, backup/restore JSON e reset dati
- **LoveAI** — assistente AI personale per interrogare e interpretare i propri dati finanziari

## LoveAI

Per usare l'assistente AI:

1. Vai in **Impostazioni → LoveAI**.
2. Scegli il provider (`OpenAI` o `Anthropic Claude`).
3. Inserisci la tua chiave API (cifrata localmente con `electron.safeStorage`).
4. Scegli il modello, es. `gpt-4o-mini` o `claude-3-haiku-20240307`.
5. Apri la pagina **LoveAI** dalla sidebar.

> I dati finanziari aggregati vengono inviati al provider LLM scelto. Non vengono memorizzati su server di MoneyLove.
