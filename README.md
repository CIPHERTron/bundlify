# bundlify - A simplistic JavaScript bundler
`bundlify` is a simplistic JavaScript bundler that given a project with multiple files and external dependencies, will read JavaScript files, resolve and bundle the code into a single output file.

## How to use bundlify?
- fork & clone the repo
- run `npm install`
- create a new folder named `target` in the root or replace the contents of the currently present `target` dir
- Add an `index.js` file as well as multiple other JS module files inside **target** dir
- Run `npm run bundlify` in the terminal
- The above command will bundle the JS files inside **target** dir and output them into a `dist/index.js` file
- Now run `node dist/index.js` to execute the bundled output file

## Key Features
- Can bundle multiple JS files into a single one
- supports both module and commonjs i.e. you'll be able to use both `import` and `require` keywords and it can successfully able to transpile
- Can detect circular dependency and warns when detected the same

## Limitations
- It cannot resolve external dependencies at the moment (that's a WIP)

---

*Built with* <3 *by [Pritish](https://pritishsamal.xyz) .aka CIPHERTron*
