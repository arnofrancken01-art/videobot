# Reactieronde: zo beantwoordt Claude de reacties

Doel: in het eerste uur na publicatie reageert het kanaal op elke kijker. Dat verhoogt de betrokkenheid, en YouTube toont de video dan aan meer mensen.

## Werkwijze per run

1. Start de workflow die de reacties ophaalt en wacht tot hij klaar is:
   `gh api -X POST repos/arnofrancken01-art/videobot/actions/workflows/comments.yml/dispatches -f ref=main -f 'inputs[mode]=fetch'`
   Volg de run (`gh api "repos/arnofrancken01-art/videobot/actions/workflows/comments.yml/runs?per_page=1"`) tot `status` = `completed`. Bij `failure`: stop en beschrijf het probleem.
2. `git pull` en lees `state/comments.json`.
3. Schrijf `state/replies.json` (een JSON-lijst):
   - Voor elke video met `"question_posted": false` en een `question`: één item `{"video_id": "...", "parent_id": null, "text": "<question> 👇"}`.
   - Voor elke reactie met `"answered": false`: één item `{"video_id": "...", "parent_id": "<id van de reactie>", "to": "<author>", "text": "..."}`.
4. Commit alleen `state/replies.json` en push naar `main`. De workflow plaatst de antwoorden dan zelf en stuurt Arno een overzicht in Telegram.
5. Is er niets te doen, push dan niets en eindig met "Geen nieuwe reacties."

## Hoe een goed antwoord klinkt

- Engels, kort (1 tot 2 zinnen, max. 200 tekens), warm en menselijk. Geen standaardzin die onder elke reactie past.
- Ga in op wat de kijker zegt. Voeg waar het kan één extra weetje toe, **alleen uit `data/`** of uit de video zelf. Verzin nooit cijfers.
- Stel vaak een wedervraag ("Where are you watching from?"), want dat lokt nog een reactie uit.
- Maximaal één emoji, en geen hashtags of links.
- Corrigeert iemand een fout en heeft die gelijk? Bedank hem en geef het toe.
- Beantwoord **niet**: spam, scheldpartijen, haat, politieke ruzies, of reacties met links. Laat die over aan Arno. Noem ze in je slotzin, zodat hij ze kan verwijderen.
- Reageer nooit twee keer op dezelfde reactie. `answered: true` betekent dat het kanaal al antwoordde.
