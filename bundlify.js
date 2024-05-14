const fs = require('fs');

// Function to read a file and return its content
const readFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
};


