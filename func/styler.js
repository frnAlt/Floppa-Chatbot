/**
 * Styler and Message Typography Layout Engine
 * Provides styled messaging, borders, headers, and footer components.
 */

const { applyFont, autoBold, reverseFonts, fontMap } = require("./fonts.js");

class CassidyResponseStylerControl {
  constructor(config = {}) {
    this.config = {
      titleFont: config.titleFont || "bold",
      contentFont: config.contentFont || "none",
      headerIcon: config.headerIcon || "✨",
      footerIcon: config.footerIcon || "✦",
      lineChar: config.lineChar || "─",
      showAuthor: config.showAuthor ?? false,
      ...config
    };
  }

  format(options) {
    return format(options, this.config);
  }
}

/**
 * Format a complete response object into styled text
 * @param {Object} options - formatting options
 * @param {string|Object} options.title - title of the message
 * @param {string} options.titleFont - font for title
 * @param {string} options.content - main content body
 * @param {string} options.contentFont - font for content body
 * @param {string|Object} options.footer - footer content
 * @param {string} options.lineDeco - line decoration style
 * @param {Object} defaultCfg - fallback configuration
 */
function format(options, defaultCfg = {}) {
  if (typeof options === "string") {
    return autoBold(options);
  }
  if (!options || typeof options !== "object") {
    return String(options || "");
  }

  const titleRaw = typeof options.title === "object" ? options.title?.content : options.title;
  const contentRaw = typeof options.content === "object" ? options.content?.content : options.content;
  const footerRaw = typeof options.footer === "object" ? options.footer?.content : options.footer;

  const titleFont = options.titleFont || options.title?.text_font || defaultCfg.titleFont || "bold";
  const contentFont = options.contentFont || options.content?.text_font || defaultCfg.contentFont || "none";
  const footerFont = options.footerFont || options.footer?.text_font || "fancy";

  const parts = [];

  // Title section
  if (titleRaw) {
    const styledTitle = applyFont(String(titleRaw), titleFont);
    parts.push(styledTitle);
  }

  // Content section
  if (contentRaw !== undefined && contentRaw !== null) {
    let styledContent = String(contentRaw);
    if (contentFont && contentFont !== "none") {
      styledContent = applyFont(styledContent, contentFont);
    }
    styledContent = autoBold(styledContent);
    parts.push(styledContent);
  }

  // Footer section
  if (footerRaw) {
    const styledFooter = applyFont(autoBold(String(footerRaw)), footerFont);
    parts.push(styledFooter);
  }

  return parts.join("\n\n");
}

function forceTitleFormat(title, pattern = "") {
  if (!pattern) return title;
  return pattern.replace("{title}", title);
}

function convertLegacyStyling(style) {
  if (!style) return {};
  return {
    ...style,
    titleFont: style.titleFont || "bold",
    contentFont: style.contentFont || "none"
  };
}

const FontSystem = require("./fonts.js");

module.exports = {
  format,
  autoBold,
  applyFont,
  applyFonts: applyFont,
  reverseFonts,
  forceTitleFormat,
  convertLegacyStyling,
  CassidyResponseStylerControl,
  FontSystem,
  fonts: FontSystem.fonts
};
