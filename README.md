# How to be a Hero – Character Creator

Eigenständiges Foundry-VTT-Modul für das System `how-to-be-a-hero`.

## Funktion

Beim regulären Erstellen eines Actors im Actors-Verzeichnis läuft zunächst der Foundry-Dialog. Nachdem ein Actor vom Typ **character** angelegt wurde, zeigt das Modul eine Auswahl:

- **Character Creator verwenden**: öffnet einen lokalen, vierstufigen Creator innerhalb von Foundry und ergänzt genau den gerade angelegten Actor.
- **Manuell fortfahren**: öffnet das normale leere How-to-be-a-Hero-Actor-Sheet.

NPCs und andere Actor-Typen behalten den normalen Erstellungsablauf. Das Modul bricht den Foundry-`preCreateActor`-Hook nicht mehr ab und erstellt keinen zweiten Actor für den Creator.

Der Creator übernimmt Name, Alter, Lebenspunkte, Portraitpfad, Angaben zur Erscheinung, Hintergrund, Fähigkeiten und Inventar. Fähigkeiten werden als eingebettete Items vom Typ `ability` mit `system.skillSet` `action`, `knowledge` oder `social` angelegt. Inventarzeilen werden als Items vom Typ `item` angelegt.

## Punktebudget

Das Gesamtbudget ist ein editierbares Zahlenfeld. Der Startwert beträgt **400**, kann aber frei geändert werden. Das Restbudget, die Punkte je Kategorie und die Kategorieboni werden bei jeder Eingabe sofort aktualisiert. Wird eine Fähigkeit entfernt, werden die Summen und Boni unmittelbar neu berechnet. Es gibt keine feste 400-Punkte-Grenze und keine feste Obergrenze für einzelne Fähigkeitswerte. Die Summe der zugewiesenen Fähigkeitspunkte darf das eingegebene Budget nicht überschreiten.

Die Kategorie-Boni werden wie im System berechnet: Summe der Fähigkeiten je Kategorie geteilt durch zehn und gerundet.

## Live-Punkte und Berufe

- Punktebudget und Fähigkeitswerte werden während der Eingabe live ausgewertet; es ist kein Wechsel des Menüs mehr nötig.
- Die Anzeige zeigt verteilte Punkte, das Restbudget beziehungsweise die Überschreitung, die Summe je Kategorie. Es gibt keinen Kategoriebonus; jeder Fähigkeitseintrag zählt exakt mit seinem eingegebenen Wert.
- Bei jeder Änderung einer Fähigkeit werden auch die angezeigten Endwerte aller Fähigkeiten derselben Kategorie aktualisiert.
- Das Entfernen einer Fähigkeit aktualisiert die Berechnung ebenfalls sofort.
- Das Berufsfeld bietet gruppierte historische Vorschläge für ungefähr 1850–1900 (Landwirtschaft, Handwerk, Industrie, Handel, Dienste und freie Berufe). Ein eigener Beruf kann weiterhin als Freitext eingetragen werden.

## Installation

1. Foundry VTT beenden.
2. Den Ordner `htbah-character-creator` aus diesem ZIP in `Data/modules/` kopieren.
3. Foundry starten und das Modul **How to be a Hero – Character Creator** in der Weltverwaltung aktivieren.
4. Im Actors-Verzeichnis einen Actor vom Typ **Character** erstellen und im Foundry-Dialog auf **Create Actor** klicken.
5. Danach erscheint die Auswahl zwischen Character Creator und manueller Bearbeitung.

Das Modul benötigt das System `how-to-be-a-hero` ab Version `1.1.19` und ist für Foundry VTT 13/14 ausgelegt.

## Technische Korrekturen in Version 1.0.4

- Der bisherige Eingriff in `preCreateActor` wurde entfernt. Stattdessen wird der native `Actor.createDialog`-Ablauf um die nachgelagerte Auswahl ergänzt. So erhält Foundry weiterhin ein regulär angelegtes Actor-Dokument und greift nicht auf ein fehlendes `sheet`-Objekt zu.
- Formulardaten liegen nun in `creatorState`. `ApplicationV2` besitzt bereits eine schreibgeschützte Eigenschaft `state`; diese wird nicht mehr überschrieben.
- Die Auswahlbuttons haben eine explizite Mindesthöhe und umbrechenden Text, damit die Beschreibungen nicht über die Schaltflächen laufen.
- Alte Testdaten mit eingebetteten Items vom ungültigen Typ `action` werden während `Actor.fromSource` vor der Embedded-Item-Validierung in den gültigen Item-Typ `ability` umgewandelt. Die Kategorie bleibt in `system.skillSet` erhalten.

## Ursprung / Lizenzhinweis

Der Ablauf orientiert sich am öffentlichen [How to be a hero character creator](https://github.com/Razzeee/htbah-character-creator). Das Original-Repository steht unter MIT-Lizenz; der Upstream-Lizenztext und Copyright-Hinweis sind in `LICENSE-upstream.txt` enthalten. Diese Foundry-Integration ist eine eigenständige Implementierung des Ablaufs.


## Änderungen in Version 1.0.5

- Live-Berechnung über ein delegiertes `input`-Event am Formular; Eingabe in Budget- und Fähigkeitsfeldern aktualisiert Summen ohne Neu-Rendern und ohne Fokusverlust.
- Live-Anzeige der Gesamtpunkte, des Restbudgets beziehungsweise einer Budgetüberschreitung, der Kategorie-Boni und der berechneten Fähigkeitswerte.
- Beim Hinzufügen oder Entfernen von Fähigkeiten wird die Anzeige nach dem Rendern sofort aus den vorhandenen Zeilen neu aufgebaut.
- Berufsauswahl als gruppiertes Dropdown mit historischen Berufen für ca. 1850–1900 plus Freitextoption.

## Historische Einordnung der Berufsvorschläge

Die Vorschlagsliste ist eine spielpraktische, deutschsprachige Auswahl und kein vollständiger historischer Berufskatalog. Ihre Bereiche und Beispiele orientieren sich unter anderem an britischen Volkszählungs-Berufsangaben von 1851–1871 sowie an bayerischen Erwerbs- und Berufsgruppen des 19. Jahrhunderts. Eigene Berufe bleiben deshalb möglich.

- [Occupations: census returns for 1851, 1861 and 1871 (Victorian Web)](https://victorianweb.org/victorian/history/census.html)
- [Social Mobility – occupational classification used by the royal Bavarian statistical office](https://epub.ub.uni-muenchen.de/25261/1/Social.pdf)
- [The National Archives – Census records and occupation terminology](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/census-records/)
