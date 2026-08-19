function compile(code) {
  code = `${code}`;
  const strings = {};
  const numbers = {};
  const lines = code.split(";").map((line) => line.trim());
  const functions = {};
  const lineTokens = [];
  for (const line of lines) {
    const tokens = line.split(" ").map((token) => token.trim());
    lineTokens.push(tokens);
  }
  function matchToken(...detectTokens) {
    const matches = [];
    for (const line in lineTokens) {
      const tokens = lineTokens[line];
      if (
        tokens.every((token, i) => {
          const detectToken = detectTokens[i] || null;
          if (detectToken === ";" && token) {
            return false;
          }
          if (typeof detectToken === "string") {
            return token === detectToken;
          }
          if (detectToken instanceof RegExp) {
            return detectToken.test(token);
          }
          if (detectToken === null) {
            return true;
          }
          return false;
        })
      ) {
        const copy = [...tokens];
        copy.line = line;
        matches.push(copy);
      } else {
        // do nothing.
      }
    }
    return matches;
  }
  return {
    matchToken,
    functions,
    strings,
    numbers,
    lines,
    lineTokens,
    createStack(arr) {
      return `at line ${arr.line}: ${lines[arr.line]}`;
    },
  };
}
function run(data) {
  const {
    matchToken,
    strings,
    numbers,
    lines,
    lineTokens,
    functions,
    createStack,
  } = compile(data);
  function getValue(name, arr) {
    if (name in strings) {
      return {
        type: "string",
        value: strings[name],
      };
    }
    if (name in numbers) {
      return {
        type: "number",
        value: strings[name],
      };
    }
    throw new Error(`${name} is not defined!
${arr ? createStack(arr) : ""}`);
  }
  function createType(value) {
    if (value && value.startsWith('"') && value.endsWith('"')) {
      return "string";
    }
    if (value && !isNaN(parseFloat(value))) {
      return "number";
    }
    if (value && value.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*$/)) {
      return "variable";
    }
    return "";
  }
  function cleanValue(value) {
    const valueType = createType(value);
    if (valueType === "string") {
      return value.slice(1, -1);
    }
    if (valueType === "number") {
      return parseFloat(value);
    }
    if (valueType === "variable") {
      return getValue(value).value;
    }
    return "";
  }

  const declarations = matchToken("create", /^[a-zA-Z$_][a-zA-Z0-9$_]*$/, "=");

  for (const declaration of declarations) {
    let [, name, , ...value] = declaration;
    if (strings[name] || functions[name]) {
      throw new Error(`Variable "${name}" already exists.
${createStack(declaration)}`);
    }
    let valueType = createType(value);
    if (valueType === "variable") {
      const { type, value: newValue } = getValue(value);
      if (type === "string") {
        strings[name] = newValue;
      } else if (type === "number") {
        numbers[name] = newValue;
      }
    } else if (valueType === "string") {
      strings[name] = cleanValue(value);
      console.log(`Created String, ${name}: "${strings[name]}"
${createStack(declaration)}`);
    } else if (valueType === "number") {
      numbers[name] = cleanValue(value);
      console.log(`Created Number, ${name}: ${numbers[name]}
${createStack(declaration)}`);
    } else {
      throw new Error(`Invalid value for variable "${name}".
${createStack(declaration)}`);
    }
  }
  const logs = matchToken("log");
  for (const log of logs) {
    let [, ...value] = log;
    console.log(`[LOG]: `, cleanValue(value));
  }
}

const code = `create name = "Cassidy";
log name;`;
//
run(code);
module.exports = { compile, run };
