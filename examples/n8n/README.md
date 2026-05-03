# Umami Traffic Report — n8n Workflow

Ein wöchentlicher und monatlicher HTML-E-Mail-Report direkt gegen Umami's REST-API. Visuelle Pipeline aus HTTP-Request-Nodes, ein kleiner Aggregate-Code-Node, und ein AI-Agent als reiner HTML-Schreiber. Kein MCP-Server für diesen Workflow.

## Datenfluss

```
Schedule Mo 08:00 ─┐
                   ├─ period=weekly  ─┐
                   │                  ├─ Compute Period → Config → Login →
Schedule 1st 08:00 ┴─ period=monthly ─┘
   Stats → Pageviews → Metrics path → Metrics referrer → Metrics country →
   Metrics channel → Metrics device → Metrics event → Metrics path (prev) →
   Metrics referrer (prev) → Aggregate → AI Agent → Sanitize → Send Email
```

Die HTTP-Requests laufen sequentiell (jeder leitet seine Daten an den nächsten weiter). Aggregate liest am Ende per `$('NodeName').first().json` aus allen Vorgängern.

- **Compute Period**: berechnet exakte Kalender-Boundaries (letzte volle KW Mo–So bzw. letzter voller Monat) plus Vorperiode in `Europe/Berlin`. Output: ISO + Millisekunden für die HTTP-Request-Query.
- **Login**: POST `/api/auth/login` mit Username/Passwort aus dem Config-Node → liefert Bearer-Token.
- **HTTP-Request-Nodes** (parallel): Stats (mit eingebauter Vorperiodenkomparison), Pageviews (Sparkline-Series), 6× Metrics current (path, referrer, country, channel, device, event), 2× Metrics previous (path + referrer für Top-Mover). Jeder Node nutzt den Bearer-Token von `Login`.
- **Aggregate**: kleiner Code-Node bündelt alle Outputs zu einem JSON.
- **AI Agent**: keine Tools, schreibt nur HTML aus dem JSON.
- **Sanitize HTML**: strippt evtl. Markdown-Fences.
- **Send Email**: SMTP-Versand.

## Voraussetzungen

| Was | Wozu |
|---|---|
| Umami-Instance erreichbar (HTTP) | API-Calls aus n8n |
| Umami-Username + Passwort | Login → Bearer-Token |
| Website-UUID | aus dem Umami-Dashboard |
| OpenAI-API-Key | LLM-Backend für den Agent |
| SMTP-Credential | Versand der HTML-Mail |
| Min. 14 Tage Daten in Umami | sonst Vorperiodenvergleich leer |

## Setup

1. **Workflow importieren** (`umami-traffic-report.json`).
2. **Config-Node** öffnen → 6 Werte eintragen:
   - `umamiUrl` — z.B. `https://umami.example.com` (ohne trailing slash)
   - `umamiUsername`
   - `umamiPassword`
   - `websiteId` — UUID
   - `fromEmail`
   - `toEmail`
3. **OpenAI Chat Model** → OpenAI-Credential auswählen.
4. **Send Email** → SMTP-Credential auswählen.
5. Workflow aktivieren.

**Manueller Test:** Trigger-Node anwählen → *Execute Workflow*.

> **Sicherheit:** Username/Passwort liegen plaintext im Set-Node. Für persönliche Nutzung ok, ansonsten in n8n-Variables (`Settings → Variables`) auslagern und mit `={{ $vars.umamiUsername }}` referenzieren.

## Trigger-Verhalten

- **Mo 08:00**: Wochenreport für die zuvor abgeschlossene Kalenderwoche.
- **1. eines Monats 08:00**: Monatsreport für den abgeschlossenen Vormonat.
- 1. = Montag → beide feuern → zwei Mails.

## Was im Report steckt

- **Hero-Header** mit Zeitraum.
- **5 KPI-Tiles**: Pageviews, Visitors, Visits, Bounce-Rate, Avg. Session — jeweils mit Δ% zur Vorperiode.
- **Headline-Box**: in einem Satz der wichtigste Befund.
- **Sparkline** der Pageviews (CSS-Bars, mailclient-kompatibel).
- **Top-Mover**: 3 Pages-Gewinner / 3 Verlierer ggü. Vorperiode.
- **Channel-Mix** als horizontale Stacked Bar mit Legende.
- **Top 5 Pages** und **Top 5 Quellen**.
- **Audience-Block**: Top-Länder + Device-Split.
- **3–5 konkrete Maßnahmen** mit Ziel-Metrik.

## Modell

Empfehlung: `gpt-4.1-mini`. Da der Agent **keine Tools** mehr aufruft und nur HTML rendert, läuft das stabil auch mit schwächeren Modellen. Bei OpenAI-kompatiblen Endpoints (Mistral, Together, Groq, lokales LLM) im OpenAI-Credential die Base-URL überschreiben.

## Kosten (Richtwert)

Pro Run: 1 LLM-Call (kein Function-Calling). Mit `gpt-4.1-mini` ca. **0,01–0,03 €**. Pro Monat (4 Wochen + 1 Monat) ≈ **0,10 €**.

## Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| `Login` 401 | falsche Credentials oder Umami-URL | im Config-Node prüfen, `umamiUrl` ohne trailing slash |
| `Stats`/`Metrics` 500 mit leerem Body | falsche `websiteId` | UUID im Umami-Dashboard prüfen, exakt 36 Zeichen + 4 Bindestriche |
| Mail leer / nur Header | `Stats` lieferte 0 für die Periode | Site noch jung oder kein Traffic im Vormonat |
| Δ-Werte fehlen | Site jünger als die Vergleichsperiode | normal — Wochenreport ist ab Tag 15 sinnvoll |
| Falsche Zeitzone | abweichende TZ in Umami-Backend | im `Compute Period`-Code-Node `Europe/Berlin` ggf. anpassen |

## Anpassen

- **Andere Sprache**: System-Message im Agent ist deutsch. Englisch: einfach umformulieren, Zahlen-/Datums-Format im Code-Node anpassen.
- **Andere Kadenz**: Trigger-Cron-Expressions ändern. `Compute Period` muss entsprechend mitgezogen werden.
- **Empfänger pro Kunde**: zwischen `Sanitize HTML` und `Send Email` einen Set-Node einfügen, der `toEmail` aus einem Lookup setzt.
- **Mehr Metriken** (z.B. utmSource, utmCampaign, browser): bestehenden Metrics-Node duplizieren, `type` ändern, im Aggregate-Code-Node mit aufnehmen.
- **YoY-Vergleich**: `Compute Period` um `yoyStart`/`yoyEnd` erweitern, zusätzlichen Stats-Node hinzufügen, im Agent-Prompt aktivieren.
