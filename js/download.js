/**
 * Created by alan on 09.08.16.
 */

const util = require("util"),
    http = require("http"),
    fs = require('fs'),
    cheerio = require('cheerio');


var options = {
    host: "192.168.1.135",
    port: 8080,
    path: "http://www.mdr.de/nachrichten/politik/ausland/grossdemo-istanbul-erdogan-102.html"//,
};


getPage(options);

function getPage(options) {

    const req = http.request(options, function (res) {


        res.setEncoding('utf8');

        var output = '';
        res.on("data", function (chunk) {
            output += chunk;
        });

        res.on('end', function () {
            //console.log(output);
            var $ = cheerio.load(output);
             $ = cheerio.load($('.sectionWrapperMain', '#content').html());
             $('.conComments').remove();
             $('.conRelatedLinks').remove();
             $('.conTimestamp').remove();
             $('.cssBoxTeaserStandard').remove();

            writeData($);
            console.log($.html());
        });
    });

    req.on('error', function (err) {
        process.exit(1);
    });

    req.end();
}

function writeData(data) {

    const $ = cheerio.load('<!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8"> <title></title> </head> <body> </body> </html>');
    $('body').append(data.html());
    
    fs.writeFile("test.html", $.html(), function (err) {
        if (err) {
            console.log("Error: " + err);
        } else {
            console.log("Success!");
        }
    });
}