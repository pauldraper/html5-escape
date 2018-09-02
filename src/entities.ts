const entities: EntitiesData = require('../data/entities');

type EntitiesData = { entity: string; character: string }[];

export const lookup = new Map<string, string>();
for (const { entity, character } of entities) {
  lookup.set(character, entity);
}
