/**
 * Created by lars voigt on 04.09.16.
 */
const tTSGenerator = require('../tts/dzb-tts-on-demand.js'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    path = require("path");

rimraf.sync(path.resolve(__dirname) + '/../../tmp/');

const demo = fs.readFileSync(path.resolve(__dirname, 'test_data.html'), 'utf8');

var i = 0;

runjob();
const interval = setInterval(runjob, 500);

function runjob() {

    console.log('i: ' + i);
    if(i === 50)
        clearInterval(interval);
    tTSGenerator.textToSpeech(demo)
        .then(function (result) {
            console.log(result);

        }).catch(function (err) {
        console.log('Test failed : ' + err);
    });
    i++;
}



