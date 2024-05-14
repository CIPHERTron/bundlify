const fs = require('fs');

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


