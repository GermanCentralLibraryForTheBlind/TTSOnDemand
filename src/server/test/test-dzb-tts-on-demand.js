/**
 * Created by lars voigt on 04.09.16.
 */
const tTSGenerator = require('../../tts/dzb-tts-on-demand.js'),
    fs = require('fs'),
    path = require("path");

const demo = fs.readFileSync(path.resolve(__dirname, 'test_data.html'), 'utf8');
tTSGenerator.textToSpeech(demo)
    .then(function (result) {

        if (result.stderr) {
            console.log(result.stderr);
        }
        if (result.stdout && detailedLog) {
            console.log(result.stdout);
        }

    }).catch(function (err) {
        console.log(err);
    });