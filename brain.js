const Util = require('./util');

const Brain = {};

Brain.buildNeuron = function (identifier, level = 0, router = 0) {
  const neuron = {};
  neuron.identifier = identifier;
  neuron.level = level;
  neuron.router = router;
  neuron.randomizer = Util.getRandomInt(0, Number.MAX_SAFE_INTEGER);
  neuron.links = [];
  return neuron;
};

Brain.buildNeurons = function (brain) {
  const neurons = [];
  for (let index = 0; index < brain.size; index++) {
    const neuron = Brain.buildNeuron(brain.neuronCounter, index % brain.level);
    neurons.push(neuron);
    brain.neuronCounter++;
  }
  return neurons;
};

Brain.linkNeurons = function (brain) {
  const neurons = brain.neurons;
  const linksCount = [];
  for (let i = 0; i < neurons.length; i++) {
    const count = Util.getRandomInt(1, neurons.length);
    linksCount.push(count);
  }
  for (let i = 0; i < neurons.length; i++) {
    neurons[i].links.push((i + 1) % neurons.length);
  }
  const possibleLinks = [];
  for (let i = 0; i < neurons.length; i++) {
    possibleLinks.push([]);
    for (let j = 0; j < neurons.length - 2; j++) {
      possibleLinks[i].push((i + j + 2) % neurons.length);
    }
  }
  for (let i = 0; i < neurons.length; i++) {
    const neuron = neurons[i];
    for (let l = 1; l < linksCount[i]; l++) {
      const j = Util.getRandomInt(0, possibleLinks[i].length);
      neuron.links[l] = possibleLinks[i][j];
      possibleLinks[i].splice(j, 1);
    }
  }
  for (let i = 0; i < neurons.length; i++) {
    const neuron = neurons[i];
    neuron.links.sort((a, b) => {
      return neurons[a].randomizer - neurons[b].randomizer;
    });
  }
};

Brain.build = function (size, level) {
  const brain = {};
  brain.size = size;
  brain.level = level;
  brain.awareness = 0;
  brain.neuronCounter = 0;
  brain.neurons = Brain.buildNeurons(brain);
  Brain.linkNeurons(brain);
  return brain;
};

Brain.actions = {
  None: 0,
  Spread: 1,
  Actions: 2,
};

Brain.think = function (brain, thoughtSize) {
  const thoughts = [];
  for (let i = 0; i < thoughtSize; i++) {
    const thought = {};
    const awareness = brain.neurons[brain.awareness];
    thought.level = awareness.level;
    thought.action = Brain.actions.None;
    const router = awareness.router;
    awareness.level++;
    awareness.level %= brain.level;
    if (awareness.level === 0) {
      thought.action = Brain.actions.Spread;
      for (let i = 0; i < awareness.links.length; i++) {
        const link = awareness.links[i];
        const linkedNeuron = brain.neurons[link];
        linkedNeuron.level++;
        linkedNeuron.level %= brain.level;
      }
    }
    awareness.router++;
    awareness.router %= awareness.links.length;
    brain.awareness = awareness.links[router];
    thoughts.push(thought);
  }
  return thoughts;
};

Brain.buildNumberGenerator = function (size, level) {
  const numberGenerator = {};
  numberGenerator.brain = Brain.build(size, level);
  numberGenerator.iterate = () => {
    Brain.think(numberGenerator.brain, 1);
  };
  numberGenerator.get = (min = 12) => {
    let capacity = 0;
    let number = 0;
    while (capacity < min) {
      capacity += numberGenerator.brain.level;
      const thoughts = Brain.think(numberGenerator.brain, 1);
      const thought = thoughts[0];
      number += thought.level;
    }
    return number % min;
  };
  return numberGenerator;
};

module.exports = Brain;
