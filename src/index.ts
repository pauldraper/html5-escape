import { lookup as entityLookup } from './entities';
import { lookup as replacementLookup } from './replacements';

export type EscapeBase = 10 | 16;

export type EscapeRange = 'control' | 'nonbreaking-space' | 'non-ascii';

/**
 * Escape text for HTML5 documents.
 * The NUL character cannot be included in HTML documents. It is replaced with U+FFFD
 * 'REPLACEMENT CHARACTER'.
 */
export class Escaper {
  private readonly _options: Options;

  /**
   * @param {Options} [options={}]
   */
  constructor(options: Partial<Options> = {}) {
    this._options = { ...Options.defaults, ...options };
  }

  private _escapeCharacter(character: string) {
    const to = replacementLookup.get(character);
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
      value = value.replace(/[\x80-\u{99999}]/gu, string => this._escapeCharacter(string));
    }
    return value;
  }

  /**
   * Escape a text node
   * @example
   * escaper.escapeData('< Abbott & Costello &me; "on first"');
   * // '&lt; Abbott & Costello &amp;me; "on first"'
   * @param {string} value text to escape
   * @returns {string} escaped text
   * @see {@link https://www.w3.org/TR/html52/syntax.html#data-state HTML 5.2, 8.2.4.1}
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
   * Escape an attribute value using double-quotes
   * @example
   * escaper.escapeData('< Abbott & Costello &me; "on first"');
   * // '< Abbott & Costello &amp;me; &quot;on first&quot;'
   * @param {string} value text to escape
   * @returns {string} escaped text
   * @see {@link https://www.w3.org/TR/html52/syntax.html#attribute-value-double-quoted-state HTML 5.2, 8.2.4.36}
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
   * Escape an attribute value using single-quotes
   * @example
   * escaper.escapeData('< Abbott & Costello &me; "on first"');
   * // '< Abbott & Costello &amp;me; "on first"'
   * @param {string} value text to escape
   * @returns {string} escaped text
   * @see {@link https://www.w3.org/TR/html52/syntax.html#attribute-value-single-quoted-state HTML 5.2, 8.2.4.37}
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
   * Escape an attribute value not using quotes
   * escaper.escapeData('< Abbott & Costello &me; "on first"');
   * // '&lt;&#x20Abbott&#x20&&#x20Costello&#x20&amp;me;&#x20&quot;on first&quot;'
   * @param {string} value text to escape
   * @returns {string} escaped text
   * @see {@link https://www.w3.org/TR/html52/syntax.html#attribute-value-unquoted-state HTML 5.2, 8.2.4.38}
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

export interface Options {
  escapeRanges: EscapeRange[];
  escapeBase: EscapeBase;
  forceEscape: boolean;
}

/**
 * @property {string} [escapeRanges] - zero or more of 'control', 'nonbreaking-space', and 'non-ascii'. Defaults to
 *   ['control', 'nonbreaking-space']
 * @property {string} [escapeBase] - either 10 or 16. Defaults to 16.
 * @property {boolean} [forceEscape] - whether to coerce characters to alternative forms if necessary to escape them.
 *   Defaults to true.
 * @typedef {Object} Options
 */
export namespace Options {
  export const defaults: Options = {
    escapeRanges: ['control', 'nonbreaking-space'],
    escapeBase: 16,
    forceEscape: true,
  };
}

// fast path
function isSafe(value: string) {
  return /^[\w ]*$/.test(value);
}

function replaceNull(value: string) {
  return value.replace(/\0/g, '\ufffd');
}
