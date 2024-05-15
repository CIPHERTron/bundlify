import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';

// Convert `import.meta.url` to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// read file helper function
const readFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
};

// resolve the module path helper function
const resolveModule = (filePath, baseDir) => {
  if (filePath.startsWith('.')) {
    return path.resolve(baseDir, filePath);
  }
  return require.resolve(filePath, { paths: [baseDir] });
};

// function to transpile code using Bun CLI
const transpileCode = async (filePath) => {
  const { stdout } = await execa('bun', ['build', filePath, '--outfile', '/dev/stdout']);
  
  // filter out unwanted bun messages
  let filteredOutput = stdout
    .split('\n')
    .filter(line => !line.includes('stdout') && !line.match(/^\[\d+ms\]/))
    .join('\n');

  // CommonJS compatibility: export default -> module.exports
  filteredOutput = filteredOutput.replace(/export\s+default\s+/g, 'module.exports = ');

  return filteredOutput;
};

// function to parse and bundle the files
const bundleFiles = async (entryFile) => {

  let modules = {};
  let id = 0;
  let moduleStack = [];

  // add logic to detect circular dependency
  const addModule = async (filePath) => {
    if (modules[filePath]) {
      return modules[filePath].id;
    }

    if (moduleStack.includes(filePath)) {
      console.log("-----------------------------------------------------------------------")
      console.log("-----------------------------------------------------------------------")
      console.log("-----------------------------------------------------------------------")
      console.warn(`Circular dependency detected: ${moduleStack.join(' -> ')} -> ${filePath}`);
      console.log("-----------------------------------------------------------------------")
      console.log("-----------------------------------------------------------------------")
      console.log("-----------------------------------------------------------------------")
      return;
    }

    moduleStack.push(filePath);

    const moduleId = id++;
    const content = readFile(filePath);
    const dirName = path.dirname(filePath);

    // Parse dependencies from the original content
    const dependencies = [];
    const requireRegex = /require\(['"](.+?)['"]\)/g;
    const importRegex = /import .* from ['"](.+?)['"]/g;
    let match;

    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    const resolvedDependencies = dependencies.map(dep => resolveModule(dep, dirName));

    // Transpile code with Bun
    const transpiledContent = await transpileCode(filePath);

    modules[filePath] = {
      id: moduleId,
      filePath,
      content: transpiledContent,
      dependencies: resolvedDependencies,
    };


    await Promise.all(resolvedDependencies.map(async (dep) => {
      if (moduleStack.includes(dep)) {
        console.log("-----------------------------------------------------------------------")
        console.log("-----------------------------------------------------------------------")
        console.log("-----------------------------------------------------------------------")
        console.warn(`Circular dependency detected: ${moduleStack.join(' -> ')} -> ${dep}`);
        console.log("-----------------------------------------------------------------------")
        console.log("-----------------------------------------------------------------------")
        console.log("-----------------------------------------------------------------------")
      } else {
        await addModule(dep);
      }
    }));

    moduleStack.pop();

    return moduleId;
  };

  await addModule(entryFile);

  const output = [];

  output.push(`
(function(modules) {
  var installedModules = {};

  function require(moduleId) {
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }

    var module = installedModules[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {}
    };

    modules[moduleId].call(module.exports, module, module.exports, require);

    module.loaded = true;

    return module.exports;
  }

  return require(${modules[entryFile].id});
})({
`);

  Object.values(modules).forEach(module => {
    output.push(`  ${module.id}: function(module, exports, require) {`);
    output.push(module.content);
    output.push(`  },`);
  });

  output.push(`});`);

  return output.join('\n');
};

// entrypoint of bundlify - to bundle the project
const main = async () => {
  const entryFile = path.resolve(__dirname, 'target', 'index.js');
  const bundle = await bundleFiles(entryFile);
  const outputPath = path.resolve(__dirname, 'dist', 'bundle.js');

  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  fs.writeFileSync(outputPath, bundle, 'utf-8');
  console.log(`Bundle created at ${outputPath}`);
};

main();
