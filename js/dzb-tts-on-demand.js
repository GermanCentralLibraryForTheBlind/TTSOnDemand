/**
 * Created by alan on 09.08.16.
 */
//const newsUrl = "http://www.mdr.de/nachrichten/politik/ausland/putin-erdogan-treffen-petersburg-100.html";
//
//$( "#runTTS" ).click(generateTTS());
//
//
//function generateTTS() {
//    //$( "#result" ).load( newsUrl + " box" );
//}

const
    util = require("util"),
    http = require("http"),
    fs = require('fs'),
    cheerio = require('cheerio'),
    path = require("path"),
    rimraf = require('rimraf'),
    AdmZip = require('adm-zip'),
    exec = require('child_process').exec;

const TMP = 'tmp/';

const NORMALIZED_PAGE = 'normalized_page.html';
const DAISY3 = 'daisy3.xml';
const EPUB3 = 'dtbook-to-epub3.zip';

const PATH_DP1 = '/home/alan/pipeline-20111215/';
const XHTML2DTBOOK = 'scripts/create_distribute/dtbook/Xhtml2Dtbook.taskScript'
const DP1_CLI = 'pipeline.sh'; // Daisy Pipeline 1
const PATH_DP2_CLI = '/home/alan/pipeline2-cli/';
const DP2_CLI = 'dp2';

const showStdOutput = false;

var options = {
    host: "192.168.1.135",
    port: 8080,
    //path: "http://www.mdr.de/nachrichten/politik/ausland/grossdemo-istanbul-erdogan-102.html"//,
    path: 'http://www.mdr.de/nachrichten/politik/inland/razzia-nrw-100.html'
};


prepareTMPFolder();
getPage(options, buildTTS);


function buildTTS(page) {

    //console.log(page);
    var $ = cheerio.load(page);
    $ = normalize($)
    saveNormalizedPage($);
    //console.log($.html());
    htmlToDaisy3(function () {
        console.log("Xhtml to daisy ready!\n\n");

        dtbookToEpub3(function () {
            
            console.log("Dtbook to epub3 ready!");
            
            extractResult();
        })
    });
}


function getPage(options, callback) {

    const req = http.request(options, function (res) {

        res.setEncoding('utf8');

        var output = '';
        res.on("data", function (chunk) {
            output += chunk;
        });

        res.on('end', function () {
            return callback(output);
        });
    });

    req.on('error', function (err) {
        process.exit(1);
    });

    req.end();
}

function saveNormalizedPage(data) {
//<meta http-equiv="content-type" content="text/html; charset=utf-8"></meta>
    const $ = cheerio.load('<!DOCTYPE html SYSTEM "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><title></title></head><body></body></html>');
    $('body').append(data.html());

    fs.writeFileSync(TMP + NORMALIZED_PAGE, $.html());
    console.log("Write normalized page! \n\n ");
//, function (err) {
//        if (err) {
//            console.log("Error: " + err);
//        } else {
//            console.log("Success!");
//        }
//    });
}


function normalize($) {

    $ = cheerio.load($('.sectionWrapperMain', '#content').html());
    $('.conComments').remove();
    $('.conRelatedLinks').remove();
    $('.conTimestamp').remove();
    $('.cssBoxTeaserStandard').remove();
    $('img').remove();
    $('a').remove();
    //$('br').remove();
    $('noscript').remove();
    //$('span').remove();

    $('br').each(function () {
        $(this).replaceWith(' ');
    });

    $('div > span').each(function () {
        var p = $('<p>' + $(this).html() + '</p>');
        $(this).replaceWith(p);
    });

    // unwrap div elements
    $('div').each(function () {
        // $(this).replaceWith($(this).html());
        $('div').each(function () {
            var $this = $(this);
            $(this).after($this.contents()).remove();
        });
    });

    return $;
}


function htmlToDaisy3(callback) {

    const input = ' --inputFile=' + path.resolve(__dirname) + '/../' + TMP + NORMALIZED_PAGE;
    const output = ' --outputFile=' + path.resolve(__dirname) + '/../' + TMP + DAISY3;

    const cmd = 'cd ' + PATH_DP1 + ' && sh ' + DP1_CLI + ' ' + XHTML2DTBOOK + input + output;
    console.log(cmd);

    execCmd(cmd, callback);

}

function dtbookToEpub3(callback) {

    const input = ' --i-source ' + path.resolve(__dirname) + '/../' + TMP + DAISY3;
    const output = ' -o ' + path.resolve(__dirname) + '/../' + TMP + EPUB3;

    const cmd = 'cd ' + PATH_DP2_CLI + ' && ruby ' + DP2_CLI + ' ' + 'dtbook-to-epub3 --x-audio true' + input + output;
    console.log(cmd);

    execCmd(cmd, callback);
}


function execCmd(cmd, callback) {

    exec(cmd, function (error, stdout, stderr) {

        if (error) {
            console.log(error);
            process.exit(1);
        }

        if (stderr) {
            console.log(stderr);
            //process.exit(1);
        }

        if (stdout && showStdOutput) {
            console.log(stdout);
            //process.exit(1);
        }

        return callback();
    });
}

function prepareTMPFolder() {
    rimraf.sync(TMP);
    fs.mkdirSync(TMP);
}

function extractResult() {
    
    const resultAsZip = path.resolve(__dirname) + '/../' + TMP + EPUB3;
    var zip = new AdmZip(resultAsZip);
    zip.extractAllTo(path.resolve(__dirname) + '/../' + TMP);
}