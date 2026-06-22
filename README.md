# Finanza Personale

Applicazione desktop per la gestione delle finanze personali, costruita con Electron, React 18, Vite, Tailwind CSS e SQLite.

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
