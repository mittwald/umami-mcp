# Umami MCP – Was es Marketern bringt

**In einem Satz:** Sprich mit deinen Webanalytics-Daten in natürlicher Sprache, direkt im KI-Chat – kein Dashboard-Klicken mehr.

## Konkrete Use-Cases

### 1. Reportings, die sich selbst schreiben
Statt jeden Montag Umami-Dashboards zusammenzuklicken: *„Bau mir einen Wochenreport für Demo Blog mit den größten Veränderungen vs. letzter Woche."* Fertig in 10 Sekunden – als Text, Tabelle oder Stichpunkt-Liste, copy-paste-fertig fürs Standup.

### 2. Kampagnen-Performance auf Zuruf
*„Wie performt meine `summer-sale` Kampagne? Welcher UTM-Source liefert die längsten Sessions?"* Der Assistent zieht sich UTM-Daten, Visitors und Bounce-Rate, und gibt eine **Bewertung mit Empfehlung** zurück – nicht nur Zahlen.

### 3. Content-Decisions auf Basis echter Daten
*„Welche 5 Blog-Artikel haben in den letzten 3 Monaten am meisten Traffic verloren?"* → Liste mit Refresh-Kandidaten. *„Welche Landingpage hat die schlechteste Bounce-Rate?"* → klare Priorisierung für die Conversion-Optimierung.

### 4. SEO & Acquisition
*„Welche neuen Referrer sind in den letzten 7 Tagen aufgetaucht?"* Hilft bei Backlink-Discovery. *„Wie verteilt sich der Search-Traffic auf Google vs. Bing vs. DuckDuckGo?"* → Channel-Strategie-Input.

### 5. Audience-Verständnis
*„Aus welchen Ländern, welchen Devices, welchen Browsern kommen meine User?"* → Direkt umsetzbare Insights für Targeting, A/B-Tests und Lokalisierungs-Entscheidungen.

### 6. Webinar- und Event-Tracking
*„Wie viele Webinar-Anmeldungen sind in den letzten 14 Tagen reingekommen, gegliedert nach Quelle?"* Custom-Events werden genauso natürlich abgefragt wie Pageviews.

### 7. User-Journey-Analyse statt Dashboard-Detektivarbeit
*„Pick eine Session von gestern, die in einem Signup geendet hat, und zeig mir den kompletten Klickpfad."* Funnel-Verständnis ohne Funnel-Konfiguration.

### 8. Realtime-Monitoring im Chat
*„Wie viele Leute sind gerade auf der Seite und auf welchen Pages?"* Während die Newsletter-Kampagne live geht, ohne dass du das Dashboard offen halten musst.

### 9. Strategische Empfehlungen
*„Was sind meine Top-3-Marketing-Prioritäten für nächsten Monat basierend auf den letzten 90 Tagen?"* Die KI **interpretiert** die Daten, nicht nur reportet sie.

## Wo es überall läuft

Claude Desktop, Claude Code (CLI), Cursor, VS Code mit Copilot, **n8n** für Automatisierungen (*„Schick mir jeden Montag um 9 Uhr automatisch den Report in Slack"*), MCP Inspector zum Debuggen.

## Sicherheits-Pitch (für die IT-Abteilung)

- Server speichert **keine** Credentials, hält nichts auf Disk
- Read-only — kein Tool kann Daten in Umami ändern oder löschen
- Pro Verbindung eigene Session, Credentials nur im Speicher
- Open Source unter MIT, läuft im eigenen Container im eigenen Netz
- Optionaler URL-Allowlist-Schutz für öffentliche Deployments

## Klassisches Dashboard vs. MCP – wo der Unterschied wirklich auffällt

| Aufgabe | Dashboard | MCP + KI |
| --- | --- | --- |
| „Wieviel Traffic hatten wir gestern?" | 5 Sekunden | 5 Sekunden – Patt |
| „Vergleich der letzten 4 Wochen mit Anomalie-Hervorhebung" | 5 Min Klickerei | *„Erstell mir den Vergleich"* – fertig |
| „Welche 10 Pages müssen wir aktualisieren?" | Manuell ableiten | **Direkte Antwort** mit Begründung |
| „Was sagen mir die Daten?" | gar nicht | Das ist genau die Stärke |

**Bottom Line:** Das MCP macht Webanalytics konversational. Statt Daten zu extrahieren, **stellst du Fragen** – und kriegst Antworten, Empfehlungen und Reports auf die Hand.
