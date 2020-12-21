const fs = require('fs');
const Util = require('./util');
const wavefile = require('wavefile');

const Music = {};

Music.square = function (t, f) {
  return 2 * (2 * Math.floor(t * f) - Math.floor(2 * t * f)) + 1;
};

Music.sawtooth = function (t, f) {
  return 2 * (t * f - Math.floor(1 / 2 + t * f));
};

Music.triangle = function (t, f) {
  return 2 * Math.abs(2 * (t * f - Math.floor(1 / 2 + t * f))) - 1;
};

Music.generateWave = function (sampleRate, frequency, duration, waveFunction) {
  const samples = Math.floor(sampleRate * duration);
  wave = [];
  for (let sample = 0; sample < samples; sample++) {
    const t = sample / sampleRate;
    const level = waveFunction(t, frequency);
    wave.push(level);
  }
  return wave;
};

Music.chords = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Chord6: [0, 4, 7, 9],
  Chord7: [0, 4, 7, 10],
  Minor6: [0, 3, 7, 9],
  Major7: [0, 4, 7, 11],
  Minor7: [0, 3, 7, 10],
  MinorMajor7: [0, 3, 7, 11],
};

Music.chordPool = [
  Music.chords.Major,
  Music.chords.Minor,
  Music.chords.Chord6,
  Music.chords.Chord7,
  Music.chords.Minor6,
  Music.chords.Major7,
  Music.chords.Minor7,
  Music.chords.MinorMajor7,
];

Music.addWave = function (generator, wave, time) {
  const initialSample = Math.floor(generator.sampleRate * time);
  let length = generator.wave.length;
  if (initialSample >= length) {
    for (let sample = 0; sample <= initialSample - length; sample++) {
      generator.wave.push(0);
    }
  }
  length = generator.wave.length;
  let s = initialSample;
  for (let i = 0; i < wave.length; i++) {
    if (s + i >= length) {
      generator.wave.push(wave[i]);
    } else {
      generator.wave[s + i] += wave[i];
    }
  }
};

Music.addNoteFromWaveFunction = function (
  generator,
  waveFunction,
  time,
  duration,
  frequency
) {
  const wave = Music.generateWave(
    generator.sampleRate,
    frequency,
    duration,
    waveFunction
  );
  Music.addWave(generator, wave, time);
};

Music.getFrequencyFromNote = function (note) {
  return (440 / 2 / 2 / 2 / 2) * Math.pow(2, note / 12);
};

Music.buildArpeggiator = function (notes) {
  const arpeggiator = [];
  for (let index = 0; index < notes.length; index++) {
    let duration = 1 / notes[index].length;
    for (let note = 0; note < notes[index].length; note++) {
      arpeggiator.push({
        note: notes[index][note],
        duration: duration,
      });
    }
  }
  return arpeggiator;
};

Music.buildRandomArpeggiator = function (
  numberGenerator,
  length,
  notesInChord,
  silenceList,
  timesList
) {
  const notes = [];
  for (let i = 0; i < length; i++) {
    const times = timesList[numberGenerator.get(timesList.length)];
    notes.push([]);
    for (let j = 0; j < times; j++) {
      const silenceIndex = numberGenerator.get(silenceList.length);
      const silence = silenceList[silenceIndex];
      if (silence === Music.noiseType.Silence) {
        notes[i].push(null);
      } else {
        notes[i].push(numberGenerator.get(notesInChord));
      }
    }
  }
  return Music.buildArpeggiator(notes);
};

Music.noiseType = { Silence: 0, Noise: 1, NoiseTypes: 2 };

Music.waveforms = { Sawtooth: 0, Square: 1, Triangle: 2, Waveforms: 3 };

Music.addNote = function (generator, waveForm, time, duration, note) {
  const frequency = Music.getFrequencyFromNote(note);
  switch (waveForm) {
    case Music.waveforms.Sawtooth:
      Music.addNoteFromWaveFunction(
        generator,
        Music.sawtooth,
        time,
        duration,
        frequency
      );
      break;
    case Music.waveforms.Triangle:
      Music.addNoteFromWaveFunction(
        generator,
        Music.triangle,
        time,
        duration,
        frequency
      );
      break;
    case Music.waveforms.Square:
      Music.addNoteFromWaveFunction(
        generator,
        Music.square,
        time,
        duration,
        frequency
      );
      break;
    default:
      break;
  }
  return time + duration;
};

Music.addArpeggio = function (
  generator,
  arpeggiator,
  waveForm,
  time,
  duration,
  chord,
  note,
  pressDuration = 1
) {
  let t = time;
  let d;
  let n;
  let o = 0;
  for (let i = 0; i < arpeggiator.length; i++) {
    const element = arpeggiator[i];
    d = element.duration * duration;
    if (element.note !== null) {
      let noteIndex = element.note;
      o = 0;
      while (noteIndex >= chord.length) {
        noteIndex -= chord.length;
        o += 1;
      }
      n = note + o * 12 + chord[noteIndex];
      Music.addNote(generator, waveForm, t, d * pressDuration, n);
    }
    t += d;
  }
  return t;
};

Music.addEcho = function (generator) {
  for (let r = 0; r < 4; r++) {
    let echoTime = (r + 1) / 12;
    let time = 0;
    let amp = 8 / 12 / ((r + 1) * 2);
    for (let i = 0; i < 12; i++) {
      const copy = [...generator.wave];
      let echoWave = [];
      copy.forEach((sample) => {
        echoWave.push(sample * amp);
      });
      amp *= 3 / 4;
      time += echoTime;
      echoTime *= 3 / 4;
      Music.addWave(generator, echoWave, time);
    }
  }
};

Music.normalize = function (generator) {
  let max = 0;
  for (let index = 0; index < generator.wave.length; index++) {
    if (Math.abs(generator.wave[index]) > max) {
      max = generator.wave[index];
    }
  }
  if (max === 0) {
    return;
  }
  for (let index = 0; index < generator.wave.length; index++) {
    generator.wave[index] = generator.wave[index] / max;
  }
};

Music.addSilence = function (generator, time) {
  const lastValidIndex = generator.wave.length - 1;
  let lastIndex = lastValidIndex;
  const silenceSeconds = time;
  const silenceSamples = silenceSeconds * generator.sampleRate;
  lastIndex += silenceSamples;
  for (let index = 0; index < lastIndex - lastValidIndex; index++) {
    generator.wave.push(0);
  }
};

Music.trim = function (generator, minDifference) {
  const lastValidIndex = generator.wave.length - 1;
  let lastIndex = lastValidIndex;
  loop: for (let index = lastValidIndex; index >= 0; index--) {
    const difference = Math.abs(generator.wave[index]);
    //console.log(difference);
    if (difference >= minDifference) {
      lastIndex = index;
      break loop;
    }
  }
  //console.log('lastIndex');
  //console.log(lastIndex);
  if (lastIndex < lastValidIndex) {
    generator.wave.splice(lastIndex + 1, lastValidIndex - lastIndex);
  }
};

Music.buildGenerator = function () {
  const generator = {};
  generator.wave = [];
  generator.sampleRate = 48000;
  return generator;
};

Music.suiteB0 = function (path, numberGenerator) {
  const wav = new wavefile.WaveFile();
  const audioPath = path;
  const generator = Music.buildGenerator();
  const guide = 24;
  let bn = guide;
  const d = 1 / 2;
  let t = 0;
  const press = 1 / 2;
  const chords = [Music.chords.Minor, Music.chords.Major];

  const baseNotes = [];
  for (let index = 0; index < 4; index++) {
    baseNotes.push(numberGenerator.get(12));
  }
  const progressions = [];
  for (let i = 0; i < 1; i++) {
    const progression = [];
    for (let j = 0; j < baseNotes.length * 2; j++) {
      const chordIndex = numberGenerator.get(chords.length);
      const chord = chords[chordIndex];
      progression.push(chord);
    }
    progressions.push(progression);
  }

  const bassArpeggiators = [];
  const leadArpeggiators = [];
  const bassSilenceList = [Music.noiseType.Noise];
  const leadSilenceList = [Music.noiseType.Noise];
  const leadTimesList = [2, 3, 4];
  const bassTimesList = [1, 2, 3];

  //const silenceList = [1,0,0,0,0,0,0,0];

  for (let i = 0; i < 1; i++) {
    bassArpeggiators.push(
      Music.buildRandomArpeggiator(
        numberGenerator,
        8,
        4 + 2,
        bassSilenceList,
        bassTimesList
      )
    );
  }
  for (let i = 0; i < 2; i++) {
    leadArpeggiators.push(
      Music.buildRandomArpeggiator(
        numberGenerator,
        8,
        8,
        leadSilenceList,
        leadTimesList
      )
    );
  }
  const sweepers = [-7, -4, -3, -1, 1, 3, 4, 7];
  Util.printObject('building');
  let chordIndex = 0;
  for (let j = 0; j < 1; j++) {
    bn = guide;
    for (let i = 0; i < 4; i += 1) {
      let leadIndex = 0;
      let bassIndex = 0;
      for (let bni = 0; bni < baseNotes.length; bni++) {
        const chord = progressions[0][chordIndex];
        chordIndex = Util.iterate(chordIndex, progressions[0].length);
        Music.addArpeggio(
          generator,
          leadArpeggiators[leadIndex],
          Music.waveforms.Square,
          t,
          d,
          chord,
          bn + baseNotes[bni] + 12,
          press
        );
        leadIndex = Util.iterate(leadIndex, leadArpeggiators.length);

        t = Music.addArpeggio(
          generator,
          bassArpeggiators[bassIndex],
          Music.waveforms.Sawtooth,
          t,
          d,
          chord,
          bn + baseNotes[bni],
          press
        );
        bassIndex = Util.iterate(bassIndex, bassArpeggiators.length);
      }
      bn += sweepers[numberGenerator.get(sweepers.length)];
    }
  }
  Util.printObject('mastering');

  Music.addEcho(generator);
  Music.normalize(generator);
  Music.trim(generator, 1 / 1024);
  Music.addSilence(generator, 4);
  Util.printObject('waving');
  wav.fromScratch(1, generator.sampleRate, '32f', generator.wave);
  Util.printObject('writing');
  fs.writeFileSync(audioPath, wav.toBuffer());
};

Music.suiteA1 = function (path, numberGenerator) {
  const wav = new wavefile.WaveFile();
  const audioPath = path;
  const generator = Music.buildGenerator();
  const guide = 24;
  let bn = guide;
  const d = 1 / 2;
  let t = 0;
  const press = 1 / 2;
  const chords = Music.chordPool;

  const baseNotes = [];
  for (let index = 0; index < 4; index++) {
    baseNotes.push(numberGenerator.get(12));
  }
  const progressions = [];
  for (let i = 0; i < 1; i++) {
    const progression = [];
    for (let j = 0; j < baseNotes.length * 2; j++) {
      const chordIndex = numberGenerator.get(chords.length);
      const chord = chords[chordIndex];
      progression.push(chord);
    }
    progressions.push(progression);
  }

  const bassArpeggiators = [];
  const leadArpeggiators = [];
  const bassSilenceList = [Music.noiseType.Noise];
  const leadSilenceList = [Music.noiseType.Noise];
  const leadTimesList = [2, 3, 4];
  const bassTimesList = [1, 2, 3];

  //const silenceList = [1,0,0,0,0,0,0,0];

  for (let i = 0; i < 1; i++) {
    bassArpeggiators.push(
      Music.buildRandomArpeggiator(
        numberGenerator,
        8,
        4 + 2,
        bassSilenceList,
        bassTimesList
      )
    );
  }
  for (let i = 0; i < 2; i++) {
    leadArpeggiators.push(
      Music.buildRandomArpeggiator(
        numberGenerator,
        8,
        8,
        leadSilenceList,
        leadTimesList
      )
    );
  }
  const sweepers = [-7, -4, -3, -1, 1, 3, 4, 7];
  Util.printObject('building');
  let chordIndex = 0;
  for (let j = 0; j < 1; j++) {
    bn = guide;
    for (let i = 0; i < 4; i += 1) {
      let leadIndex = 0;
      let bassIndex = 0;
      for (let bni = 0; bni < baseNotes.length; bni++) {
        const chord = progressions[0][chordIndex];
        chordIndex = Util.iterate(chordIndex, progressions[0].length);
        Music.addArpeggio(
          generator,
          leadArpeggiators[leadIndex],
          Music.waveforms.Square,
          t,
          d,
          chord,
          bn + baseNotes[bni] + 12,
          press
        );
        leadIndex = Util.iterate(leadIndex, leadArpeggiators.length);

        t = Music.addArpeggio(
          generator,
          bassArpeggiators[bassIndex],
          Music.waveforms.Sawtooth,
          t,
          d,
          chord,
          bn + baseNotes[bni],
          press
        );
        bassIndex = Util.iterate(bassIndex, bassArpeggiators.length);
      }
      bn += sweepers[numberGenerator.get(sweepers.length)];
    }
  }
  Util.printObject('mastering');

  Music.addEcho(generator);
  Music.normalize(generator);
  Music.trim(generator, 1 / 1024);
  Music.addSilence(generator, 4);
  Util.printObject('waving');
  wav.fromScratch(1, generator.sampleRate, '64', generator.wave);
  Util.printObject('writing');
  fs.writeFileSync(audioPath, wav.toBuffer());
};

Music.suiteA0 = function (path, numberGenerator) {
  const wav = new wavefile.WaveFile();
  const audioPath = path;
  const generator = Music.buildGenerator();
  const guide = 24 + 6;
  let bn = guide;
  const d = 1 / 2;
  let t = 0;
  const press = 1 / 3;
  const chords = Music.chordPool;

  const baseNotes = [];
  for (let index = 0; index < 4; index++) {
    baseNotes.push(numberGenerator.get(12));
  }
  const progressions = [];
  for (let i = 0; i < 1; i++) {
    const progression = [];
    for (let j = 0; j < baseNotes.length * 2; j++) {
      const chordIndex = numberGenerator.get(chords.length);
      const chord = chords[chordIndex];
      progression.push(chord);
    }
    progressions.push(progression);
  }

  const bassArpeggiators = [];
  const leadArpeggiators = [];
  const bassSilenceList = [Music.noiseType.Noise];
  const leadSilenceList = [Music.noiseType.Noise];
  const leadTimesList = [2, 3, 4];
  const bassTimesList = [1, 2, 3];

  //const silenceList = [1,0,0,0,0,0,0,0];

  for (let i = 0; i < 1; i++) {
    bassArpeggiators.push(
      Music.buildRandomArpeggiator(
        numberGenerator,
        8,
        4 + 2,
        bassSilenceList,
        bassTimesList
      )
    );
  }
  for (let i = 0; i < 2; i++) {
    leadArpeggiators.push(
      Music.buildRandomArpeggiator(
        numberGenerator,
        8,
        8,
        leadSilenceList,
        leadTimesList
      )
    );
  }
  const sweepers = [-3, -1, 1, 3];
  Util.printObject('building');
  let chordIndex = 0;
  for (let j = 0; j < 1; j++) {
    bn = guide;
    for (let i = 0; i < 4; i += 1) {
      let leadIndex = 0;
      let bassIndex = 0;
      for (let bni = 0; bni < baseNotes.length; bni++) {
        const chord = progressions[0][chordIndex];
        chordIndex = Util.iterate(chordIndex, progressions[0].length);
        Music.addArpeggio(
          generator,
          leadArpeggiators[leadIndex],
          Music.waveforms.Square,
          t,
          d,
          chord,
          bn + baseNotes[bni] + 12,
          press
        );
        leadIndex = Util.iterate(leadIndex, leadArpeggiators.length);

        t = Music.addArpeggio(
          generator,
          bassArpeggiators[bassIndex],
          Music.waveforms.Sawtooth,
          t,
          d,
          chord,
          bn + baseNotes[bni],
          press
        );
        bassIndex = Util.iterate(bassIndex, bassArpeggiators.length);
      }
      bn += sweepers[numberGenerator.get(sweepers.length)];
    }
  }
  Util.printObject('mastering');

  Music.addEcho(generator);
  Music.normalize(generator);
  Music.trim(generator, 1 / 1024);
  Music.addSilence(generator, 4);
  Util.printObject('waving');
  wav.fromScratch(1, generator.sampleRate, '64', generator.wave);
  Util.printObject('writing');
  fs.writeFileSync(audioPath, wav.toBuffer());
};

module.exports = Music;
