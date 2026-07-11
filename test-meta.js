const mm = require('music-metadata');
mm.parseFile('D:\\test music\\Yu-Peng Chen - Genshin Impact - Vortex of Legends (Original Game Soundtrack) - Abiding Chills.flac')
  .then(m => {
    const cover = mm.selectCover(m.common.picture);
    if (cover) console.log(cover.format, cover.data.length);
    else console.log('no cover');
  })
  .catch(console.error);
