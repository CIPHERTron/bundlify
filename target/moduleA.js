const moduleB = require('./moduleB.js');

module.exports = () => {
  console.log('In moduleA');
  moduleB();
};
