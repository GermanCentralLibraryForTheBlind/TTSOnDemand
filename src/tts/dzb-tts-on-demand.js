/**
 * Created by lars voigt on 09.08.16.
 */
const
    fs = require('fs'),
    cheerio = require('cheerio'),
    path = require("path"),
    rimraf = require('rimraf'),
    AdmZip = require('adm-zip'),
    os = require('os'),
    crypto = require('crypto'),
    exec = require('child_process').exec,
    InputNormalizers = require('./normalizers');


const TMP = 'tmp/',
    DAISY3 = 'daisy3.xml',
    EPUB3 = 'dtbook-to-epub3.zip',
    VOICE_CONFIG = 'etc/voice.xml',
    NORMALIZED_PAGE = 'normalized_page.html',
    XHTML_2_DTBOOK = 'scripts/create_distribute/dtbook/Xhtml2Dtbook.taskScript',
    DP1_CLI = 'pipeline.sh', // Daisy Pipeline 1
    DP2_CLI = 'dp2';

//const HOST_DP2 = "'http://192.168.0.7'";

var PATH_DP1 = '';
var PATH_DP2_CLI = '';

if (os.platform() == 'linux') {
    PATH_DP1 = '/home/alan/pipeline-20111215/';
    PATH_DP2_CLI = '/home/alan/pipeline2-cli/';
}

if (os.platform() == 'darwin') {
    PATH_DP1 = '/Users/alan/workspace/daisy_tools/pipeline-20111215';
    PATH_DP2_CLI = '/Users/alan/workspace/daisy_tools/pipeline2-cli';
}

const BASE_PATH = path.resolve(__dirname) + '/../../';

const detailedLog = true;
const TTSGenerator = {};


/* todo:
 [X] own module for normalize
 [X] own folder per job with unique id
 [X] caching: synthesize only on the first time
 [ ] start dp2 via client
 [ ] proper logging strategy
 [ ] config file
 [ ] test if the dp2 service is running
 [ ] find a way to get the uncompressed epub content direct!
 [ ] strategy how long job data have in store until it will be deleted
 */

TTSGenerator.textToSpeech = function (page) {

    return new Promise(function (resolve, reject) {

        //return resolve('okay!'); // only testing
        prepareTMPFolder();
        //console.log(page);

        var $ = cheerio.load(page);
        const jobID = getMD5Checksum($);
        const jobPath = generateJobPath(jobID);
        if (fs.existsSync(jobPath))
            resolve('todo: return path to job result');

        createTmpFolderForJob(jobPath);
        $ = normalizePage($, jobPath);
        saveNormalizedPage($, jobPath);
        //console.log($.html());

        htmlToDaisy3(jobPath).then(function (result) {

            if (result != null && result.stderr) {
                console.log(result.stderr);
            }
            if (result != null && result.stdout && detailedLog) {
                console.log(result.stdout);
            }
            //console.log(result);
            console.log("Xhtml to daisy ready!\n\n");
            return dtbookToEpub3(jobPath);

        }).catch(function (err) {
            console.log(err);
            reject(err);
            // process.exit(1);

        }).then(function (result) {

            if (result != null && result.stderr) {
                console.log(result.stderr);
            }
            if (result != null && result.stdout && detailedLog) {
                console.log(result.stdout);
            }
            console.log("Dtbook to epub3 ready!");
            return extractResult(jobPath);

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


function normalizePage($, jobPath) {

    // todo normalizer configurable
    fs.writeFileSync(jobPath + 'before_normalize.html', $.html());
    const $result = InputNormalizers.MdrNormalizer($);
    fs.writeFileSync(jobPath + 'after_normalize.html', $result.html());

    return $result;
}

function saveNormalizedPage($data, jobPath) {

    var skeleton = '<!DOCTYPE html SYSTEM "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
    skeleton += '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de"><head>';
    skeleton += '<title>Test</title></head><body></body></html>';

    const $ = cheerio.load(skeleton);
    $('body').append($data.html());

    fs.writeFileSync(jobPath + NORMALIZED_PAGE, $.html());
    console.log("Write normalized page! \n\n ");
}


function htmlToDaisy3(jobPath) {

    const input = ' --inputFile=' + jobPath + NORMALIZED_PAGE;
    const output = ' --outputFile=' + jobPath + DAISY3;
    const cmd = 'cd ' + PATH_DP1 + ' && sh ' + DP1_CLI + ' ' + XHTML_2_DTBOOK + input + output;

    return execCmd(cmd);

}

function dtbookToEpub3(jobPath) {

    const input = ' --i-source ' + jobPath + DAISY3;
    const output = ' -o ' + jobPath + EPUB3;
    const voiceConfig = ' --x-tts-config ' + BASE_PATH + VOICE_CONFIG;
    const language = ' --x-language de ';
    // const hostDP2 = '--host ' + HOST_DP2;

    var cmd = 'cd ' + PATH_DP2_CLI + ' && ruby ' + DP2_CLI + ' ';
    cmd += 'dtbook-to-epub3 --x-audio true' + voiceConfig;
    cmd += language;
    cmd += ' ' + input + output;

    return execCmd(cmd);
}


function execCmd(cmd) {

    if (detailedLog)
        console.log(cmd);

    return new Promise(function (resolve, reject) {

        exec(cmd, function (error, stdout, stderr) {

            if (error) {
                reject(stdout); // raise exception???
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
   // rimraf.sync(TMP);

    if (!fs.existsSync(BASE_PATH + TMP)){
        fs.mkdirSync(BASE_PATH + TMP);
    }
}

function generateJobPath(jobID){
    return BASE_PATH + TMP + jobID + '/';
}

function createTmpFolderForJob(jobPath) {
    fs.mkdirSync(jobPath);
}



function extractResult(jobPath) {

    return new Promise(function (resolve, reject) {
            // unzip result
            const resultAsZip = jobPath + EPUB3;
            var zip = new AdmZip(resultAsZip);
            zip.extractAllTo(jobPath);

            const epub = jobPath + 'output-dir/daisy3.epub';
            const zipFile = jobPath + 'output-dir/daisy3.zip';

            fs.rename(epub, zipFile, function (err) {

                if (err)
                    reject('Unzip: ' + err);

                // unzip epub
                var zip = new AdmZip(zipFile);
                zip.extractAllTo(jobPath + 'epub/');

                resolve('Result extracted.');
            });

        }
    )
}

function getMD5Checksum($) {

    return crypto.createHash('md5').update($.text()).digest("hex");
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