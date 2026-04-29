# Umami Traffic Report — n8n Workflow

Ein wöchentlicher und monatlicher HTML-E-Mail-Report für deine Umami-Website. Ein **AI Agent** ruft selbstständig die richtigen Umami-MCP-Tools auf, vergleicht die aktuelle Periode mit Vorperiode + Vorjahr und schreibt eine designte E-Mail mit Tiles, Sparkline, Top-Movern, Channel-Mix, Top-Tabellen und konkreten Maßnahmen.

## Datenfluss

```
Schedule Mo 08:00 ─┐                                   ┌─ OpenAI Chat Model
                   ├─ period=weekly  ─┐                ├─ Umami MCP Tool
                   │                  ├─ Compute Period ─→ Config ─→ AI Agent ─→ Sanitize ─→ Send Email
Schedule 1st 08:00 ┴─ period=monthly ─┘                
```

- **Compute Period** berechnet exakte Kalender-Boundaries: letzte volle KW (Mo–So) bzw. letzter voller Monat, plus Vorperiode und Vorjahresperiode in `Europe/Berlin`.
- **AI Agent** ruft `get_stats` (3×: aktuell, Vorperiode, Vorjahr), `get_pageviews` (Sparkline-Daten), `get_metrics` (path, referrer, country, channel, device, browser, utmSource, utmCampaign, event) und vergleicht selbst.
- **Sanitize HTML** strippt Tool-Use-Leaks und Markdown-Fences, falls das Modell sich nicht ans Format hält.

## Voraussetzungen

| Was | Wozu |
|---|---|
| Umami MCP Server erreichbar (HTTP) | tools/call gegen `/mcp` |
| Umami-Zugangsdaten | werden vom MCP-Server an Umami weitergereicht |
| OpenAI-API-Key (oder OpenAI-kompatibles Endpoint) | LLM-Backend für den Agent |
| SMTP-Credential | Versand der HTML-Mail |
| Min. **14 Tage Daten** in Umami | sonst Vorperiodenvergleich leer |
| Optional: UTM-getaggte Links + Custom Events | für Kampagnen- & Conversion-Sektionen |

## Modell

Das Modell **muss Function-Calling beherrschen**. Empfehlung:

| Modell | Eignung |
|---|---|
| `gpt-4.1` | ✅ ideal |
| `gpt-4.1-mini` (Default im Workflow) | ✅ gutes Preis/Leistung |
| `gpt-4o-mini` | ✅ ok |
| `gpt-oss-120b`, kleinere lokale Modelle | ❌ simulieren Tool-Calls als Text — Reports werden leer |

Bei OpenAI-kompatiblen Endpoints (Mistral, Together, Groq, lokales LLM) im OpenAI-Credential die Base-URL überschreiben.

## Setup (5 Minuten)

1. **Workflow importieren** (`umami-traffic-report.json`).
2. **Config-Node** öffnen → drei Werte eintragen:
   - `mcpUrl` (komplette MCP-Endpoint-URL inkl. `/mcp`, z.B. `https://umami.example.com/mcp`)
   - `fromEmail` (Absender)
   - `toEmail` (Empfänger)
   *(Die websiteId wird per Header gesetzt — siehe Schritt 4.)*
3. **Send Email** → SMTP-Credential auswählen.
4. **Umami MCP Tool** → *HTTP Multiple Headers Auth*-Credential anlegen mit den Headern:
   - `X-Umami-Url`: deine Umami-Instance-URL
   - `X-Umami-Username`: Umami-Login
   - `X-Umami-Password`: Umami-Passwort
   - `X-Umami-Website-Id`: Website-UUID (Default-Website für alle Tool-Calls). Damit muss der Agent die UUID nie selbst tippen — verhindert Truncation-Fehler bei kleineren Modellen.
5. **OpenAI Chat Model** → OpenAI-Credential auswählen.
6. Workflow aktivieren.

**Manueller Test:** Trigger-Node anwählen → *Execute Workflow*. Mit dem Mo-Trigger startest du einen Wochenreport, mit dem 1.-Trigger einen Monatsreport.

## Trigger-Verhalten

- **Mo 08:00**: Wochenreport für die zuvor abgeschlossene Kalenderwoche.
- **1. eines Monats 08:00**: Monatsreport für den abgeschlossenen Vormonat.
- Wenn der 1. zufällig ein Montag ist, feuern beide — dann gehen zwei Mails raus (gewollt: Wochen- *und* Monatsreport).

## Was im Report steckt

- **Hero-Header** mit Zeitraum.
- **5 KPI-Tiles**: Pageviews, Visitors, Visits, Bounce-Rate, Avg. Session — jeweils mit Δ% zur Vorperiode + YoY.
- **Headline-Box**: in einem Satz der wichtigste Befund.
- **Sparkline** der Pageviews über die Periode (CSS-Bars, mailclient-kompatibel).
- **Top-Mover**: 3 Pages mit größtem Zugewinn / 3 mit größtem Verlust.
- **Channel-Mix** als horizontale Stacked Bar mit Legende.
- **Top 5 Pages** und **Top 5 Quellen** mit Δ.
- **Audience-Block**: Top-Länder + Device-Split.
- **3–5 konkrete Maßnahmen** mit Ziel-Metrik.

## Kosten (Richtwert)

Pro Run macht der Agent rund 12–18 Tool-Calls + 2–4 LLM-Iterationen. Mit `gpt-4.1-mini`:

| Trigger | Runs/Monat | Kosten ca. |
|---|---|---|
| Wochenreport | 4 | ~ 0,10 – 0,30 € |
| Monatsreport | 1 | ~ 0,03 – 0,08 € |

Mit `gpt-4.1` rund 5× teurer, dafür hochwertigere Insights.

## Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| Mail enthält `Calling Umami_MCP_Tool_…` als Text | Modell unterstützt Function-Calling nicht zuverlässig | stärkeres Modell (siehe Tabelle oben) |
| Tool-Calls schlagen mit `500` und einer **trunkierten UUID** im Pfad fehl (z.B. `…-9b08-…` statt `…-358b-4ae1-9b08-…`) | Modell vergisst Mittel-Segmente der UUID — Tokenisierungs-Effekt bei kleineren Modellen | Im Multi-Header-Credential den Header `X-Umami-Website-Id` setzen — der MCP-Server löst die ID dann selbst auf, der Agent sieht die UUID nie. |
| Mail leer / nur Header | Tools haben Fehler geliefert oder Modell hat kein HTML produziert | Execution-Log im Agent-Node prüfen, ggf. Credentials checken |
| Δ-Werte fehlen | Site jünger als die Vergleichsperiode (z.B. <14 Tage alt) | normal — wird der Wochenreport ab Tag 15 sinnvoll |
| Sparkline leer | `get_pageviews` lieferte leere Series | TZ und Datumsbereich im Compute-Period-Code-Node prüfen |
| Falsche Zeitzone in Datums-Labels | abweichende TZ in Umami-Backend | im Compute-Period-Node `Europe/Berlin` ggf. anpassen |

## Anpassen

- **Andere Sprache**: System-Message im Agent ist deutsch. Englisch: einfach umformulieren, Datums-/Zahlenformat im Code-Node anpassen.
- **Andere Kadenz**: Trigger-Cron-Expressions ändern (täglich, 14-tägig …). `Compute Period` muss entsprechend mitgezogen werden.
- **Empfänger pro Kunde**: zwischen `Sanitize HTML` und `Send Email` einen Set-Node einfügen, der `toEmail` aus einem Lookup setzt.
- **Mehr/weniger Sektionen**: System-Message ist die einzige Stelle — Sektionen ergänzen oder weglassen.
