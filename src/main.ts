import Phaser from 'phaser';
import { Boot, Splash, Title, Teams, Summary } from './scenes/menus';
import { Match } from './scenes/match';
import { Hud } from './scenes/hud';
import { loadSettings } from './data';

loadSettings();

async function fontsReady() {
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* police de secours */ }
}

fontsReady().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0d0b24',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, width: 480, height: 270 },
    input: { activePointers: 4 },
    scene: [Boot, Splash, Title, Teams, Match, Hud, Summary],
  });
  (window as any).__game = game;
});
