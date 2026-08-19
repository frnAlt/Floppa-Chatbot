// @ts-check
import { defineEntry } from "@cass/define";
import { BriefcaseAPI } from "@cass-modules/BriefcaseAPI";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "briefcase",
  description: "Manage your items.",
  author: "Liane Cagara | JenicaDev",
  version: "1.3.1",
  usage: "{prefix}{name} <action> [args]",
  category: "Inventory",
  role: 0,
  waitingTime: 1,
  otherNames: ["case", "brief", "bc", "items", "inv", "inventory"],
  requirement: "2.5.0",
  icon: "🧰",
  cmdType: "cplx_g",
  isGame: true,
};

const { invLimit } = global.Cassidy;

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Briefcase 🧰",
  titleFont: "bold",
  contentFont: "fancy",
};

const briefcase = new BriefcaseAPI({
  inventoryLimit: invLimit,
  inventoryIcon: "🧰",
  inventoryName: "Inventory",
  inventoryKey: "inventory",
  isHypen: false,
  showCollectibles: true,
  meta,
});

export const entry = defineEntry((ctx) => briefcase.runInContext(ctx));
