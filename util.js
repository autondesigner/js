const fs = require('fs');
const Chance = require('chance');
let chance = new Chance(0);
const Util = {};

Util.getRandomInt = function (min, max) {
  return chance.integer({ min: min, max: max - 1 });
};

Util.printObject = function (object) {
  console.log(JSON.stringify(object, null, 2));
};

Util.saveObject = function (object, path) {
  fs.writeFileSync(path, JSON.stringify(object, null, 2));
};

Util.loadObject = function (path) {
  let rawdata = fs.readFileSync(path);
  return JSON.parse(rawdata);
};

Util.seed = function (seed) {
  chance = new Chance(seed);
};

Util.iterate = function (number, module) {
  number++;
  return number % module;
};

module.exports = Util;
