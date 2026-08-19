// @ts-check

import { defineEntry } from "@cass/define";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "random",
  description: "Everything random.",
  author: "@lianecagara",
  version: "1.0.0",
  usage: "{prefix}{name}",
  category: "Utilities",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "⭐",
};

export const style = {
  title: "Random Tools ⭐",
  titleFont: "bold",
  contentFont: "none",
  lineEnd: "",
};
const { utils } = global;

export const indivMeta = {
  chord: {
    description: "Generate a random chord progression, [key, amount]",
    params: [true, true, false],
  },
  melody: {
    description: "Generate a random melody, [progression, key, chords]",
    params: [true, true, true, false],
  },
  integer: {
    description: "Generate a random integer, [min, max]",
    params: [true, true, false],
  },
  float: {
    description: "Generate a random floating point number, [min, max]",
    params: [true, true, false],
  },
};

const { MusicTheory } = utils;

export const entry = defineEntry({
  chord({ output, args }) {
    if (parseInt(args[1]) > 8) {
      return output.reply(`Amount cannot be higher than 8.`);
    }

    output.reply(MusicTheory.generateChordProgression(...args).join(" "));
  },
  melody({ output, args }) {
    const result = MusicTheory.melodyGenerator(...args)
      .map((chord) => `${chord.join(" ")}`)
      .join("\n");
    output.reply(result);
  },
  integer({ output, args }) {
    output.reply(
      `${
        Math.floor(Math.random() * (parseInt(args[1]) - parseInt(args[0]))) +
        parseInt(args[0])
      }`
    );
  },
  float({ output, args }) {
    output.reply(
      `${
        Math.random() * (parseFloat(args[1]) - parseFloat(args[0])) +
        parseFloat(args[0])
      }`
    );
  },
});
