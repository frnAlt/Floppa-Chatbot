/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
*/

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const MAJOR_SCALE_INTERVALS = [2, 2, 1, 2, 2, 2, 1];
const MINOR_SCALE_INTERVALS = [2, 1, 2, 2, 1, 2, 2];

const CHORD_TYPES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  maj9: [0, 4, 7, 11, 14],
  9: [0, 4, 7, 10, 14],
  min9: [0, 3, 7, 10, 14],
  maj11: [0, 4, 7, 11, 14, 17],
  11: [0, 4, 7, 10, 14, 17],
  min11: [0, 3, 7, 10, 14, 17],
  maj13: [0, 4, 7, 11, 14, 21],
  13: [0, 4, 7, 10, 14, 21],
  min13: [0, 3, 7, 10, 14, 21],
};

const MAJOR_CHORD_PROGRESSION = [
  "maj",
  "min",
  "min",
  "maj",
  "maj",
  "min",
  "dim",
];
const MINOR_CHORD_PROGRESSION = [
  "min",
  "dim",
  "maj",
  "min",
  "min",
  "maj",
  "maj",
];

function noteIndex(note) {
  return NOTES.indexOf(note) !== -1
    ? NOTES.indexOf(note)
    : FLAT_NOTES.indexOf(note);
}

function getNoteByIndex(index) {
  return NOTES[index % NOTES.length];
}

function generateScale(root, scaleIntervals) {
  let scale = [];
  let rootIndex = noteIndex(root);

  scale.push(root);
  for (let interval of scaleIntervals) {
    rootIndex = (rootIndex + interval) % NOTES.length;
    scale.push(getNoteByIndex(rootIndex));
  }
  return scale;
}

function getChord(root, chordType) {
  let rootIndex = noteIndex(root);
  let intervals = CHORD_TYPES[chordType];
  return intervals.map((interval) => getNoteByIndex(rootIndex + interval));
}

function generateChordProgressionOld(key, length) {
  let isMinor = key.includes("m");
  let root = key.replace("m", "");
  let scale = generateScale(
    root,
    isMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS,
  );
  let progressionType = isMinor
    ? MINOR_CHORD_PROGRESSION
    : MAJOR_CHORD_PROGRESSION;

  let progression = [];
  for (let i = 0; i < length; i++) {
    let chordRoot = scale[i % scale.length];
    let chordType = progressionType[i % progressionType.length];
    progression.push(`${chordRoot}${chordType === "maj" ? "" : chordType}`);
  }

  return progression;
}
function generateChordProgression(key, length) {
  let isMinor = key.includes("m");
  let root = key.replace("m", "");
  let scale = generateScale(
    root,
    isMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS,
  );
  let progressionType = isMinor
    ? MINOR_CHORD_PROGRESSION
    : MAJOR_CHORD_PROGRESSION;

  let progression = [];
  for (let i = 0; i < length; i++) {
    let chordRoot = scale[i % scale.length];
    let chordType = progressionType[i % progressionType.length];
    progression.push(`${chordRoot}${chordType === "maj" ? "" : chordType}`);
  }

  progression = shuffleArray(progression);
  const rootChordIndex = progression.findIndex((chord) =>
    chord.startsWith(root),
  );
  if (rootChordIndex !== -1) {
    const rootChord = progression.splice(rootChordIndex, 1)[0];
    progression.unshift(rootChord);
  }

  return progression;
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function melodyGenerator(progressionArray, key, amountPerBar) {
  let isMinor = key.includes("m");
  let root = key.replace("m", "");
  let scale = generateScale(
    root,
    isMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS,
  );

  let melody = [];
  for (let chord of progressionArray) {
    let chordRoot = chord.replace(/[^A-G#b]/g, "");
    let chordType = chord.replace(/[A-G#b]/g, "");
    let chordNotes = getChord(
      chordRoot,
      chordType || (isMinor ? "min" : "maj"),
    );
    let chordMelody = [];

    for (let i = 0; i < amountPerBar; i++) {
      let note = chordNotes[Math.floor(Math.random() * chordNotes.length)];
      chordMelody.push(note);
    }
    melody.push(chordMelody);
  }

  return shuffleArray(melody).map((notes) => shuffleAreay(notes));
}

export default {
  NOTES,
  FLAT_NOTES,
  MAJOR_SCALE_INTERVALS,
  MINOR_SCALE_INTERVALS,
  CHORD_TYPES,
  MAJOR_CHORD_PROGRESSION,
  MINOR_CHORD_PROGRESSION,
  noteIndex,
  getNoteByIndex,
  generateScale,
  getChord,
  generateChordProgression,
  melodyGenerator,
};
