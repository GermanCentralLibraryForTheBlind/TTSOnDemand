/**
 * Created by larsvoigt on 24.08.16.
 */

const fs = require('fs'),
    path = require('path'),
    request = require('request');


const url = 'http://localhost:3000/tts';

fs.createReadStream(path.resolve(__dirname, '../../../demo.html'))
    .on('error', function (e) {
        console.error(e);
    })
    .pipe(request.post(url).on('response', function (response) {

        response.on("data", function (chunk) {
            console.log("message: " + chunk);
        });
        console.log('status code: ' + response.statusCode);
        console.log(response.headers['content-type']);

    }).on('error', function (e) {
        console.error(e);
    }));


