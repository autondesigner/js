const rimraf = require('rimraf');
const fs = require('fs');
const Util = require('./util');
const convert = require('color-convert');
const PNG = require('pngjs').PNG;

const Visual = {};

Visual.postFunctions = {
  Fashion: 0,
  LessFashion: 1,
  LessFashionOverall: 2,
  Functions: 3,
};

Visual.directions = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
  Directions: 4,
};

Visual.buildSpace = function (height, width) {
  const space = {
    height,
    width,
    lastRow: height - 1,
    lastColumn: width - 1,
    cells: [],
  };
  for (let row = 0; row < space.height; row++) {
    space.cells.push([]);
    for (let column = 0; column < space.width; column++) {
      const cell = {
        color: 0,
        address: {
          row,
          column,
        },
      };
      space.cells[row].push(cell);
    }
  }
  space.firstCell = space.cells[0][0];
  space.middle =
    space.cells[Math.floor(space.height / 2)][Math.floor(space.width / 2)];
  space.c0 = space.middle;
  space.c1 =
    space.cells[Math.floor(space.height / 2)][Math.floor(space.width / 2) - 1];
  space.c2 =
    space.cells[Math.floor(space.height / 2) - 1][Math.floor(space.width / 2)];
  space.c3 =
    space.cells[Math.floor(space.height / 2) - 1][
      Math.floor(space.width / 2) - 1
    ];
  Visual.linkSpace(space);
  return space;
};

Visual.linkSpace = function (space) {
  for (let row = 0; row < space.height; row++) {
    for (let column = 0; column < space.width; column++) {
      const neighbors = [];
      //Up
      if (row === 0) {
        neighbors.push(space.cells[space.lastRow][column].address);
      } else {
        neighbors.push(space.cells[row - 1][column].address);
      }
      //Down
      if (row === space.lastRow) {
        neighbors.push(space.cells[0][column].address);
      } else {
        neighbors.push(space.cells[row + 1][column].address);
      }
      //Left
      if (column === 0) {
        neighbors.push(space.cells[row][space.lastColumn].address);
      } else {
        neighbors.push(space.cells[row][column - 1].address);
      }
      //Right
      if (column === space.lastColumn) {
        neighbors.push(space.cells[row][0].address);
      } else {
        neighbors.push(space.cells[row][column + 1].address);
      }
      space.cells[row][column].neighbors = neighbors;
    }
  }
};

Visual.findNeighbor = function (space, cell, direction) {
  const targetAddress = cell.neighbors[direction];
  const target = space.cells[targetAddress.row][targetAddress.column];
  return target;
};

Visual.findCell = function (space, address) {
  const cell = space.cells[address.row][address.column];
  return cell;
};

Visual.print = function (visual, index, path) {
  const png = new PNG({
    width: visual.space.width,
    height: visual.space.height,
    filterType: -1,
  });
  for (let row = 0; row < png.height; row++) {
    for (let column = 0; column < png.width; column++) {
      var idx = (png.width * row + column) * 4;
      const color = Visual.colorAt(visual, row, column);
      //const color = particleColorAt(visual, row, column);
      //const color = ultimateColorAt(visual, row, column);
      png.data[idx] = color.rgb[0];
      png.data[idx + 1] = color.rgb[1];
      png.data[idx + 2] = color.rgb[2];
      png.data[idx + 3] = 255;
    }
  }
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(path + '/picture_' + index.toString() + '.png', buffer);
};

Visual.colorAt = function (visual, row, column) {
  const cell = Visual.findCell(visual.renderSpace, { row, column });
  return visual.colors[cell.color];
};

Visual.cloneAddress = function (address) {
  return {
    row: address.row,
    column: address.column,
  };
};

Visual.symmetryAddress = function (space, address, vertically, horizontally) {
  const clone = Visual.cloneAddress(address);
  if (vertically) {
    clone.row = space.height - 1 - address.row;
  }
  if (horizontally) {
    clone.column = space.width - 1 - address.column;
  }
  return clone;
};

Visual.makeUnique = function (visual) {
  const addresses = [];
  for (let row = 0; row < Math.floor(visual.height / 2); row++) {
    for (let column = 0; column < Math.floor(visual.width / 2); column++) {
      addresses.push({ row, column });
    }
  }
  const alterationsCount = visual.height;
  const alterations = [];
  for (
    let alterationIndex = 0;
    alterationIndex < alterationsCount;
    alterationIndex++
  ) {
    const alteration = {};
    //console.log(addresses.length);
    const addressIndex = visual.numberGenerator.get(addresses.length);
    //console.log(addressIndex);
    const address = addresses[addressIndex];
    //console.log(address);
    alteration.addresses = [];
    alteration.addresses.push(address);

    alteration.addresses.push(
      Visual.symmetryAddress(visual.space, address, false, true)
    );
    alteration.addresses.push(
      Visual.symmetryAddress(visual.space, address, true, false)
    );
    alteration.addresses.push(
      Visual.symmetryAddress(visual.space, address, true, true)
    );
    alteration.color = visual.numberGenerator.get(visual.colorsCount);
    alterations.push(alteration);
    addresses.splice(addressIndex, 1);
  }
  alterations.forEach((alteration) => {
    alteration.addresses.forEach((address) => {
      const cell = Visual.findCell(visual.space, address);
      cell.color = alteration.color;
    });
  });
};

Visual.build = function (height, width, colorsCount, numberGenerator) {
  const visual = {};
  visual.height = height * 2;
  visual.width = width * 2;
  visual.colorsCount = colorsCount;
  visual.space = Visual.buildSpace(visual.height, visual.width);
  visual.backSpace = Visual.buildSpace(visual.height, visual.width);
  visual.renderSpace = Visual.buildSpace(visual.height, visual.width);
  visual.renderBackSpace = Visual.buildSpace(visual.height, visual.width);
  visual.colors = Visual.buildColors(colorsCount);
  visual.cell = visual.space.firstCell;
  //visual.space.c0.color = 1;
  //visual.space.c1.color = 1;
  //visual.space.c2.color = 1;
  //visual.space.c3.color = 1;
  visual.numberGenerator = numberGenerator;
  Visual.makeUnique(visual);
  return visual;
};

Visual.buildColors = function (colorsCount) {
  const colors = [];
  const hues = [];
  const adder = 360 / colorsCount;
  let accumulator = Util.getRandomInt(0, 360);
  //let accumulator = 0;
  for (let index = 0; index < colorsCount; index++) {
    hues.push(accumulator % 360);
    accumulator += adder;
  }
  hues.forEach((hue) => {
    colors.push(Visual.buildColor(hue, 50, 100));
  });
  return colors;
};

Visual.buildColor = function (hue, saturation, value) {
  const color = {
    hsv: [hue, saturation, value],
    rgb: convert.hsv.rgb(hue, saturation, value),
  };
  return color;
};

Visual.fillSpace = function (source, target) {
  for (let row = 0; row < source.height; row++) {
    for (let column = 0; column < source.width; column++) {
      const cell = Visual.findCell(source, { row, column });
      const targetCell = Visual.findCell(target, { row, column });
      Visual.cloneCell(cell, targetCell);
    }
  }
};

Visual.cloneCell = function (source, target) {
  target.color = source.color;
};

Visual.atLeastOneNotZero = function (numbers) {
  for (let index = 0; index < numbers.length; index++) {
    if (numbers[index] != 0) {
      return true;
    }
  }
  return false;
};

Visual.iterate = function (visual) {
  Visual.fillSpace(visual.space, visual.backSpace);
  for (let row = 0; row < visual.height; row++) {
    for (let column = 0; column < visual.width; column++) {
      const backCell = Visual.findCell(visual.backSpace, { row, column });
      const a = backCell.color;
      const b = Visual.findNeighbor(
        visual.backSpace,
        backCell,
        Visual.directions.Up
      ).color;
      const c = Visual.findNeighbor(
        visual.backSpace,
        backCell,
        Visual.directions.Down
      ).color;
      const d = Visual.findNeighbor(
        visual.backSpace,
        backCell,
        Visual.directions.Left
      ).color;
      const e = Visual.findNeighbor(
        visual.backSpace,
        backCell,
        Visual.directions.Right
      ).color;
      const cell = Visual.findCell(visual.space, { row, column });
      cell.color = (a + b + c + d + e) % visual.colorsCount;
      if (Visual.atLeastOneNotZero([a, b, c, d, e])) {
        if (cell.color == 0) {
          const renderCell = Visual.findCell(visual.renderSpace, {
            row,
            column,
          });
          renderCell.color++;
          renderCell.color %= visual.colorsCount;
        }
      }
    }
  }
};

Visual.findNeighborhood = function (space, cell, height, width) {
  let wildcard = cell;
  for (let index = 0; index < width; index++) {
    wildcard = Visual.findNeighbor(space, wildcard, Visual.directions.Left);
  }
  for (let index = 0; index < height; index++) {
    wildcard = Visual.findNeighbor(space, wildcard, Visual.directions.Up);
  }
  const neighborhood = [];
  let direction = Visual.directions.Right;
  for (let row = 0; row < height * 2 + 1; row++) {
    for (let column = 0; column < width * 2 + 1; column++) {
      neighborhood.push(wildcard);
      if (column === width * 2) {
        wildcard = Visual.findNeighbor(space, wildcard, Visual.directions.Down);
      } else {
        wildcard = Visual.findNeighbor(space, wildcard, direction);
      }
    }
    if (direction === Visual.directions.Right) {
      direction = Visual.directions.Left;
    } else {
      direction = Visual.directions.Right;
    }
  }
  return neighborhood;
};

Visual.fashion = function (visual, cells) {
  const typesCounter = [];
  for (let index = 0; index < visual.colorsCount; index++) {
    typesCounter.push(0);
  }
  cells.forEach((cell) => {
    typesCounter[cell.color] += 1;
  });
  let maxReps = 0;
  let maxIndex = 0;
  for (let index = 0; index < visual.colorsCount; index++) {
    const reps = typesCounter[index];
    if (reps > maxReps) {
      maxIndex = index;
      maxReps = reps;
    }
  }
  const type = maxIndex;
  return type;
};

Visual.lessFashionOverall = function (cells, colorsCounter) {
  for (let i = 0; i < colorsCounter.length; i++) {
    const colorCounter = colorsCounter[i];
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j];
      if (cell.color === colorCounter.color) {
        return cell.color;
      }
    }
  }
  return 0;
};

Visual.lessFashion = function (visual, cells) {
  const typesCounter = [];
  for (let index = 0; index < visual.colorsCount; index++) {
    typesCounter.push(0);
  }
  cells.forEach((cell) => {
    typesCounter[cell.color] += 1;
  });
  for (let index = 0; index < visual.colorsCount; index++) {
    if (typesCounter[index] === 0) {
      typesCounter[index] = Infinity;
    }
  }
  let minReps = Infinity;
  let minIndex = 0;
  for (let index = 0; index < visual.colorsCount; index++) {
    const reps = typesCounter[index];
    if (minReps > reps) {
      minIndex = index;
      minReps = reps;
    }
  }
  const type = minIndex;
  return type;
};

Visual.iteratePost = function (visual, postFunction) {
  Visual.fillSpace(visual.renderSpace, visual.renderBackSpace);
  if (postFunction === Visual.postFunctions.Fashion) {
    for (let row = 0; row < visual.space.height; row++) {
      for (let column = 0; column < visual.space.width; column++) {
        const cell = Visual.findCell(visual.renderSpace, { row, column });
        const backCell = Visual.findCell(visual.renderBackSpace, {
          row,
          column,
        });
        const neighborhood = Visual.findNeighborhood(
          visual.renderBackSpace,
          backCell,
          2,
          2
        );
        const color = Visual.fashion(visual, neighborhood);
        cell.color = color;
      }
    }
  } else if (postFunction === Visual.postFunctions.LessFashionOverall) {
    const colorsCounter = [];
    for (let index = 0; index < visual.colorsCount; index++) {
      colorsCounter.push({
        color: index,
        counter: 0,
      });
    }
    for (let row = 0; row < visual.space.height; row++) {
      for (let column = 0; column < visual.space.width; column++) {
        const cell = Visual.findCell(visual.space, { row, column });
        colorsCounter[cell.color].counter += 1;
      }
    }
    colorsCounter.sort(function (a, b) {
      return a.counter - b.counter;
    });
    for (let row = 0; row < visual.space.height; row++) {
      for (let column = 0; column < visual.space.width; column++) {
        const cell = Visual.findCell(visual.renderSpace, { row, column });
        const backCell = Visual.findCell(visual.renderBackSpace, {
          row,
          column,
        });
        const neighborhood = Visual.findNeighborhood(
          visual.renderBackSpace,
          backCell,
          2,
          2
        );
        const color = Visual.lessFashionOverall(neighborhood, colorsCounter);
        cell.color = color;
      }
    }
  } else {
    for (let row = 0; row < visual.space.height; row++) {
      for (let column = 0; column < visual.space.width; column++) {
        const cell = Visual.findCell(visual.renderSpace, { row, column });
        const backCell = Visual.findCell(visual.renderBackSpace, {
          row,
          column,
        });
        const neighborhood = Visual.findNeighborhood(
          visual.renderBackSpace,
          backCell,
          2,
          2
        );
        const color = Visual.lessFashion(visual, neighborhood);
        cell.color = color;
      }
    }
  }
};

Visual.render = function (
  path,
  height,
  width,
  colorsCount,
  pictures,
  numberGenerator
) {
  rimraf.sync(path);
  fs.mkdirSync(path);
  visual = Visual.build(height, width, colorsCount, numberGenerator);
  const posts = [
    Visual.postFunctions.LessFashionOverall,
    Visual.postFunctions.Fashion,
    Visual.postFunctions.LessFashion,
    Visual.postFunctions.Fashion,
  ];
  let postIndex = 0;
  for (let picture = 0; picture < pictures; picture++) {
    console.log('picture: ' + picture);
    Visual.iterate(visual);
    Visual.iteratePost(visual, posts[postIndex]);
    postIndex++;
    postIndex %= posts.length;
    Visual.print(visual, picture, path);
  }
};

module.exports = Visual;
