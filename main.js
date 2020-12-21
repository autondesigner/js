const Music = require('./music');
const Brain = require('./brain');
const Util = require('./util');
const Visual = require('./visual');

function suiteA0() {
  let seed = 0;
  if (process.argv.length > 2) {
    seed = parseInt(process.argv[2]);
  }
  let path = 'music.wav';
  if (process.argv.length > 3) {
    path = process.argv[3];
  }
  Util.seed(seed);
  const level = 12;
  const numberGenerator = Brain.buildNumberGenerator(level * 4, level);
  Music.suiteA0(path, numberGenerator);
}

function suiteA1() {
  let seed = 0;
  if (process.argv.length > 2) {
    seed = parseInt(process.argv[2]);
  }
  let path = 'suite-a1-' + seed + '.wav';
  Util.seed(seed);
  const level = 360;
  const numberGenerator = Brain.buildNumberGenerator(level * 4, level);
  Music.suiteA1(path, numberGenerator);
}

function suiteB0() {
  let seed = 0;
  if (process.argv.length > 2) {
    seed = parseInt(process.argv[2]);
  }
  let path = 'suite-b0-' + seed + '.wav';
  Util.seed(seed);
  const level = 360;
  const numberGenerator = Brain.buildNumberGenerator(level * 4, level);
  Music.suiteB0(path, numberGenerator);
}

function visual() {
  let seed = 8;
  if (process.argv.length > 2) {
    seed = parseInt(process.argv[2]);
  }
  let path = 'visual-' + seed;
  Util.seed(seed);
  const level = 360;
  const numberGenerator = Brain.buildNumberGenerator(level * 3, level);
  Visual.render(path, 64, 128, 24, 560, numberGenerator);
}

visual();
