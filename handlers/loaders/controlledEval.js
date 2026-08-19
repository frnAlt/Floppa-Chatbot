const ts = require("typescript");
const { createContext, runInContext } = require("vm");
const { readFileSync } = require("fs");

class LoaderError extends Error {
  constructor(message, { ...options } = {}) {
    super(message);
    delete options.message;
    this.name = "LoaderError";
    Object.assign(this, options);
    //Error.captureStackTrace(this, LoaderError);
  }
}
/**
 * Load and execute a TypeScript module within a VM with additional context.
 * @param {string} filePath - Path to the TypeScript module file.
 * @param {Object} context - Additional context to be provided to the module.
 * @returns {any} - Exported members of the module.
 * @throws {LoaderError} - If the module fails to load or execute.
 * @author Liane Cagara https://github.com/lianecagara
 */
function moduleLoader(filePath, context, isCode) {
  try {
    // Read TypeScript code from file using fs.
    let code = readFileSync(filePath, "utf8");
    if (isCode) {
      code = filePath;
    }

    const tsConfig = ts.readConfigFile("tsconfig.json", ts.sys.readFile);

    const { options } = ts.parseJsonConfigFileContent(
      tsConfig.config,
      ts.sys,
      "./",
    );

    // Compile TypeScript code
    const { outputText } = ts.transpileModule(code, {
      compilerOptions: options,
      fileName: filePath,
    });

    // Create a new context with the provided context
    Object.assign(context || {}, global);
    const vmContext = createContext(context);

    // Run the transpiled code in the VM
    runInContext(outputText, vmContext, {
      filename: filePath,
      displayErrors: true,
    });

    // Return the module.exports from the VM context
    return vmContext?.module?.exports || {};
  } catch (error) {
    // Catch errors and throw it as a LoaderError
    //throw new LoaderError(error.message, error);
    throw error;
  }
}

module.exports = moduleLoader;
