/**
 * Created by lars voigt on 09.08.16.
 */
const
    fs = require('fs'),
    cheerio = require('cheerio'),
    path = require("path"),
    rimraf = require('rimraf'),
    AdmZip = require('adm-zip'),
    exec = require('child_process').exec;


const TMP = 'tmp/';
const VOICE_CONFIG = 'etc/voice.xml';

const NORMALIZED_PAGE = 'normalized_page.html';
const DAISY3 = 'daisy3.xml';
const EPUB3 = 'dtbook-to-epub3.zip';

// linux
//const PATH_DP1 = '/home/alan/pipeline-20111215/';
//const PATH_DP2_CLI = '/home/alan/pipeline2-cli/';

// mac
const PATH_DP1 = '/Users/alan/workspace/daisy_tools/pipeline-20111215';
const PATH_DP2_CLI = '/Users/alan/workspace/daisy_tools/pipeline2-cli';


const XHTML2DTBOOK = 'scripts/create_distribute/dtbook/Xhtml2Dtbook.taskScript'
const DP1_CLI = 'pipeline.sh'; // Daisy Pipeline 1
const DP2_CLI = 'dp2';

const detailedLog = false;

const TTSGenerator = {};
const basePath = path.resolve(__dirname) + '/../../';

/* todo:
 [ ] own module for normalize
 [ ] own folder per request with unique id
 [ ] config file
 [ ] caching: synthesize only on the first time
 [ ] test if the dp2 service is running
 [ ] find a way to get the uncompressed epub content direct!

 */

TTSGenerator.textToSpeech = function (page) {

    return new Promise(function (resolve, reject) {

            prepareTMPFolder();
            //console.log(page);
            var $ = cheerio.load(page);
            $ = normalize($);
            saveNormalizedPage($);
            //console.log($.html());

            htmlToDaisy3().then(function (result) {

                //console.log(result);
                console.log("Xhtml to daisy ready!\n\n");
                return dtbookToEpub3();

            }).catch(function (err) {
                console.log(err);
                reject(err);
                // process.exit(1);

            }).then(function (result) {

                if (result.stderr) {
                    console.log(result.stderr);
                }
                if (result.stdout && detailedLog) {
                    console.log(result.stdout);
                }
                console.log("Dtbook to epub3 ready!");
                return extractResult();

            }).catch(function (err) {
                console.log(err);
                reject(err);
                //process.exit(1);

            }).then(function (result) {

                console.log(result);
                resolve(result);

            }).catch(function (err) {
                console.log(err);
                reject(err);
                //process.exit(1);

            });
        }); // promise end
};


function saveNormalizedPage(data) {
//<meta http-equiv="content-type" content="text/html; charset=utf-8"></meta>
    const $ = cheerio.load('<!DOCTYPE html SYSTEM "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de"><head><title>Test</title></head><body></body></html>');
    $('body').append(data.html());

    fs.writeFileSync(basePath + TMP + NORMALIZED_PAGE, $.html());
    console.log("Write normalized page! \n\n ");
}


function normalize($) {

    // better way to do this will be more generic ->
    // build element tree from  h1-hx, p elements
    fs.writeFileSync(basePath + TMP + 'before_normalize.html', $.html());

    $('.hidden').remove();
    $('.conComments').remove();
    $('.conRelatedLinks').remove();
    $('.conTimestamp').remove();
    $('.cssBoxTeaserStandard').remove();
    $('img').remove()
    $('button').remove();
    $('a').remove();
    $('br').remove();
    //$('a').removeAttr('href');
    $('noscript').remove();
    //$('span').remove();

    $('h3').replaceWith('<h1>' + $('h3').html() +'</h1>');
    //$('.dachzeile').each(function () {
    //    var p = $('<p>' + $(this).html() + '</p>');
    //    $(this).replaceWith(p);
    //});

    $('br').each(function () {
        $(this).replaceWith(' ');
    });

    $('div > span').each(function () {
        var p = $('<p>' + $(this).html() + '</p>');
        $(this).replaceWith(p);
    });

    // unwrap div elements
    $('div').each(function () {
        $('div').each(function () {
            var $this = $(this);
            $(this).after($this.contents()).remove();
        });
    });

    // remove whitespace between tags
    //$.contents().filter(function() {
    //    return this.nodeType = Node.TEXT_NODE && /\S/.test(this.nodeValue) === false;
    //}).remove();

    fs.writeFileSync(basePath + TMP + 'after_normalize.html', $.html());

    return $;
}


function htmlToDaisy3() {

    const input = ' --inputFile=' + basePath + TMP + NORMALIZED_PAGE;
    const output = ' --outputFile=' + basePath + TMP + DAISY3;

    const cmd = 'cd ' + PATH_DP1 + ' && sh ' + DP1_CLI + ' ' + XHTML2DTBOOK + input + output;
    console.log(cmd);

    return execCmd(cmd);

}

function dtbookToEpub3() {

    const input = ' --i-source ' + basePath + TMP + DAISY3;
    const output = ' -o ' + basePath + TMP + EPUB3;
    const voiceConfig = ' --x-tts-config ' + basePath + VOICE_CONFIG;
    const language = ' --x-language de ';

    var cmd = 'cd ' + PATH_DP2_CLI + ' && ruby ' + DP2_CLI + ' ';
    cmd += 'dtbook-to-epub3 --x-audio true' + voiceConfig;
    cmd += language;
    cmd += ' ' + input + output;
    console.log(cmd);

    return execCmd(cmd);
}


function execCmd(cmd) {

    return new Promise(function (resolve, reject) {

        exec(cmd, function (error, stdout, stderr) {

            if (error) {
                reject(error);
            } else {
                resolve({
                    stdout: stdout,
                    stderr: stderr
                });
            }
        })
    })
}

function prepareTMPFolder() {
    rimraf.sync(TMP);
    fs.mkdirSync(TMP);
}

function extractResult() {

    return new Promise(function (resolve, reject) {

            // unzip result
            const resultAsZip = basePath + TMP + EPUB3;
            var zip = new AdmZip(resultAsZip);
            zip.extractAllTo(basePath + TMP);

            const epub = basePath + TMP + 'output-dir/daisy3.epub';
            const zipFile = basePath + TMP + 'output-dir/daisy3.zip';

            fs.rename(epub, zipFile, function (err) {

                if (err)
                    reject('Unzip: ' + err);

                // unzip epub
                var zip = new AdmZip(zipFile);
                zip.extractAllTo(basePath + TMP + 'epub/');

                resolve('Result extracted.');
            });

        }
    )
}


module.exports = TTSGenerator;

//function getPage(options, callback) {
//
//    const req = http.request(options, function (res) {
//
//        res.setEncoding('utf8');
//
//        var output = '';
//        res.on("data", function (chunk) {
//            output += chunk;
//        });
//
//        res.on('end', function () {
//            return callback(output);
//        });
//    });
//
//    req.on('error', function (err) {
//        console.log(err);
//        process.exit(1);
//    });
//
//    req.end();
//}


// return cached
//var userCache = {};
//
//function getUserDetail(username) {
//    // In both cases, cached or not, a promise will be returned
//
//    if (userCache[username]) {
//        // Return a promise without the "new" keyword
//        return Promise.resolve(userCache[username]);
//    }
//
//    // Use the fetch API to get the information
//    // fetch returns a promise
//    return fetch('users/' + username + '.json')
//        .then(function(result) {
//            userCache[username] = result;
//            return result;
//        })
//        .catch(function() {
//            throw new Error('Could not find user: ' + username);
//        });
//}