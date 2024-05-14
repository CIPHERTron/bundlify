import arr from './module.js';

const displayFunc = () => {
    let result = "";
    arr.forEach(x => x = result + x)

    console.log(result);
}

displayFunc();