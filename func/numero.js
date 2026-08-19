/**
 * Numero Namespace Utilities
 * A collection of mathematical and numeric operations: variance, slopes, clamping, probabilities, etc.
 */

const Numero = {
  applyVariance(value, percent) {
    percent = Math.min(Math.max(percent, 0), 1);
    const randomFactor = (Math.random() * 2 - 1) * percent;
    return value * (1 + randomFactor);
  },

  clamp(min, desired, max) {
    return Math.min(Math.max(desired, min), max);
  },

  chance(probability) {
    probability = Numero.clamp(0, probability, 1);
    return Math.random() < probability;
  },

  largest(...x) {
    if (x.length === 0) throw new Error("No numbers provided");
    return Math.max(...x);
  },

  smallest(...x) {
    if (x.length === 0) throw new Error("No numbers provided");
    return Math.min(...x);
  },

  slope(x1, y1, x2, y2) {
    if (x2 === x1) throw new Error("Cannot calculate slope with vertical line (x1 === x2)");
    return (y2 - y1) / (x2 - x1);
  },

  smoothFluctuate(base, percent, time, frequency = 1) {
    const factor = Math.sin(time * frequency * Math.PI * 2) * percent;
    return base * (1 + factor);
  },

  diminishingReturns(value, maxCapacity, decayRate = 0.01) {
    return maxCapacity * (1 - Math.exp(-decayRate * value));
  },

  exponentialGrowth(base, rate, time) {
    return base * Math.exp(rate * time);
  },

  linearInterpolation(start, end, progress) {
    return start + (end - start) * Numero.clamp(0, progress, 1);
  },

  smoothStep(start, end, progress) {
    const t = Numero.clamp(0, progress, 1);
    const smoothT = t * t * (3 - 2 * t);
    return start + (end - start) * smoothT;
  },

  toRoman(num) {
    if (isNaN(num)) return "NaN";
    const lookup = {
      M: 1000, CM: 900, D: 500, CD: 400,
      C: 100, XC: 90, L: 50, XL: 40,
      X: 10, IX: 9, V: 5, IV: 4, I: 1
    };
    let roman = "";
    for (const i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  },

  fromRoman(str) {
    if (!str || typeof str !== "string") return 0;
    const lookup = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let num = 0;
    const s = str.toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const current = lookup[s[i]] || 0;
      const next = lookup[s[i + 1]] || 0;
      if (current < next) {
        num += next - current;
        i++;
      } else {
        num += current;
      }
    }
    return num;
  }
};

module.exports = Numero;
module.exports.Numero = Numero;
