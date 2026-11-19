# Transmission à Claude — Radio BREK (19 novembre 2026)

**Statut : branche de préparation uniquement. Ne pas fusionner ni déployer sans validation.**

Le fondateur demande une intégration conservatrice du Flash Info de Monique à 06:00 heure d'Haïti, sans toucher au reste de la programmation existante.

## Séquence validée
1. 06:00 : ouverture « Majestic Fanfare ».
2. Flash Info de Monique avec fond musical majestueux discret pendant son introduction.
3. Reprise de « Majestic Fanfare » à la fin du journal.
4. « L’Internationale » avec son environnement visuel **séparé** de celui de Monique.
5. Reprise des autres musiques déjà programmées, sans changement.

## Identité et interface
- Conserver **strictement le portrait officiel existant de Monique** : ne pas recréer son visage, ne pas modifier son apparence.
- Conserver l'environnement visuel RTV BREK / Flash Info déjà validé pour la télévision; adapter à la radio sans le confondre avec l'illustration de L’Internationale.
- Égaliseur réellement synchronisé à l'audio, boutons lecture/pause fonctionnels.
- Masquer dans l'interface publique les libellés techniques « Majestic Fanfare », « Recommencer », « Passer au Flash », « Écouter ».
- Ne pas remplacer le fichier radio/index.html en production sans comparaison, validation et test.

## Fichiers de référence préparés dans la conversation ChatGPT
- Radio-BREK-final-visuels-separes.html : prototype autonome (~26 Mo).
- radio-brek.html / radio-brek-code.txt : prototype allégé (~4,9 Ko), à utiliser avec les médias séparés.
- monique.png : portrait (~3,1 Mo).
- Majestic Fanfare.mp3 : 69,24 s.
- Flash Info Jeudi 19 Novembre(1).mp3 : 248,45 s.
- LINTERNATIONALE(1).mp3 : 399,49 s.

**Important : les fichiers binaires et le prototype local ne sont pas encore transférés dans cette branche.** Les noms ci-dessus sont un inventaire, pas des chemins GitHub vérifiés. Claude doit retrouver les médias existants dans le dépôt ou demander un transfert séparé avant intégration.

## Tâche demandée à Claude
Comparer le radio/index.html actuel au prototype de référence, proposer les changements minimaux, vérifier les chemins médias et l'heure locale de déclenchement. Soumettre un diff et une démonstration pour approbation. Ne pas modifier les autres émissions, horaires, playlists, rubriques ou pages du site.
