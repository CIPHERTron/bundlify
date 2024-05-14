import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';

// Convert `import.meta.url` to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to read a file and return its content
const readFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
};

// Function to resolve the module path
const resolveModule = (filePath, baseDir) => {
  if (filePath.startsWith('.')) {
    return path.resolve(baseDir, filePath);
  }
  return require.resolve(filePath, { paths: [baseDir] });
};

// Function to transpile code using Bun CLI
const transpileCode = async (filePath) => {
  const { stdout } = await execa('bun', ['build', filePath, '--outfile', '/dev/stdout']);
  
  // Filter out extraneous Bun messages
  const filteredOutput = stdout
    .split('\n')
    .filter(line => !line.includes('stdout') && !line.match(/^\[\d+ms\]/))
    .join('\n');

  return filteredOutput;
};

// Function to parse and bundle the files
const bundleFiles = async (entryFile) => {
  const baseDir = path.dirname(entryFile);

  let modules = {};
  let id = 0;
  let moduleStack = [];

  const addModule = async (filePath) => {
    if (modules[filePath]) {
      return modules[filePath].id;
    }

    if (moduleStack.includes(filePath)) {
      console.warn(`Circular dependency detected: ${moduleStack.join(' -> ')} -> ${filePath}`);
      return;
    }

    moduleStack.push(filePath);

    const moduleId = id++;
    const content = readFile(filePath);
    const dirName = path.dirname(filePath);

    // Transpile code with Bun
    const transpiledContent = await transpileCode(filePath);

    const dependencies = [];
    const requireRegex = /require\(['"](.+?)['"]\)/g;
    const importRegex = /import .* from ['"](.+?)['"]/g;
    let match;

    // Find dependencies
    while ((match = requireRegex.exec(transpiledContent)) !== null) {
      dependencies.push(match[1]);
    }
    while ((match = importRegex.exec(transpiledContent)) !== null) {
      dependencies.push(match[1]);
    }

    const resolvedDependencies = dependencies.map(dep => resolveModule(dep, dirName));

    modules[filePath] = {
      id: moduleId,
      filePath,
      content: transpiledContent,
      dependencies: resolvedDependencies,
    };

    await Promise.all(resolvedDependencies.map(addModule));

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

  require.resolve = function(request) {
    return modules[request] ? request : null;
  };

  require.ensure = function(request, callback) {
    callback(require(request));
  };

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

// Main function to bundle the project
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
