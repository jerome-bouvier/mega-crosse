import Phaser from 'phaser';

// Portraits pixel des mascottes (24 x 24). Un caractère = un pixel.
type Art = { pal: Record<string, string>; rows: string[] };

const ART: Record<string, Art> = {
  // Ragnar, la panthère de Caen (écharpe rouge et blanche)
  caen: {
    pal: { o: '#0b0a14', B: '#2c2a3c', H: '#4a4766', y: '#c8f05a', k: '#0b0a14', p: '#e07a9a', w: '#f4f1de', r: '#a3301c', R: '#e8423c', W: '#f4f1de' },
    rows: [
      '........................',
      '...oo..............oo...',
      '..oBBo............oBBo..',
      '..oBpBo..........oBpBo..',
      '..oBBBBoooooooooooBBBBo.',
      '...oBBBBBBBBBBBBBBBBBo..',
      '...oBBBBBBBBBBBBBBBBBo..',
      '..oBBBHHBBBBBBBBBHHBBBo.',
      '..oBByyyBBBBBBBBByyyBBo.',
      '..oBByykBBBBBBBBBkyyBBo.',
      '..oBByyyBBBBBBBBByyyBBo.',
      '..oBBBBBBBBHHBBBBBBBBBo.',
      '..oBBBBBBBBppBBBBBBBBBo.',
      '...oBBBBBBBBBBBBBBBBBo..',
      '...oBBBBBooBBBooBBBBBo..',
      '...oBBBBowoooooowBBBBo..',
      '....oBBBorrrrrrroBBBo...',
      '....oBBBBoooooooBBBBo...',
      '.....oBBBBBBBBBBBBBo....',
      '......ooBBBBBBBBBoo.....',
      '....ooRRRRRRRRRRRRRoo...',
      '...oRRRRWWRRRRRWWRRRRo..',
      '...oRRRRRRRRRRRRRRRRRo..',
      '....ooooooooooooooooo...',
    ],
  },
  // Magnus, la salamandre de Montbazon (noire à taches jaunes)
  sal: {
    pal: { o: '#0b0a14', B: '#34323f', Y: '#ffc62e', E: '#0b0a14', W: '#f4f1de', k: '#0b0a14', p: '#e07a9a' },
    rows: [
      '........................',
      '........................',
      '.......oooooooooo.......',
      '.....ooBBBBBBBBBBoo.....',
      '....oBBYYBBBBBBYYBBo....',
      '...oBBBYYBBBBBBYYBBBo...',
      '..oBBBBBBBBBBBBBBBBBBo..',
      '..oEEEBBBBBBBBBBBBEEEo..',
      '.oEWEEBBBBYYBBBBBEEWEEo.',
      '.oEEEEBBBYYYYBBBBEEEEEo.',
      '.oBEEBBBBBYYBBBBBBEEEBo.',
      '.oBBBBBBBBBBBBBBBBBBBBo.',
      '.oBBYYBBBBBBBBBBBBYYBBo.',
      '.oBBYYBBBBBBBBBBBBYYBBo.',
      '..oBBBBkkkkkkkkkkBBBBo..',
      '..oBBBBBkppppppkBBBBBo..',
      '...oBBBBBkkkkkkBBBBBo...',
      '....oBBBBBBBBBBBBBBo....',
      '.....oBBYYBBBBYYBBo.....',
      '.....oBBYYBBBBYYBBo.....',
      '....oBBBBBBBBBBBBBBo....',
      '...oBBBBBYYBBBBBBBBBo...',
      '...ooooooooooooooooo....',
      '........................',
    ],
  },
  // Rouage, l'éléphant mécanique de Nantes (métal, rivets cuivre, yeux lumineux)
  nan: {
    pal: { o: '#0b0a14', D: '#5b6178', M: '#9aa1b8', r: '#d98a35', g: '#d98a35', c: '#4fd1c5', w: '#f4f1de' },
    rows: [
      '........................',
      '..oooo............oooo..',
      '.oDDDDo..oooooo..oDDDDo.',
      'oDMMMMDooMMMMMMooDMMMMDo',
      'oDMrMMDoMMMMMMMMoDMMrMDo',
      'oDMMMMDoMMMggMMMoDMMMMDo',
      'oDMMMMDoMMgggggMoDMMMMDo',
      'oDMrMMDoMMMggMMMoDMMrMDo',
      'oDMMMMDoMMMMMMMMoDMMMMDo',
      'oDMMMMDMccMMMMccMDMMMMDo',
      '.oDMMMDMccMMMMccMDMMMDo.',
      '..oDDDDMMMMMMMMMMDDDDo..',
      '...oooDMMMMMMMMMMDooo...',
      '......oDMMMMMMMMDo......',
      '......oDDMMMMMMDDo......',
      '.......oDMMMMMMDo.......',
      '........oDMrrMDo........',
      '........oDMMMMDo........',
      '........oDDMMDDo........',
      '.........oDMMDo.........',
      '.........oDMMDo..wwo....',
      '.........oDMMMDowwo.....',
      '..........oDDDDDDo......',
      '...........oooooo.......',
    ],
  },
};

export function makeMascots(scene: Phaser.Scene) {
  for (const [id, art] of Object.entries(ART)) {
    const tex = scene.textures.createCanvas(`m_${id}`, 24, 24)!;
    const ctx = tex.getContext();
    art.rows.forEach((row, y) => [...row.padEnd(24, '.').slice(0, 24)].forEach((ch, x) => {
      const c = art.pal[ch];
      if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
    }));
    tex.refresh();
  }
}
