const {add} = require('./add.js')
const {substract} = require('./substract.js')
const {multiply} = require('./multiply.js')

function main() {
    const a = 12;
    const b = 8;

    const sum = add(a, b);
    const diff = substract(a, b);
    const multiplication = multiply(a, b);

    console.log(`Sum of ${a} & ${b} is `, sum);
    console.log(`Difference of ${a} & ${b} is `, diff);
    console.log(`${a} times ${b} is `, sum);
}

main();