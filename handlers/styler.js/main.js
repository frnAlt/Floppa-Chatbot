// @ts-check
import { forceTitleFormat } from "cassidy-styler";
import {
  UNIRedux,
  UNISpectra,
  emojiEnd,
} from "../../CommandFiles/modules/unisym.js";

import FontSystem from "./fonts";
const { fonts } = FontSystem;

// FUCK DO NOT OWN, ENTIRELY MADE BY LIANE CAGARA.

/* plan structure 

heres my style metadata for my modules

export class style {
  title = {
    text_font: "bold_italic",
    line_top: "hidden",
    line_bottom: "default",
    line_replacer: "default",
    line_replace: "--",
    text_trim: true,
  }
  content = {
    text_font: "fancy",
    line_top: "hidden",
    line_bottom: "hidden",
    text_trim: false,
  }
}

the line is like an <hr> tag, uhh supports top and bottom

line configs:
hidden - does not even show
whiteline - its just \n


*/

/**
 *
 * @param {CommandStyle} style
 * @returns {CommandStyle}
 */
export function convertLegacyStyling(style) {
  const { CUSTOM_STYLE = { enabled: false, TITLE_PATTERN: "" } } =
    global.Cassidy.config;
  const { enabled: customEnabled = false } = CUSTOM_STYLE;
  const ex =
    Cassidy.config.showAuthorOnStyle ||
    (style.lineDeco && style.lineDeco) !== "none"
      ? { [`line_bottom_inside_${style.lineDeco || "x"}`]: "default" }
      : {};
  return {
    ...style,
    titleStyle: undefined,
    contentStyle: undefined,
    lineDeco: undefined,
    topLine: undefined,
    ...(style.title
      ? {
          title: {
            text_font: style.titleFont ?? "bold",
            content:
              typeof style.title === "object"
                ? "Title Invalid"
                : customEnabled
                  ? forceTitleFormat(
                      String(style.title),
                      CUSTOM_STYLE.TITLE_PATTERN,
                    )
                  : emojiEnd(String(style.title)),
            [`line_bottom${
              !style.topLine || style.topLine === "default"
                ? ""
                : `_${style.topLine}`
            }`]: "default",
            ...(typeof style.title === "object" && style.title
              ? style.title
              : {}),
            ...(typeof style.titleStyle === "object" && style.titleStyle
              ? style.titleStyle
              : {}),
          },
        }
      : {}),
    content: {
      text_font: style.contentFont ?? "none",
      content: null,
      ...ex,
      ...(typeof style.content === "object" && style.content
        ? style.content
        : {}),
      ...(typeof style.contentStyle === "object" && style.contentStyle
        ? style.contentStyle
        : {}),
    },
  };
}
/**
 *
 * @param {string} text
 * @param  {...string} replacers
 * @returns
 */
export function parseTemplate(text, ...replacers) {
  text = String(text);
  try {
    for (let index = 0; index < replacers.length; index++) {
      const replacer = replacers[index];
      if (!replacer) {
        continue;
      }
      if (typeof replacer === "string") {
        text = text.replace(
          new RegExp(`%${index + 1}(?!\\d)`, "g"),
          String(replacer),
        );
      } else if (replacer && typeof replacer === "object") {
        for (const key in replacer) {
          let value = replacer[key];
          if (typeof value === "object" && value) {
            value = JSON.stringify(value);
          } else if (typeof value !== "string") {
            value = String(value);
          }
          text = text.replace(new RegExp(`@{ ${key} }`, "g"), value);
        }
      }
    }
    return text;
  } catch (error) {
    console.error(error);
    return text;
  }
}

export class CassidyResponseStyler {
  #originalX;
  /**
   *
   * @param {CommandStyle} style
   * @param {string} key
   */
  constructor(style = {}, key = "content") {
    this.style = style;
    this.key = key;
    this.#originalX = JSON.parse(JSON.stringify(style));
    this.fc = null;
  }

  /**
   * @type {null | Cassieah.StyleFC}
   */
  fc;
  /**
   *
   * @param {string} text
   * @param  {...any} templates
   * @returns
   */
  text(text, ...templates) {
    const self = this;
    if (self.fc) {
      return self.fc({ children: text });
    }
    return styled(text ?? self.style.content, {
      [self.key]: {
        ...self.style,
        content_template: [...templates],
      },
    });
  }
  templatedText(...templates) {
    return this.text(null, ...templates);
  }
  applyTemplate(...templates) {
    return this.changeContent(null, ...templates);
  }
  cloneField() {
    return new CassidyResponseStyler(
      JSON.parse(JSON.stringify(style)),
      this.key,
    );
  }
  cloneOriginal() {
    return new CassidyResponseStyler(
      JSON.parse(JSON.stringify(this.#originalX)),
    );
  }
  changeContent(content, ...args) {
    this.style.content_template = [...args];
    this.style.content = content ?? this.style.content;
    return this;
  }
}
export class CassidyResponseStylerControl {
  #fields;
  #origFields;
  /**
   *
   * @param {CommandStyle} fields
   */
  constructor(fields = {}) {
    let f = fields;
    if (isClass(f)) {
      f = new f();
      f = makeFieldsEnumerable(f);
    }
    this.#origFields = JSON.parse(JSON.stringify(f));
    this.#fields = JSON.parse(JSON.stringify(f));
    this.fc = null;
  }

  /**
   * @type {null | Cassieah.StyleFC}
   */
  fc;
  activateAllPresets() {
    const fields = this.#fields;
    if (fields.preset) {
      if (!Array.isArray(fields.preset)) {
        fields.preset = [fields.preset];
      }
      for (const preset of fields.preset) {
        const data = JSON.parse(
          JSON.stringify(global.Cassidy.presets.get(preset)),
        );
        if (!data) {
          continue;
        }
        this.#fields = deepMerge(data, this.#fields);
        delete this.#fields.preset;
      }
    }
  }
  shallowMake(...styles) {
    let a = new CassidyResponseStylerControl(
      Object.assign(
        {},
        styles[0],
        JSON.parse(JSON.stringify(this.#fields)),
        ...styles.slice(1),
      ),
    );
    a.fc = this.fc;
    return a;
  }
  #proc(data, key) {
    return new CassidyResponseStyler(data, key);
  }
  getField(key, type) {
    if (type === "original") {
      return this.#origFields[key]
        ? this.#proc(this.#origFields[key], key)
        : null;
    }
    return this.#fields[key] ? this.#proc(this.#fields[key], key) : null;
  }
  createField(key) {
    if (this.#fields[key]) {
      return null;
    }
    this.#fields[key] = this.#proc({}, key);
    return this.#fields[key];
  }
  changeContents(keyContent = {}, templateData = {}) {
    for (const key in keyContent) {
      const field = this.getField(key);
      if (!field) {
        continue;
      }
      field.changeContent(keyContent[key], ...(templateData[key] ?? []));
    }
    return this;
  }
  changeContent(key, ...args) {
    this.getField(key)?.changeContent(...args);
    return this;
  }
  cloneAll() {
    return new CassidyResponseStylerControl(this.#fields);
  }
  cloneField(key) {
    return this.getField(key)?.cloneField(key);
  }
  createNewField(key) {
    return this.#proc({}, key);
  }
  text(text, keyContent) {
    if (this.fc) {
      return this.fc({ children: text });
    }
    if (keyContent) {
      const clone = this.cloneAll();
      return clone.changeContents(keyContent).text(text);
    }
    //console.log("[Sent Style]", this.#fields);
    return styled(text ?? "", this.#fields);
  }
  getFields() {
    return this.#fields;
  }
  html(text, keyContent) {
    if (this.fc) {
      return this.fc({ children: text });
    }
    if (keyContent) {
      const clone = this.cloneAll();
      return clone.changeContents(keyContent).html(text);
    }
    //console.log("[Sent Style]", this.#fields);
    return styledForHTML(text ?? "", this.#fields);
  }
  appendField(key, field) {
    if (!(field instanceof CassidyResponseStyler)) {
      return this;
    }
    if (this.#fields[key]) {
      return this;
    }
    this.#fields[key] = field;
    return this;
  }
  removeField(key) {
    const backup = this.#fields[key];
    if (!backup) {
      return null;
    } else {
      delete this.#fields[key];
      return backup;
    }
  }
  toString(text) {
    return this.text(text);
  }
}
export const crs = {};
/**
 *
 * @param {string} text
 * @param {CommandStyle | { new(): CommandStyle }} StyleClass
 * @returns
 */
export function styled(text = "", StyleClass) {
  const { presets } = global.Cassidy;
  text = String(text);
  try {
    text = autoBold(text);
    text = fontTag(text);
    let styling = StyleClass;
    if (!isClass(StyleClass)) {
      if (Object.keys(StyleClass).length === 0) {
        return text;
      }
      if (
        typeof StyleClass.titleFont === "string" ||
        typeof StyleClass.contentFont === "string" ||
        typeof StyleClass.title === "string"
      ) {
        styling = convertLegacyStyling(JSON.parse(JSON.stringify(StyleClass)));
      } else {
        styling = JSON.parse(JSON.stringify(StyleClass));
      }
    } else if (isClass(StyleClass)) {
      styling = new StyleClass();
    }
    /**
     * @type {CommandStyle}
     */
    const parsed = JSON.parse(JSON.stringify(makeFieldsEnumerable(styling)));
    styling = parsed;
    const styleInfo = styling;
    if (styling.preset) {
      if (!Array.isArray(styling.preset)) {
        styling.preset = [styling.preset];
      }
      for (const preset of styling.preset) {
        const data = presets.get(preset);
        if (!data) {
          continue;
        }
        styling = deepMerge(data, styling);
      }
    }
    //console.log("[Received Style]", styling);
    /**
     * @type {CommandStyle}
     */
    let container = {};
    styleInfo.title ??= {
      content: "",
    };
    styleInfo.content ??= {};
    for (const key in styleInfo) {
      /**
       * @type {any}
       */
      const ownStyling = styleInfo[key];
      if (typeof ownStyling !== "object" || !ownStyling) {
        continue;
      }
      let value = ownStyling.content ?? text;
      if (ownStyling.number_font) {
        // value = numberFont(value, ownStyling.number_font);
      }
      container[key] = value;
      if (Array.isArray(ownStyling.content_template)) {
        container[key] = parseTemplate(
          // @ts-ignore
          container[key],
          ...ownStyling.content_template,
        );
      }
      container[key] = applyLine(container[key], ownStyling);
      if (Array.isArray(ownStyling.content_template)) {
        container[key] = parseTemplate(
          // @ts-ignore
          container[key],
          ...ownStyling.content_template,
        );
      }
      container[key] = applyText(container[key], ownStyling);
    }
    text = "";
    /**
     *
     * @param {string} key
     * @param {string} str
     * @returns
     */
    function addLineHelper(key, str) {
      if (styling[key].new_line === true) {
        return str;
      } else {
        return extraWhiteLine(str);
      }
    }
    if (container.title) {
      text += addLineHelper("title", `${container.title}\n`);
      delete container.title;
    }
    if (container.content) {
      text += addLineHelper("content", `${container.content}\n`);
      delete container.content;
    }
    for (const key in container) {
      text += addLineHelper(key, `${container[key]}\n`);
    }
    return text;
  } catch (error) {
    console.error("[Styler]", error);
    return text;
  }
}
/**
 *
 * @param {string} text
 * @param {string} font
 * @returns
 */
export function numberFont(text, font) {
  text = String(text);
  text = text
    .split("")
    .map((char) => {
      if (!isNaN(parseFloat(char))) {
        return fonts[font](char);
      } else {
        return char;
      }
    })
    .join("");
  return text;
}

/**
 *
 * @param {string} text
 * @returns
 */
export function autoBold(text) {
  text = String(text);
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, (_, text) =>
    fonts.bold_italic(text),
  );
  text = text.replace(/\*\*(.*?)\*\*/g, (_, text) => fonts.bold(text));

  text = text.replace(/`(.*?)`/g, (_, code) => fonts.typewriter(code));

  return String(text);
}
export function extraWhiteLine(text) {
  text = String(text);
  // return String(text).endsWith("\n") ? `${text}` : `${text}\n`;
  return text.trimEnd() + "\n";
}

export function fontTag(text) {
  text = String(text);
  text = text.replace(
    /\[font=(.*?)\]\s*(.*?)\s*\[:font=(.*?)\]/g,
    (_, font, text, font2) => (font === font2 ? fonts[font](text) : text),
  );
  return text;
}

export function makeFieldsEnumerable(instance) {
  const fields = Object.getOwnPropertyNames(instance);
  fields.forEach((field) => {
    const descriptor = Object.getOwnPropertyDescriptor(instance, field);
    if (descriptor && "value" in descriptor) {
      Object.defineProperty(instance, field, {
        ...descriptor,
        enumerable: true,
      });
    }
  });
  return instance;
}

export function applyText(text, styling) {
  text = String(text); //.trimStart().trimEnd();
  function helper(field, type, ...etc) {
    if (!field) {
      return;
    }
    if (field === "none") {
      return;
    }
    let prefix = "";
    let suffix = "";
    switch (type) {
      case "font":
        text = fonts[field](text);
        break;
      case "kerning":
        text = text
          .split(" ")
          .map((part) => {
            if (/^[A-Za-z0-9]+$/.test(part)) {
              return part.split("").join(" ".repeat(parseInt(field)));
            } else {
              return part;
            }
          })
          .join("  ".repeat(parseInt(field)));

        break;
      case "prefix":
        if (etc[0] === "replace") {
          text = text.replaceAll(field, prefix);
        } else {
          prefix = field;
          text = `${prefix}${text}`;
          text = text.replaceAll("\n", `\n${prefix}`);
        }
        break;
      case "suffix":
        if (etc[0] === "replace") {
          text = text.replaceAll(field, suffix);
        } else {
          suffix = field;
          text = `${text}${suffix}`;
          text = text.replaceAll("\n", `\n${suffix}`);
        }
        break;
      case "trim":
        if (field === "true" || field === true) {
          text = text.trim();
        }
        break;
    }
  }
  for (const key in styling) {
    const [a, type, ...etc] = key.split("_");
    if (a !== "text") {
      continue;
    }
    if (type === "font") {
      continue;
    }
    helper(styling[key], type, ...etc);
  }
  text = autoBold(text);
  text = fontTag(text);

  helper(styling.text_font, "font");
  return text;
}

export function applyLine(text, styling) {
  text = String(text); //.trimStart().trimEnd();
  let replacerConfig = "default";

  function helper(field, type, ...etc) {
    let length = 0;
    if (field === "none") {
      return;
    }
    if (type === "replace") {
      field = replacerConfig;
    }
    if (field === "default") {
      length = 15;
    } else if (/^\d+chars$/.test(field)) {
      length = parseInt(field.replace("chars", ""));
    } else if (field === "hidden") {
      length = 0;
    }
    const lineMap = {
      akhiro: "▱",
      default: "━",
      thin: "─",
      double: "═",
    };
    const lineChar = lineMap[etc[0]] ?? lineMap.default;
    let line = lineChar.repeat(length);
    if (field === "whiteline") {
      line = "";
    }
    if (etc[0] === "inside") {
      switch (etc[1]) {
        case "x":
          {
            const newLength = Math.max(0, Math.floor(length / 2));
            line = `${"━".repeat(newLength)} ✕ ${"━".repeat(newLength - 1)}`;
          }
          break;
        case "altar":
          {
            const newLength = Math.max(0, Math.floor(length / 2.5));
            line = `${"━".repeat(newLength)}◈✙◈${"━".repeat(newLength)}`;
          }
          break;
        case "text":
          {
            line = `━━━ ${field} ━━━`;
            if (etc[2] === "elegant") {
              line = `━━━【${fonts.bold(field)}】━━━`;
            }
          }
          break;
      }
    }

    if (type === "top") {
      text = `${line}\n${text}`;
    } else if (type === "bottom") {
      text = `${text}\n${line}`;
    } else if (type === "") {
      text = `${line}\n${text}\n${line}`;
    } else if (type === "replacer") {
      replacerConfig = field;
    } else if (type === "replace") {
      text = text.replaceAll(field, line);
    }
    return line;
  }

  for (const key in styling) {
    const [a, type = "", ...etc] = key.split("_");
    if (a !== "line") {
      continue;
    }
    helper(styling[key], type, ...etc);
  }

  return text;
}
/**
 *
 * @param {object} arg
 * @returns {arg is { new(...args: any): any }}
 */
export function isClass(arg) {
  return (
    "prototype" in arg &&
    arg.prototype &&
    typeof arg.prototype.constructor === "function" &&
    typeof arg === "function"
  );
}

export function deepMerge(target, ...sources) {
  if (typeof target !== "object" || target === null) {
    throw new Error("Target must be an object or array");
  }

  for (const source of sources) {
    if (typeof source !== "object" || source === null) {
      continue;
    }

    if (Array.isArray(source)) {
      if (Array.isArray(target)) {
        target = [/*...target,*/ ...source];
      } else if (!target) {
        target = [...source];
      } else {
        target = [target, ...source];
        //throw new Error("Cannot merge array into non-array");
      }
    } else {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (typeof source[key] === "object" && source[key] !== null) {
            if (typeof target[key] === "object" && target[key] !== null) {
              target[key] = deepMerge(target[key], source[key]);
            } else {
              target[key] = deepMerge({}, source[key]);
            }
          } else {
            target[key] = source[key];
          }
        }
      }
    }
  }

  return target;
}

export function styledForHTML(text = "", StyleClass) {
  return styled(text, StyleClass);
  text = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");

  try {
    let styling = StyleClass;
    if (typeof styling === "function" && styling.prototype) {
      styling = new StyleClass();
    } else if (
      typeof styling === "string" ||
      (styling &&
        (typeof styling.titleFont === "string" ||
          typeof styling.contentFont === "string" ||
          typeof styling.title === "string"))
    ) {
      styling = convertLegacyStyling(JSON.parse(JSON.stringify(styling)));
    } else if (!styling || Object.keys(styling).length === 0) {
      styling = { content: {} };
    } else {
      styling = JSON.parse(JSON.stringify(styling));
    }

    styling.title = styling.title || { content: "" };
    styling.content = styling.content || {};

    let html = "";

    function autoBoldHTML(txt) {
      txt = String(txt);
      txt = txt.replace(/\*\*\*(.*?)\*\*\*/g, "<b><i>$1</i></b>");
      txt = txt.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      return txt;
    }

    function autoFontHTML(txt) {
      txt = String(txt);
      txt = txt.replace(
        /\[font=(.*?)\]\s*(.*?)\s*\[:font=(.*?)\]/g,
        (_, font, content, font2) =>
          font === font2
            ? font === "bold"
              ? `<b>${content}</b>`
              : fonts[font](content)
            : content,
      );
      return txt;
    }

    for (const key in styling) {
      const ownStyling = styling[key];
      if (typeof ownStyling !== "object" || !ownStyling) continue;

      let value = ownStyling.content ?? text;

      if (Array.isArray(ownStyling.content_template)) {
        value = parseTemplate(value, ...ownStyling.content_template);
      }

      let styledText = value;
      const font = ownStyling.text_font || "none";
      let iii = false;

      if (styling && font === "bold") {
        styledText = `<b>${styledText}</b>`;
      } else if (styling && font === "fancy_italic") {
        styledText = `<i>${styledText}</i>`;
      } else if (styling && font === "bold_italic") {
        styledText = `<b><i>${styledText}</i></b>`;
      } else if (styling && font === "fancy") {
      } else if (styling && font === "typewriter") {
      } else if (styling && font) {
        styledText = styling ? autoFontHTML(styledText) : styledText;
        styledText = styling ? autoBoldHTML(styledText) : styledText;
        iii = true;
        styledText = fonts[font](styledText);
      }

      if (!iii) {
        styledText = styling ? autoFontHTML(styledText) : styledText;
        styledText = styling ? autoBoldHTML(styledText) : styledText;
      }
      const topLine = ownStyling.line_top || "hidden";
      const bottomLine = ownStyling.line_bottom || "hidden";
      let output = "";

      if (styling && topLine !== "hidden" && topLine !== "whiteline") {
        output += `<br>${UNISpectra.standardLine}<br>`;
      } else if (styling && topLine === "whiteline") {
        output += "<br>";
      }

      output += styledText;

      if (styling && bottomLine !== "hidden" && bottomLine !== "whiteline") {
        output += `<br>${UNISpectra.standardLine}<br>`;
      } else if (styling && bottomLine === "whiteline") {
        output += "<br>";
      }

      if (key === "title") {
        html += `<h3>${output}</h3>`;
      } else if (key === "content") {
        html += `<p>${output}</p>`;
      } else {
        html += `<div>${output}</div>`;
      }
    }
    html = html.replaceAll("\n", "<br>");

    return html.trim();
  } catch (error) {
    console.error("[HTML Styler]", error);
    return `<p>${text.replaceAll("\n", "<br>")}</p>`;
  }
}
