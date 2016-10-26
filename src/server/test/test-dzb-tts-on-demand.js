/**
 * Created by lars voigt on 04.09.16.
 */
const tTSGenerator = require('../../tts/dzb-tts-on-demand.js'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    path = require("path");

rimraf.sync(path.resolve(__dirname) + '/../../tmp');

const demo = fs.readFileSync(path.resolve(__dirname, 'test_data.html'), 'utf8');
tTSGenerator.textToSpeech(demo)
    .then(function (result) {

        if (result.stderr) {
            console.log('error test: ' + result.stderr);
        }
        if (result.stdout && detailedLog) {
            console.log(result.stdout);
        }

    }).catch(function (err) {
        console.log('Test failed : ' + err);
    });