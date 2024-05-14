const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
const transpileCode = (code) => {
  const tempInputPath = path.join(__dirname, 'temp_input.js');
  const tempOutputPath = path.join(__dirname, 'temp_output.js');

  fs.writeFileSync(tempInputPath, code);

  execSync(`bun build ${tempInputPath} --outdir ${__dirname} --outfile temp_output.js`);

  const transpiledCode = readFile(tempOutputPath);

  fs.unlinkSync(tempInputPath);
  fs.unlinkSync(tempOutputPath);

  return transpiledCode;
};

// Function to parse and bundle the files
const bundleFiles = (entryFile) => {
  const baseDir = path.dirname(entryFile);
  const entryContent = readFile(entryFile);
  
  let modules = {};
  let id = 0;

  const addModule = (filePath) => {
    if (modules[filePath]) {
      return modules[filePath].id;
    }
    const moduleId = id++;
    const content = readFile(filePath);
    const dirName = path.dirname(filePath);

    // Transpile code with Bun
    const transpiledContent = transpileCode(content);

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

    resolvedDependencies.forEach(addModule);

    return moduleId;
  };

  addModule(entryFile);

  const output = [];

  Object.values(modules).forEach(module => {
    output.push(`// Module ${module.id}`);
    output.push(`(function(module, exports, require) {`);
    output.push(module.content);
    output.push(`})({id: ${module.id}}, {}, require);`);
  });

  output.push(`// Entry point`);
  output.push(`require(${modules[entryFile].id});`);

  return output.join('\n');
};

// Main function to bundle the project
const main = () => {
  const entryFile = path.resolve(__dirname, 'src', 'index.js');
  const bundle = bundleFiles(entryFile);
  const outputPath = path.resolve(__dirname, 'dist', 'bundle.js');

  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  fs.writeFileSync(outputPath, bundle, 'utf-8');
  console.log(`Bundle created at ${outputPath}`);
};

main();
