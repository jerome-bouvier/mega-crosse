# Mega Crosse

Jeu de floorball arcade pour mobile, par **Boubou Gaming**. Prototype web v0.1.

**Jouer :** https://jerome-bouvier.github.io/mega-crosse/ (téléphone en mode paysage)

## Commandes

| Tactile | Clavier | Action |
| --- | --- | --- |
| Pouce sur la moitié gauche | Flèches / WASD | Se déplacer (joystick flottant) |
| Taper le gros bouton | Espace | Passe |
| Maintenir puis lâcher | Espace (maintenu) | Tir (plus c'est long, plus c'est fort) |
| Gros bouton sans la balle | Espace | Voler la balle |
| Bouton SUPER (jauge pleine) | K | Pouvoir de l'équipe |
| Bouton pause | P / Échap | Pause |

## Équipes

- **Caen Floorball** (Ragnar la panthère) : *Instinct Primal*, le prochain tir fonce au but (70 % de réussite).
- **Salamandres** de Montbazon (Magnus la salamandre) : *Turbo Salamandre*, vitesse et balle impossible à voler pendant 6 s.
- **Nantes Floorball** (Rouage l'éléphant mécanique) : *Défense Mobile*, le but glisse latéralement pendant 15 s.

## Développement

Phaser 3 + TypeScript + Vite.

```bash
npm install
npm run dev        # serveur local, ouvrable depuis un téléphone du même réseau (--host)
npm run build      # build dans dist/
SINGLE=1 npm run build   # build en un seul fichier HTML
```

Chaque push sur `main` redéploie le jeu sur GitHub Pages (`.github/workflows/pages.yml`).

Organisation du code :

- `src/data.ts` : équipes, réglages, palette
- `src/art.ts` : sprites pixel générés au démarrage
- `src/scenes/menus.ts` : splash, titre, choix d'équipe, résumé
- `src/scenes/match.ts` : terrain, physique de la balle, gardiens, IA
- `src/scenes/hud.ts` : score, chrono, mini-carte, joystick et boutons
- `src/sfx.ts` : bruitages rétro générés en WebAudio
