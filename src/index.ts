const entities: EntitiesData = require('../data/entities');
const map: MapData = require('../data/map');

type EntitiesData = { entity: string; character: string }[];
type MapData = { from: string; to: string }[];

const entityLookup = new Map<string, string>();
for (const { entity, character } of entities) {
  entityLookup.set(character, entity);
}

const mapLookup = new Map<string, string>();
for (const { from, to } of map) {
  mapLookup.set(from, to);
}

export type EscapeBase = 10 | 16;

export type EscapeRange = 'control' | 'nonbreaking-space' | 'non-ascii';

export interface Options {
  forceEscape: boolean;
  escapeRanges: EscapeRange[];
  escapeBase: EscapeBase;
}

export namespace Options {
  export const defaults: Options = {
    forceEscape: true,
    escapeRanges: ['control', 'nonbreaking-space'],
    escapeBase: 16,
  };
}

// fast path
function isSafe(value: string) {
  return /^[\w ]*$/.test(value);
}

function replaceNull(value: string) {
  return value.replace(/\0/g, '\ufffd');
}

export class Escaper {
  private readonly _options: Options;

  constructor(options: Partial<Options> = {}) {
    this._options = { ...Options.defaults, ...options };
  }

  private _escapeCharacter(character: string) {
    const to = mapLookup.get(character);
    if (to !== undefined) {
      if (this._options.forceEscape) {
        character = to;
      } else {
        return character;
      }
    }

    let entity = entityLookup.get(character);
    if (entity === undefined) {
      const codePoint = character.codePointAt(0)!;
      switch (this._options.escapeBase) {
        case 10:
          entity = `&#${codePoint}`;
          break;
        case 16:
          entity = `&#x${codePoint.toString(16)}`;
          break;
      }
    }
    return entity!;
  }

  private _escapeAmpersand(value: string) {
    return value.replace(/&(?=[a-zA-Z0-9])/g, string => this._escapeCharacter(string));
  }

  private _escapeRanges(value: string) {
    if (this._options.escapeRanges.includes('control')) {
      value = value.replace(/[\0-\x1F\x7f\x80-\x9f]/g, string => this._escapeCharacter(string));
    }
    if (this._options.escapeRanges.includes('nonbreaking-space')) {
      value = value.replace(/\xa0/g, string => this._escapeCharacter(string));
    }
    if (this._options.escapeRanges.includes('non-ascii')) {
      value = value.replace(/[\x80-\u9999]/gu, string => this._escapeCharacter(string));
    }
    return value;
  }

  /**
   * @param value
   * @see HTML 5.2, 8.2.4.1 https://www.w3.org/TR/html52/syntax.html#data-state
   */
  escapeData(value: string) {
    if (!isSafe(value)) {
      value = replaceNull(value);
      value = this._escapeAmpersand(value);
      value = value.replace(/</g, string => this._escapeCharacter(string));
      value = this._escapeRanges(value);
    }
    return value;
  }

  /**
   * @param value
   * @see HTML 5.2, 8.2.4.36 https://www.w3.org/TR/html52/syntax.html#attribute-value-double-quoted-state
   */
  escapeDoubleQuotedAttribute(value: string) {
    if (!isSafe(value)) {
      value = replaceNull(value);
      value = this._escapeAmpersand(value);
      value = value.replace(/"/g, string => this._escapeCharacter(string));
      value = this._escapeRanges(value);
    }
    return value;
  }

  /**
   * @param value
   * @see HTML 5.2, 8.2.4.37 https://www.w3.org/TR/html52/syntax.html#attribute-value-single-quoted-state
   */
  escapeSingleQuotedAttribute(value: string) {
    if (!isSafe(value)) {
      value = replaceNull(value);
      value = this._escapeAmpersand(value);
      value = value.replace(/'/g, string => this._escapeCharacter(string));
      value = this._escapeRanges(value);
    }
    return value;
  }

  /**
   * @param value
   * @see HTML 5.2, 8.2.4.38 https://www.w3.org/TR/html52/syntax.html#attribute-value-unquoted-state
   */
  escapeUnquotedAttribute(value: string) {
    if (!isSafe(value)) {
      value = replaceNull(value);
      value = this._escapeAmpersand(value);
      value = value.replace(/[\t\n\f <>="'`]/g, string => this._escapeCharacter(string));
      value = this._escapeRanges(value);
    }
    return value;
  }
}
