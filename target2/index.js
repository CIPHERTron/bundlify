import { arr } from './module.js'

const displayFunc = () => {
    console.log(arr)
    let result = "";
    arr.forEach(x => x = result + x)

    console.log(result);
}

displayFunc();
