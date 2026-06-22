# MoneyLove Mobile — Documento Tecnico Funzionale

**Versione:** 1.0  
**Data:** 2026-06-22  
**Destinatari:** DEV mobile, Product Owner, QA  
**Obiettivo:** Definire la naturale evoluzione mobile dell’app desktop **MoneyLove** in React Native, mantenendo la parità funzionale core e adattando l’esperienza utente a smartphone iOS/Android.  
**Stato:** Specifica di porting basata sul codice sorgente desktop attuale (`/Users/dbadagliacca/Sites/prove/money-manager`).

---

## 1. Introduzione e scope

MoneyLove desktop è un’app Electron + React + SQLite per la gestione delle finanze personali. La versione mobile deve offrire la stessa logica di business (transazioni, abbonamenti, budget, obiettivi, report, LoveAI) in un’esperienza ottimizzata per touch, schermi piccoli e uso “in movimento”.

**Scope IN:**
- Parità funzionale con il desktop per tutte le feature core.
- Persistenza offline-first su SQLite locale.
- Backup/restore compatibile JSON con il desktop.
- LoveAI con i 3 provider (OpenAI, Anthropic, Gemini) e modelli Economy/Performance.
- Notifiche locali per rinnovi abbonamenti.
- Tema chiaro/scuro.

**Scope OUT (futuro):**
- Sincronizzazione cloud tra dispositivi.
- Autenticazione utente.
- Scansione scontrini con camera (potenziale quick win futuro).

---

## 2. Sintesi dell’app desktop (stato attuale)

| Aspetto | Implementazione desktop |
|---|---|
| Stack | Electron 35, React 18, TypeScript, Vite, Tailwind CSS v3, better-sqlite3 |
| UI | Sidebar fissa 240px + routing `react-router-dom`, componenti custom in `src/components/ui` |
| Stato | `SettingsContext` per settings; custom hooks per dominio |
| DB SQLite | `userData/finanza.db`, WAL mode, schema in `src/lib/db.ts` |
| AI | Streaming chat + insight, provider OpenAI/Anthropic/Gemini, chiavi cifrate con `electron.safeStorage` |
| FX | Frankfurter API con cache 30min |
| Backup | JSON via dialog nativi, CSV export |
| Notifiche | OS notification per rinnovi imminenti |

### Feature implementate
Onboarding, Splash, Dashboard, Transazioni (CRUD, filtri, paginazione), Abbonamenti (CRUD, rinnovo, notifiche), Budget mensili, Obiettivi di risparmio, Report con grafici, Impostazioni, LoveAI.

---

## 3. Strategia di porting

1. **Replicare il modello dati** su SQLite React Native con schema identico (compatibilità backup JSON desktop ↔ mobile).
2. **Riscrivere i componenti UI** in React Native, mantenendo il design system (colori, font, spaziature) ma adattando layout e interazioni.
3. **Sostituire l’IPC Electron** con un layer di servizi TypeScript che usa direttamente il DB SQLite.
4. **Mantenere la business logic** di `src/lib/db.ts`, `src/lib/aiContext.ts`, `src/lib/formatters.ts` il più possibile identica (porte logiche).
5. **Adattare le integrazioni native**: notifiche push locali, file system, keychain, tema, locale.
6. **Fase 1 = feature parity offline**; sincronizzazione cloud in fase successiva solo se richiesta.

---

## 4. Architettura target

```
┌─────────────────────────────────────────┐
│  React Native UI (screens, components)  │
│  Navigation: bottom tabs + stack        │
├─────────────────────────────────────────┤
│  State: SettingsContext + custom hooks  │
│  (Zustand opzionale per UI state)       │
├─────────────────────────────────────────┤
│  Business Logic / Services              │
│  • TransactionService                   │
│  • SubscriptionService                  │
│  • BudgetService                        │
│  • GoalService                          │
│  • ReportService                        │
│  • AiService                            │
│  • BackupService                        │
├─────────────────────────────────────────┤
│  Storage layer                          │
│  • SQLite (expo-sqlite / op-sqlite)     │
│  • SecureStore (API keys)               │
│  • AsyncStorage/MMKV (prefs minori)     │
├─────────────────────────────────────────┤
│  Native modules                         │
│  • Notifications (expo-notifications)   │
│  • FileSystem + DocumentPicker/Sharing  │
│  • Localization                         │
│  • Keychain / Biometrics                │
├─────────────────────────────────────────┤
│  External APIs                          │
│  • Frankfurter (FX)                     │
│  • OpenAI / Anthropic / Gemini          │
└─────────────────────────────────────────┘
```

---

## 5. Stack tecnico consigliato

| Livello | Libreria consigliata | Note |
|---|---|---|
| Framework | **Expo SDK 52+** (managed workflow) | Semplifica native modules, build EAS, notifiche, file system. |
| Router | **Expo Router** (file-based) oppure `@react-navigation/native` | Expo Router riduce boilerplate e allinea a React Router. |
| SQLite | **`expo-sqlite`** (o `op-sqlite` per performance avanzate) | Schema portabile quasi 1:1 da better-sqlite3. |
| Secure storage | **`expo-secure-store`** | Sostituisce `electron.safeStorage` per le API key. |
| Local prefs | **`@react-native-async-storage/async-storage`** o **MMKV** | Per stato non sensibile; le app settings restano su SQLite. |
| Styling | **NativeWind** (Tailwind per RN) oppure StyleSheet + theme tokens | NativeWind velocizza il porting delle classi Tailwind esistenti. |
| Icons | **`lucide-react-native`** o `@expo/vector-icons` | Mappare i nomi Lucide desktop agli icon set nativi. |
| Grafici | **`react-native-gifted-charts`** o `victory-native-xl` | Sostituisce Recharts. |
| Date picker | **`@react-native-community/datetimepicker`** | Per form date su mobile. |
| Notifiche | **`expo-notifications`** | Per reminder rinnovi abbonamenti. |
| File sharing | **`expo-sharing`**, **`expo-document-picker`**, **`expo-file-system`** | Backup JSON / CSV. |
| Localizzazione | **`expo-localization`** + `i18next` | Locale e formati. |
| Markdown AI | **`react-native-markdown-display`** | Sostituisce `react-markdown`. |
| Form validation | **`react-hook-form`** + **`zod`** | Consigliato per form mobile. |
| Animazioni | **`react-native-reanimated`** | Sostituisce framer-motion. |
| Biometria | **`expo-local-authentication`** | Opzionale, per sblocco app. |

**Alternative valide:** se si preferisce RN bare, usare `react-native-sqlite-storage` + `react-native-keychain`; se si vuole massima performance, `op-sqlite`.

---

## 6. Modello dati (SQLite)

Il database mobile deve essere **compatibile al 100%** con il backup JSON desktop. Di seguito lo schema aggiornato con indici consigliati per mobile.

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  amount_eur REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,              -- yyyy-MM-dd
  currency TEXT DEFAULT 'EUR',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions(strftime('%Y-%m', date));

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('weekly','monthly','quarterly','yearly')),
  category TEXT NOT NULL,
  next_billing_date TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'credit-card',
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);

CREATE TABLE IF NOT EXISTS budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  monthly_limit REAL NOT NULL,
  month TEXT NOT NULL,             -- yyyy-MM
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_category_month ON budget(category, month);

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

### Dizionario dati

| Entità | Campo chiave | Tipo | Note |
|---|---|---|---|
| Transaction | `amount` / `amount_eur` | number | `amount_eur` calcolato al salvataggio tramite tasso di cambio. |
| Subscription | `is_active` | integer | 1 attivo, 0 sospeso. |
| Subscription | `billing_cycle` | string | `weekly`, `monthly`, `quarterly`, `yearly`. |
| Budget | `month` | string | `yyyy-MM`. |
| Goal | `target_date` | string \| null | `yyyy-MM-dd`. |
| Settings | `value` | string | Tutti i valori sono stringhe (anche booleani numerici). |

### Chiavi settings (`SettingsMap`)

| Chiave | Default | Descrizione |
|---|---|---|
| `base_currency` | `EUR` | Valuta di visualizzazione principale |
| `locale` | da sistema | Locale per formattazione |
| `theme` | `light` | `light` / `dark` |
| `starting_balance` | `0` | Saldo iniziale (stringa) |
| `username` | `Utente` | Nome utente |
| `onboarding_completed` | `false` | Gate primo avvio |
| `ai_provider` | `openai` | `openai` \| `anthropic` \| `gemini` |
| `ai_model` | modello performance provider | ID modello, anche custom |
| `ai_auto_insight` | `false` | Genera insight automatico in Dashboard |

---

## 7. Mappatura funzionalità e requisiti

### 7.1 Onboarding

| ID | Requisito |
|---|---|
| ON-01 | Al primo avvio, se `onboarding_completed !== 'true'`, mostrare flusso onboarding a schermo intero. |
| ON-02 | Raccogliere: nome, valuta principale, saldo iniziale, tema, locale. |
| ON-03 | Il locale viene pre-proposto da `expo-localization`. |
| ON-04 | Al termine salvare settings in SQLite e impostare `onboarding_completed='true'`. |
| ON-05 | Possibilità di riaprire onboarding dalle impostazioni (opzionale). |

### 7.2 Splash

| ID | Requisito |
|---|---|
| SP-01 | Mostrare splash animato per ~2.2s all’avvio, poi navigare a Dashboard o Onboarding. |
| SP-02 | Su mobile usare logo + animazione Lottie/Reanimated leggera. |

### 7.3 Dashboard

| ID | Requisito |
|---|---|
| DB-01 | Schermata home con scroll verticale. |
| DB-02 | Card riepilogative: saldo attuale, entrate mese, uscite mese, costo abbonamenti attivi. |
| DB-03 | Grafico andamento saldo ultimi 6 mesi. |
| DB-04 | Grafico donut/torta spese per categoria del mese corrente. |
| DB-05 | Lista “Prossimi abbonamenti” (max 3). |
| DB-06 | Lista “Ultime transazioni” (max 5). |
| DB-07 | Se `ai_auto_insight='true'` e chiave API presente, generare insight in background. |
| DB-08 | Pull-to-refresh per aggiornare dati. |
| DB-09 | Floating Action Button (FAB) per aggiungere transazione rapida. |

### 7.4 Transazioni

| ID | Requisito |
|---|---|
| TX-01 | Lista paginata/transazionale con filtri: tipo, categoria, mese, testo. |
| TX-02 | Filtri espandibili in bottom sheet o header compresso. |
| TX-03 | Ogni riga mostra: icona categoria, descrizione, data, importo in valuta base. |
| TX-04 | Swipe left/right per modificare/eliminare. |
| TX-05 | Modal/form per aggiungere/modificare: tipo, importo, valuta, categoria, descrizione, data. |
| TX-06 | Se valuta ≠ `base_currency`, mostrare tasso attuale e importo convertito. |
| TX-07 | Al salvataggio calcolare `amount_eur` usando tasso Frankfurter (cache 30min). |
| TX-08 | Fallback: se FX non disponibile, `amount_eur = amount`. |
| TX-09 | Paginazione infinita o classica (20 item/pagina). |

### 7.5 Abbonamenti

| ID | Requisito |
|---|---|
| SB-01 | Lista card verticali con nome, importo, ciclo, prossima scadenza, stato attivo/sospeso. |
| SB-02 | Riepilogo: costo mensile, costo annuo, risparmio potenziale da sospesi. |
| SB-03 | Banner rinnovo per abbonamenti attivi con scadenza ≤ 3 giorni. |
| SB-04 | Form aggiunta/modifica: nome, importo, valuta, ciclo, categoria, data prossimo addebito, colore, icona, note, stato. |
| SB-05 | Preview costo mensile equivalente nel form. |
| SB-06 | Possibilità di sospendere/riattivare un abbonamento. |
| SB-07 | All’avvio aggiornare `next_billing_date` finché non è ≥ oggi (stessa logica desktop). |
| SB-08 | Notifica locale 3 giorni prima del rinnovo. |

### 7.6 Budget

| ID | Requisito |
|---|---|
| BG-01 | Selettore mese. |
| BG-02 | Lista categorie con progress bar speso/limite. |
| BG-03 | Colori stati: verde <70%, giallo 70-90%, rosso >90%. |
| BG-04 | Banner alert se almeno un budget supera il 90%. |
| BG-05 | Form per impostare/modificare limite categoria. |
| BG-06 | Azione “Copia mese precedente”. |
| BG-07 | Mostrare importo speso calcolato sulle transazioni del mese. |

### 7.7 Obiettivi

| ID | Requisito |
|---|---|
| GO-01 | Griglia 2 colonne di card obiettivo con icona, nome, progresso circolare. |
| GO-02 | Card dettaglio per obiettivo: target, attuale, %, data target. |
| GO-03 | Form aggiunta: nome, target, data target, colore, icona, note. |
| GO-04 | Azione “Aggiungi fondi” che incrementa `current_amount`. |
| GO-05 | Confetti/animazione al completamento (`current_amount >= target_amount`). |
| GO-06 | Sezione proiezione: risparmio mensile stimato → data completamento stimata. |

### 7.8 Report

| ID | Requisito |
|---|---|
| RP-01 | Selettore periodo: mese, trimestre, anno, range custom. |
| RP-02 | Grafico entrate vs uscite. |
| RP-03 | Grafico top categorie. |
| RP-04 | Grafico trend categorie. |
| RP-05 | Tabella riepilogo categoria: speso, conteggio, media. |
| RP-06 | Export CSV delle transazioni del periodo. |
| RP-07 | Condivisione file CSV via share sheet nativo. |

### 7.9 LoveAI

| ID | Requisito |
|---|---|
| AI-01 | Schermata chat stile messaggistica con bolle user/assistant. |
| AI-02 | Selettore periodo di riferimento in header. |
| AI-03 | Chip domande suggerite. |
| AI-04 | Streaming della risposta; append chunk in tempo reale. |
| AI-05 | Render markdown nella risposta. |
| AI-06 | Supporto provider OpenAI, Anthropic, Gemini. |
| AI-07 | Selezione modello Economy/Performance + custom. |
| AI-08 | Salvataggio chiave API per provider in SecureStore. |
| AI-09 | Insight automatico in Dashboard (opzionale). |
| AI-10 | Messaggio di errore chiaro se chiave mancante/invalida. |

### 7.10 Impostazioni

| ID | Requisito |
|---|---|
| ST-01 | Sezioni raggruppate: Profilo, Tema, LoveAI, Dati. |
| ST-02 | Modifica nome, valuta, locale, saldo iniziale, tema. |
| ST-03 | Configurazione LoveAI: provider, modello (select + custom), API key, toggle insight automatico. |
| ST-04 | Badge “Economy” / “Performance” sul modello. |
| ST-05 | Esporta backup JSON. |
| ST-06 | Importa backup JSON (desktop/mobile compatibile). |
| ST-07 | Reset completo dati con doppia conferma. |
| ST-08 | Informazioni app / versione. |

---

## 8. Navigazione e schermate

### Struttura consigliata (bottom tabs + stack)

```
Root (Stack)
├── SplashScreen
├── OnboardingFlow
├── MainTabs
│   ├── DashboardTab      → DashboardScreen (stack locale: AIInsightDetail)
│   ├── TransactionsTab   → TransactionsList → TransactionForm
│   ├── AddTab            → QuickAddScreen / TransactionForm (opzionale)
│   ├── BudgetTab         → BudgetScreen → BudgetForm
│   └── SettingsTab       → SettingsScreen (stack locale: AISettings, Backup, About)
├── AIChatStack
│   └── AIAdvisorScreen
├── SubscriptionsStack
│   ├── SubscriptionsList
│   └── SubscriptionForm
├── GoalsStack
│   ├── GoalsList
│   ├── GoalForm
│   └── GoalDetail
└── ReportsStack
    ├── ReportsScreen
    └── CSVShare
```

**Note UX:** per mobile è consigliato un **FAB centrale** nella bottom bar per aggiungere una transazione rapidamente, oppure un tab “Aggiungi”.

### Mappatura route desktop → mobile

| Route desktop | Schermata/e RN |
|---|---|
| `/` | `DashboardScreen` |
| `/transactions` | `TransactionsListScreen` → `TransactionFormScreen` |
| `/subscriptions` | `SubscriptionsListScreen` → `SubscriptionFormScreen` |
| `/budget` | `BudgetScreen` → `BudgetFormScreen` |
| `/goals` | `GoalsScreen` → `GoalFormScreen` / `GoalDetailScreen` |
| `/reports` | `ReportsScreen` |
| `/ai` | `AIAdvisorScreen` |
| `/settings` | `SettingsScreen` (con sezioni interne) |

---

## 9. Componenti UI e design system

### Palette colori (mantenere identica)

| Token | Hex | Uso |
|---|---|---|
| `primary.DEFAULT` | `#e0526c` | Brand, CTA, accenti |
| `primary.500` | `#e0526c` | Pulsanti primari |
| `secondary.DEFAULT` | `#6366f1` | Grafici, icone secondarie |
| `income` | `#10b981` | Entrate, under budget |
| `expense` | `#ef4444` | Uscite, over budget |
| `warning` | `#f59e0b` | Alert, abbonamenti |
| `love.dark` | `#18151a` | Sfondo dark |
| `love.card-dark` | `#201c23` | Card dark |
| `cream` | `#fffafa` | Sfondo chiaro |

### Tipografia
- **Heading:** Poppins (o font system su iOS/Android).
- **Body:** Inter / Roboto / San Francisco.
- Dimensioni: `xs 12`, `sm 14`, `base 16`, `lg 18`, `xl 20`, `2xl 24`.

### Componenti core da replicare

| Componente desktop | Equivalente RN |
|---|---|
| `Button` | `<Button variant="primary/secondary/danger/ghost" size="sm/md/lg" loading />` |
| `Card` | `<Card>` con stile glass/border radius 16-20, shadow leggera. |
| `Input` | `<TextInput>` con label, stati error/disabled. |
| `Select` | `<Picker>` (iOS/Android nativo) o bottom sheet select custom. |
| `Modal` | `react-native-modal` o bottom sheet nativo. |
| `Badge` | `<Badge color>` |
| `Spinner` | `ActivityIndicator` |
| `CategoryIcon` | Mapping nome categoria → icona vector |
| `BrandLogo` | SVG/Lottie del logo |
| `AnimatedBackground` | Gradienti statici o animazioni leggere |

### Icone
Mappare i nomi Lucide desktop alle icone nativi:
- Usare `lucide-react-native` se si vuole parità esatta.
- Oppure mappare su `@expo/vector-icons/Feather` o `MaterialCommunityIcons`.

### Dark mode
- Usare `Appearance` API.
- Applicare classi/tema dark globalmente; tutti i componenti devono supportare `colors.dark`.

---

## 10. Integrazioni esterne

### 10.1 Frankfurter — Tassi di cambio

- **Endpoint:** `GET https://api.frankfurter.app/latest?from={from}&to={to}`
- **Risposta:** `{ rates: { [to]: number }, date: string }`
- **Logica mobile:** cache in memoria 30 min; fallback rate=1 se `from===to`; se API fallisce, salvare `amount_eur = amount`.

### 10.2 OpenAI

- **Streaming:** `POST https://api.openai.com/v1/chat/completions`
- **Headers:** `Authorization: Bearer {key}`, `Content-Type: application/json`
- **Body:** `{ model, messages, stream: true, temperature: 0.7, max_tokens: 2048 }`
- **Delta:** `choices[0].delta.content`

### 10.3 Anthropic Claude

- **Streaming:** `POST https://api.anthropic.com/v1/messages`
- **Headers:** `x-api-key`, `anthropic-version: 2023-06-01`
- **Delta:** `delta.text`

### 10.4 Google Gemini

- **Streaming:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={key}`
- **Non-streaming:** `:generateContent?key={key}`
- **Delta:** `candidates[0].content.parts[].text`

### 10.5 Sicurezza API key su mobile

**Attenzione:** su mobile la chiave API risiede nel dispositivo (anche in SecureStore) e le richieste partono dall’app. Questo espone la chiave a reverse engineering.

**Raccomandazioni:**
1. **Opzione A (semplice, parità desktop):** chiave salvata in `expo-secure-store`, chiamate dirette HTTPS. Accettabile per utenti advanced che gestiscono chiavi personali.
2. **Opzione B (sicura):** backend proxy che riceve i dati aggregati e inoltra a OpenAI/Anthropic/Gemini. La chiave rimane server-side. Richiede infrastruttura e costi.
3. **Opzione C (privacy-first):** modello on-device via `expo-ml` / ONNX / llama.cpp. Da valutare in futuro (Ollama).

Per la Fase 1 si consiglia l’**Opzione A** con chiaro disclaimer all’utente.

---

## 11. Sicurezza e privacy

| Aspetto | Implementazione |
|---|---|
| API key | `expo-secure-store` (iOS keychain / Android Keystore). |
| DB locale | SQLite in app container; opzionale cifratura con `sqlcipher` o `op-sqlite` encryption. |
| Backup JSON | Salvato in documenti app / condiviso; non cifrato di default. Opzionale password zip. |
| Sblocco app | Biometria opzionale (`expo-local-authentication`). |
| Trasmissione | Tutte le chiamate AI/FX in HTTPS. |
| Dati AI | Invio solo di dati aggregati (no PII, no transazioni grezze con nomi se non necessario). |

---

## 12. Persistenza, backup e sincronizzazione

### 12.1 Offline-first
- L’app funziona senza rete per lettura/scrittura locale.
- FX rate e AI richiedono rete.
- Notifiche locali calcolate sui dati locali.

### 12.2 Backup JSON
- Formato identico al desktop:
  ```ts
  { transactions, subscriptions, budget, goals, settings }
  ```
- Export: scrivere JSON in cache → `expo-sharing`.
- Import: `expo-document-picker` → parsing → transazione SQLite atomica (`BEGIN...COMMIT`).

### 12.3 Migratione desktop → mobile
1. Desktop: Settings → Esporta backup JSON.
2. Mobile: Impostazioni → Importa backup JSON.
3. Import sovrascrive tutti i dati locali mobile.

### 12.4 Sincronizzazione futura (fuori scope Fase 1)
- Possibile con backend proprio o iCloud/Dropbox.
- Richiede conflict resolution (last-write-wins o CRDT).

---

## 13. Notifiche locali

| Evento | Trigger | Contenuto |
|---|---|---|
| Rinnovo abbonamento | `next_billing_date - 3 giorni`, ore 09:00 | “Rinnovo {nome} il {data}” |
| Budget quasi esaurito | Superamento 90% spesa | “Hai superato il 90% del budget {categoria}” |
| Obiettivo raggiunto | Al completamento | “Obiettivo {nome} completato!” |

**Implementazione:** `expo-notifications`, scheduling al boot e dopo ogni modifica abbonamenti.

---

## 14. LoveAI su mobile

### Requisiti specifici
- La chat deve essere scrollable e mantenere lo storico in memoria durante la sessione.
- Lo streaming deve aggiornare la UI con `setState` parziale (concatenazione chunk).
- Il periodo selezionato influenza il contesto finanziario inviato al modello.
- Il context builder (`buildFinancialContext`) può essere portato quasi identico.
- Supporto 3 provider con logica di streaming specifica per ciascuno.

### Provider/Modelli

| Provider | Economy | Performance |
|---|---|---|
| OpenAI | `gpt-5.4-mini` | `gpt-5.4` |
| Anthropic | `claude-haiku-4-5` | `claude-sonnet-4-6` |
| Gemini | `gemini-3.5-flash` | `gemini-3.5-pro` |

- Modello custom consentito tramite input testuale.
- Default: provider `openai`, modello performance.

### Chiavi
- Una chiave per provider, salvata separatamente in SecureStore.
- Non sincronizzare le chiavi via backup JSON.

---

## 15. Testing

| Tipo | Scope | Strumenti |
|---|---|---|
| Unit | `db.ts`, `aiContext.ts`, `formatters.ts`, service functions | Jest |
| Integration | Query SQLite, backup/restore, FX cache | Jest + expo-sqlite mock |
| E2E | Onboarding, CRUD transazione, generazione insight | Maestro o Detox |
| Manual | Dark mode, rotazione, offline, notifiche | — |

### Casi di test critici
1. Onboarding → Dashboard.
2. Aggiunta transazione in valuta estera → corretto `amount_eur`.
3. Sospensione abbonamento → risparmio aggiornato.
4. Superamento budget → alert.
5. Completamento obiettivo → confetti.
6. Export/import backup JSON.
7. Chat LoveAI con streaming.
8. Reset dati.

---

## 16. Build e rilascio

### Versioning
- Seguire semantic versioning: `1.0.0` mobile iniziale.
- Build number incrementale per store.

### Expo EAS
- `eas build --platform ios` / `android`
- `eas submit` per App Store / Play Store.

### Requisiti store
- **Privacy policy:** dichiarare uso di OpenAI/Anthropic/Gemini solo su richiesta utente con chiave propria.
- **Account deletion:** non applicabile (dati locali).
- **Backup:** descrivi import/export.

---

## 17. Piano di implementazione

### Fase 1 — Fondamenta (2-3 settimane)
- Setup Expo, SQLite, tema, design system base.
- Porta `db.ts` + schema.
- SettingsContext e Onboarding.
- Splash e Dashboard base.

### Fase 2 — Core parity (3-4 settimane)
- Transazioni CRUD + filtri.
- Abbonamenti + notifiche.
- Budget.
- Obiettivi.
- Report + grafici.
- Impostazioni.

### Fase 3 — LoveAI (1-2 settimane)
- Integrazione provider e streaming.
- Chat UI.
- Insight automatico.
- SecureStore API keys.

### Fase 4 — Polish e rilascio (1-2 settimane)
- Dark mode completo.
- Backup/restore.
- Export CSV.
- Test, bugfix, build store.

---

## 18. Decisioni da confermare / Rischi

| # | Domanda / Decisione | Impatto |
|---|---|---|
| 1 | **Expo managed workflow vs bare React Native?** | Expo velocizza; bare dà più controllo nativo. |
| 2 | **Chiamate AI dirette dall’app vs backend proxy?** | Sicurezza chiave API. |
| 3 | **Libreria SQLite:** `expo-sqlite` vs `op-sqlite`? | Performance e cifratura. |
| 4 | **Libreria grafici:** `react-native-gifted-charts` vs `victory-native`? | Qualità grafica e manutenibilità. |
| 5 | **Biometria per sblocco app?** | Sicurezza aggiuntiva. |
| 6 | **Sincronizzazione cloud in futuro?** | Architettura dati e backend. |
| 7 | **Notifiche push remote o solo locali?** | Locali sono sufficienti per i reminder. |
| 8 | **Supporto tablet?** | Layout adattivo o solo smartphone. |

### Rischi principali
- **Performance SQLite su grandi dataset:** usare indici e paginazione.
- **Compatibilità backup desktop/mobile:** mantenere schema identico.
- **Esperienza offline AI:** gestire errori di rete gracefully.
- **Sicurezza API key:** valutare backend proxy per versione Pro.

---

## Appendice A — Categorie

### Spese
| Nome | Colore | Icona Lucide |
|---|---|---|
| Casa | `#f59e0b` | `Home` |
| Cibo & Ristoranti | `#ef4444` | `UtensilsCrossed` |
| Trasporti | `#3b82f6` | `Bus` |
| Salute | `#10b981` | `HeartPulse` |
| Intrattenimento | `#8b5cf6` | `Film` |
| Abbigliamento | `#ec4899` | `Shirt` |
| Tecnologia | `#6366f1` | `Laptop` |
| Istruzione | `#14b8a6` | `GraduationCap` |
| Viaggi | `#0ea5e9` | `Plane` |
| Regali | `#f43f5e` | `Gift` |
| Risparmio | `#22c55e` | `PiggyBank` |
| Altro | `#6b7280` | `CircleHelp` |

### Entrate
| Nome | Colore | Icona Lucide |
|---|---|---|
| Stipendio | `#10b981` | `Briefcase` |
| Freelance | `#6366f1` | `User` |
| Investimenti | `#f59e0b` | `TrendingUp` |
| Regalo | `#ec4899` | `Gift` |
| Rimborso | `#3b82f6` | `RotateCcw` |
| Altro | `#6b7280` | `CircleHelp` |

---

## Appendice B — Mappatura IPC desktop → Servizi RN

| `window.api` desktop | Servizio RN | Note |
|---|---|---|
| `getTransactions(filters)` | `TransactionService.getAll(filters)` | — |
| `addTransaction(data)` | `TransactionService.create(data)` | calcola `amount_eur` |
| `updateTransaction(id, data)` | `TransactionService.update(id, data)` | — |
| `deleteTransaction(id)` | `TransactionService.remove(id)` | — |
| `getTransactionMonths()` | `TransactionService.getMonths()` | — |
| `getSubscriptions()` | `SubscriptionService.getAll()` | — |
| `addSubscription/update/delete` | `SubscriptionService.*` | — |
| `getBudget(month)` | `BudgetService.getWithSpending(month)` | — |
| `setBudget/deleteBudget` | `BudgetService.*` | — |
| `getGoals/add/update/delete` | `GoalService.*` | — |
| `getAllSettings/setSetting` | `SettingsService.*` | SQLite settings |
| `getAiApiKey/saveAiApiKey` | `SecureStore` wrapper | provider-specific |
| `sendAiMessage` | `AiService.sendMessage(...)` | streaming |
| `generateInsight` | `AiService.generateInsight(...)` | non-streaming |
| `currency:getRate` | `FxService.getRate(from, to)` | cache |
| `dashboard:summary` | `DashboardService.getSummary(month)` | aggregazione |
| `reports:summary` | `ReportService.getSummary(from, to)` | aggregazione |
| `backup:save/load` | `BackupService.export/import` | file system |
| `csv:export` | `CsvService.export(rows)` | share sheet |
| `data:reset` | `DatabaseService.reset()` | — |
| `system:getLocale` | `expo-localization` | — |
| `dialog:showSave/showOpen` | `expo-document-picker` / `expo-sharing` | — |

---

## Appendice C — Dipendenze desktop da sostituire

| Desktop | Mobile |
|---|---|
| `electron` | `expo` |
| `better-sqlite3` | `expo-sqlite` / `op-sqlite` |
| `electron-store` | `expo-secure-store` + `AsyncStorage`/MMKV |
| `electron.safeStorage` | `expo-secure-store` |
| `react-router-dom` | `expo-router` / `@react-navigation/native` |
| `recharts` | `react-native-gifted-charts` / `victory-native` |
| `lucide-react` | `lucide-react-native` / `@expo/vector-icons` |
| `framer-motion` | `react-native-reanimated` |
| `react-markdown` | `react-native-markdown-display` |
| `tailwindcss` | `nativewind` |
| `electron-builder` | `eas build` / `eas submit` |

---

**Prossimo passo consigliato:** confermare le decisioni in §18 (in particolare Expo vs bare, SQLite library, sicurezza API key) in modo da poter partire con lo scaffolding del progetto mobile.
