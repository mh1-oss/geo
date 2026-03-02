const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('dist/55555.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(console.error);
