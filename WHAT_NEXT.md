# MoneyLove — WHAT_NEXT.md

Documento di memoria per la prossima sessione di sviluppo.
Riassume scope, stato attuale e proposte per scalare il prodotto in modo naturale.

---

## 1. Scope

MoneyLove è un'applicazione desktop per la gestione delle finanze personali.

Obiettivo dell'app: aiutare l'utente a tracciare entrate/uscite, abbonamenti, budget e obiettivi di risparmio, fornendo report chiari e un assistente AI (LoveAI) che interpreti i dati in linguaggio naturale.

Target: utenti privati che cercano un'alternativa locale, semplice e con un tocco umano ai fogli Excel o alle app bancarie complesse.

Stack tecnico:
- Electron + Vite + React 18 + TypeScript
- Tailwind CSS v3
- better-sqlite3 (persistenza locale)
- electron-store (preferenze e stato finestra)
- Recharts (grafici)
- date-fns (date)
- Frankfurter API (tassi di cambio)
- OpenAI / Anthropic Claude (LoveAI)
- Framer Motion (animazioni)

---

## 2. Stato attuale (al termine della sessione precedente)

### Funzionalità implementate

- Onboarding obbligatorio al primo avvio (nome, valuta, saldo iniziale, tema, locale di sistema).
- Splash screen animata all'avvio.
- Layout con Sidebar e TopBar, routing tra pagine.
- Dashboard con saldo, entrate/uscite, abbonamenti, grafici e liste recenti.
- Transazioni: CRUD completo, filtri per tipo/categoria/mese/testo, ordinamento, paginazione, conversione valuta con `amount_eur`.
- Abbonamenti: CRUD, riepilogo costi, notifiche di rinnovo, auto-aggiornamento date.
- Budget mensili per categoria con barre di progresso e alert.
- Obiettivi di risparmio con progresso circolare, proiezione e confetti al completamento.
- Report con filtri di periodo, grafici ed export CSV.
- Impostazioni: profilo, valuta, locale, saldo iniziale, tema, backup/restore JSON, reset dati.
- LoveAI: chat in streaming con OpenAI/Anthropic, context builder, insight automatico opzionale in Dashboard, API key cifrata con `electron.safeStorage`.
- Rebranding a MoneyLove con design “soft fintech” (palette corallo/indaco, animazioni leggere).

### Note tecniche

- Database SQLite in `userData/finanza.db`.
- IPC con `contextBridge` e handler separati in `electron/ipc/`.
- `out/` e `dist/` sono ignorati da Git.
- Progetto pubblicato su `https://github.com/ImBlue444/money-manager`.

### Issue/correzioni note

- Avvio con DevTools aperto genera messaggi innocui `Autofill.enable` / `Autofill.setAddresses`. Non sono errori funzionali.
- Occasionalmente il processo GPU di Electron crasha in ambiente dev (probabilmente legato a DevTools/macOS sandbox). Da monitorare su build firmata.
- La UI è desktop-only: non ottimizzata per finestre molto piccole.
- Mancano test automatici.

---

## 3. Proposte di integrazione

### A. Quick wins (basso sforzo, alto impatto)

1. **Tasti scorciatoia da tastiera**
   - `Cmd/Ctrl + T` per nuova transazione.
   - `Cmd/Ctrl + 1-7` per navigare tra le pagine.
   - `Cmd/Ctrl + K` per command palette di ricerca.

2. **Migliorare gli stati vuoti**
   - Illustrazioni/icone simpatiche quando non ci sono transazioni, abbonamenti, budget o obiettivi.
   - CTA diretto per aggiungere il primo elemento.

3. **Esporta PDF report**
   - Aggiungere un pulsante “Salva come PDF” nella pagina Report.

4. **Categorie personalizzabili**
   - Permettere all'utente di aggiungere, modificare e cancellare categorie con colore e icona.

5. **Notifiche in-app centralizzate**
   - Un piccolo badge/centro notifiche per rinnovi, budget quasi esauriti e abbonamenti scaduti.

### B. Feature core per scalare

6. **Transazioni ricorrenti / pianificate**
   - Creare transazioni che si ripetono automaticamente (stipendio, affitto, bollette).
   - Preview delle prossime occorrenze.

7. **Multi-conto / portafogli**
   - Permettere più conti (es. Conto corrente, Contanti, Risparmio).
   - Ogni transazione è associata a un conto.
   - Saldo per conto e saldo totale.

8. **Tag e note avanzate**
   - Aggiungere tag alle transazioni per analisi trasversali.
   - Allegare scontrini/fatture alle transazioni (PDF/immagini salvati localmente).

9. **Importazione dati**
   - Importare CSV bancari.
   - Supporto futuro a OFX/QIF.
   - Mappatura automatica delle colonne.

10. **Template transazioni**
    - Salvare transazioni frequenti come template per inserimento rapido.

### C. AI / LoveAI

11. **Supporto locale Ollama**
    - Permettere di usare modelli locali senza chiave API, per la privacy.
    - Aggiungere provider “Ollama” nelle impostazioni.

12. **Azioni via chat**
    - L'utente scrive: “Aggiungi 50€ di benzina di ieri” e LoveAI crea la transazione.
    - Richiede parsing sicuro e conferma dell'utente.

13. **Insight programmati**
    - Rapporto settimanale/mensile generato automaticamente e mostrato all'avvio.
    - Possibilità di riceverlo come notifica.

14. **Budget intelligenti**
    - LoveAI suggerisce limiti di budget basati sulla media storica di spesa per categoria.

15. **Voice input**
    - Dettare una transazione o una domanda al microfono.

### D. Esperienza utente e design

16. **Command palette globale (`Cmd/Ctrl + K`)**
    - Cerca transazioni, naviga pagine, azioni rapide.

17. **Tema automatico**
    - Seguire il tema di sistema di default.

18. **Responsive / resize**
    - Layout più robusto per finestre piccole (collassa sidebar, griglie adattive).

19. **Animazioni più leggere**
    - Ridurre animazioni se l'utente preferisce motion reduced.

20. **Onboarding guidato**
    - Breve tour interattivo dopo l'onboarding per mostrare le sezioni principali.

### E. Affidabilità, sicurezza e piattaforma

21. **Test automatici**
    - Unit test per `db.ts` e `aiContext.ts`.
    - Smoke test per l'avvio dell'app con Playwright/Spectron.

22. **Cifratura database**
    - Opzione per cifrare il file SQLite con passphrase.

23. **Backup automatici**
    - Backup giornaliero in una cartella scelta dall'utente.

24. **Auto-updater**
    - Integrare `electron-updater` per aggiornamenti automatici.

25. **Code signing e build**
    - Firma macOS (Developer ID) e Windows.
    - Build CI/CD con GitHub Actions.
    - Notarization per macOS.

26. **Cloud sync (opzionale)**
    - Sincronizzazione crittografata end-to-end tra dispositivi (es. via iCloud, Dropbox o backend proprio).

### F. Monetizzazione / growth

27. **Modello freemium**
    - Versione gratuita con feature base.
    - Pro con AI avanzata, multi-conto, report PDF, cloud sync.

28. **Onboarding da template**
    - Template preimpostati per studenti, famiglie, freelance.

29. **Analytics anonime**
    - Tracciare quali feature vengono usate di più (opt-in) per guidare lo sviluppo.

---

## 4. Roadmap suggerita

### Fase 1 — Solidificare (prossima sessione consigliata)
- Scorciatoi da tastiera + command palette.
- Stati vuoti migliorati.
- Correggere/verificare crash GPU e warning Autofill.
- Aggiungere test di base per db e AI context.

### Fase 2 — Potenziare il core
- Transazioni ricorrenti.
- Categorie personalizzabili.
- Import CSV.
- Multi-conto.

### Fase 3 — LoveAI avanzato
- Ollama locale.
- Azioni via chat (aggiungi transazione).
- Insight programmati.

### Fase 4 — Crescita
- Auto-updater + code signing.
- Cloud sync opzionale.
- Freemium / Pro.

---

## 5. Decisioni da prendere prima della prossima sessione

1. Vuoi procedere con la **Fase 1** (quick wins + stabilità) o preferisci saltare a una feature specifica?
2. La priorità va data alla **privacy locale** (Ollama, cifratura DB) o alla **produttività** (scorciatoie, transazioni ricorrenti)?
3. Vuoi introdurre una **versione Pro a pagamento** in futuro o restare open-source/gratuita?
4. C'è bisogno di supporto **multi-lingua completo** oltre all'italiano e all'inglese?

---

Ultimo aggiornamento: 2026-06-22
