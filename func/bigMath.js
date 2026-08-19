/**
 * BigMath - High-precision BigInt arithmetic operations
 */

class BigMath {
  static abs(x) {
    const b = BigInt(x);
    return b < 0n ? -b : b;
  }

  static max(...values) {
    if (values.length === 0) throw new Error("No arguments provided");
    return values.map(BigInt).reduce((max, val) => (val > max ? val : max));
  }

  static min(...values) {
    if (values.length === 0) throw new Error("No arguments provided");
    return values.map(BigInt).reduce((min, val) => (val < min ? val : min));
  }

  static clamp(x, min, max) {
    const bx = BigInt(x);
    const bmin = BigInt(min);
    const bmax = BigInt(max);
    if (bmin > bmax) throw new Error("min must be less than or equal to max");
    return bx < bmin ? bmin : bx > bmax ? bmax : bx;
  }

  static sign(x) {
    const b = BigInt(x);
    return b === 0n ? 0n : b > 0n ? 1n : -1n;
  }

  static add(a, b) {
    return BigInt(a) + BigInt(b);
  }

  static sub(a, b) {
    return BigInt(a) - BigInt(b);
  }

  static mul(a, b) {
    return BigInt(a) * BigInt(b);
  }

  static div(a, b) {
    const bb = BigInt(b);
    if (bb === 0n) throw new Error("Division by zero");
    return BigInt(a) / bb;
  }

  static mod(a, b) {
    const bb = BigInt(b);
    if (bb === 0n) throw new Error("Division by zero");
    return BigInt(a) % bb;
  }

  static pow(base, exponent) {
    const bexp = BigInt(exponent);
    if (bexp < 0n) throw new Error("Exponent must be non-negative");
    return BigInt(base) ** bexp;
  }

  static sqrt(x) {
    const bx = BigInt(x);
    if (bx < 0n) throw new Error("Square root of negative bigint");
    if (bx < 2n) return bx;

    let low = 1n;
    let high = bx;
    while (low <= high) {
      const mid = (low + high) / 2n;
      const square = mid * mid;
      if (square === bx) return mid;
      else if (square < bx) low = mid + 1n;
      else high = mid - 1n;
    }
    return high;
  }
}

module.exports = BigMath;
module.exports.BigMath = BigMath;
