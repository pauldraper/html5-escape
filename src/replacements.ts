const map: Data = require('../data/replacements');

type Data = { from: string; to: string }[];

export const lookup = new Map<string, string>();
for (const { from, to } of map) {
  lookup.set(from, to);
}
