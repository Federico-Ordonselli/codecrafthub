# CodeCraftHub

Dashboard e API REST per tenere traccia dei corsi da studiare, realizzate con HTML, Node.js ed Express. Non richiedono database o autenticazione.

## Installazione e avvio

Installa Node.js e npm, poi dalla cartella del progetto esegui:

```bash
npm install
npm start
```

Il server ascolta su `http://localhost:5000`. Apri questo indirizzo nel browser per usare la dashboard. Gli endpoint JSON sono disponibili su `http://localhost:5000/api/courses`.

## Struttura e salvataggio

```text
codecrafthub/
├── index.html
├── src/
│   ├── app.js
│   └── courses.json
├── package.json
└── README.md
```

`src/app.js` contiene server, validazione e operazioni sui file. I dati vengono letti e scritti in `src/courses.json`, creato automaticamente se manca. Il file `data/courses.json` eventualmente presente non viene usato. Il percorso del file dipende dalla posizione di `app.js`, non dalla cartella da cui lanci il comando.

## Funzionalità ed endpoint

| Metodo | Percorso | Operazione |
| --- | --- | --- |
| POST | `/api/courses` | Crea un corso |
| GET | `/api/courses` | Elenca i corsi |
| GET | `/api/courses/stats` | Totale corsi e conteggi per stato |
| GET | `/api/courses/:id` | Legge un corso |
| PUT | `/api/courses/:id` | Aggiorna un corso |
| DELETE | `/api/courses/:id` | Elimina un corso |

`:id` è un numero, per esempio `/api/courses/1`. La sola barra finale `/api/courses/` restituisce l'elenco, non identifica un corso.

Nome, descrizione, data e stato sono obbligatori. `target_date` deve essere una data reale nel formato `YYYY-MM-DD`. Gli stati ammessi sono `Not Started`, `In Progress` e `Completed`. Il server genera `id` (da 1, poi massimo ID presente più 1) e `created_at`. Eliminando il corso con l'ID più alto, quell'ID può essere riutilizzato.

### Creare un corso

```bash
curl -i -X POST http://localhost:5000/api/courses \
  -H 'Content-Type: application/json' \
  -d '{"name":"REST API Fundamentals","description":"Imparare Node.js ed Express","target_date":"2026-12-31","status":"Not Started"}'
```

Risposta: `201 Created`, con il corso e i campi generati.

### Leggere i corsi

```bash
curl http://localhost:5000/api/courses
curl http://localhost:5000/api/courses/1
```

Risposta: `200 OK`, rispettivamente con un array o un oggetto.

### Statistiche dei corsi

```bash
curl http://localhost:5000/api/courses/stats
```

Risposta `200 OK`, per esempio:

```json
{
  "total": 3,
  "byStatus": {
    "Not Started": 1,
    "In Progress": 2,
    "Completed": 0
  }
}
```

Se non ci sono corsi, tutti i conteggi sono zero.

### Aggiornare un corso

```bash
curl -i -X PUT http://localhost:5000/api/courses/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"REST API Fundamentals","description":"Costruire API con Express","target_date":"2026-12-31","status":"In Progress"}'
```

Invia tutti e quattro i campi obbligatori. La risposta `200 OK` contiene il corso aggiornato; `id` e `created_at` restano invariati.

### Eliminare un corso

```bash
curl -i -X DELETE http://localhost:5000/api/courses/1
```

Risposta: `200 OK`, con un messaggio e il corso eliminato.

## Errori e risoluzione dei problemi

- `400`: campi mancanti, data o stato non validi, oppure JSON della richiesta malformato. Il campo `error` spiega il problema.
- `404`: il corso richiesto non esiste.
- `500`: errore di lettura/scrittura o contenuto non valido nel file dati. Controlla anche il terminale del server.
- `Cannot find module 'express'`: esegui `npm install` nella cartella del progetto.
- `EADDRINUSE`: la porta 5000 è occupata. Arresta l'altra istanza prima di riavviare.
- `Cannot GET /...`: controlla il percorso; l'elenco è su `/api/courses`.
- File dati danneggiato: fai una copia prima di correggerlo. Deve contenere un array JSON; `[]` rappresenta un elenco vuoto, ma sostituire i dati con `[]` elimina i corsi.

Puoi usare il browser per le richieste GET. Per creare, aggiornare ed eliminare usa curl, Postman o Insomnia. Le richieste con un corpo JSON devono avere l'header `Content-Type: application/json`.

Il salvataggio su file è pensato per esercitazioni locali. Evita modifiche simultanee: questa versione non coordina scritture concorrenti. Conserva una copia dei dati che vuoi mantenere.
