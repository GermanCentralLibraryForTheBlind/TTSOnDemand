/**
 * Created by lars voigt on 09.08.16.
 */

const
    fs = require('fs'),
    cheerio = require('cheerio'),
    path = require("path"),
    AdmZip = require('adm-zip'),
    os = require('os'),
    crypto = require('crypto'),
    fsExtra = require('fs-extra'),
    sem = require('semaphore')(1),
    lockFile = require('lockfile'),
    waitUntil = require('wait-until'),
    exec = require('child_process').exec;


const TMP = 'tmp/',
    DAISY3 = 'daisy3.xml',
    EPUB3 = 'result/',
    VOICE_CONFIG = 'etc/voice.xml',
    BASE_PATH = path.resolve(__dirname) + '/../../',
    JOB_LOCK = '/job.lock';

var PATH_DP2_CLI = '';
if (os.platform() === 'linux')
    PATH_DP2_CLI = BASE_PATH + 'tools/linux_386/';

if (os.platform() === 'darwin')
    PATH_DP2_CLI = BASE_PATH + 'tools/darwin_amd64/';


const detailedLog = false;
const TTSGenerator = {};


/* todo:
 [X] own module for normalize
 [X] own folder per job with unique id
 [X] caching: synthesize only on the first time
 [X] start dp2 via client
 [X] pm2 production mode
 [ ] proper logging strategy
 [ ] config file
 [ ] test if the dp2 service state is fine and or fix the it to the correct working state
 [ ] find a way to get the uncompressed epub content direct!
 [ ] strategy how long job data have in store until it will be deleted
 */

TTSGenerator.textToSpeech = function (contentFromClient) {

    return new Promise(function (resolve, reject) {

        //console.log(page);
        //return resolve('okay!'); // only testing
        prepareTMPFolder();

        var $ = cheerio.load(contentFromClient);
        //console.log($.html());
        const jobID = getMD5Checksum($);
        const jobPath = generateJobPath(jobID);

        sem.take(function () {
            // Limit simultaneous access of tts generator structure.
            // It is used to prevent a concurrent situation between caching client and user client.

            if (fs.existsSync(jobPath)) {
                sem.leave();

                // A job data will be requested the first time then the tts generator will produce it
                // but the same job will be multiple requested on the same time then it wait until the first
                // job is finished and all job requests can use the result of the first job.
                waitUntil().interval(500).times(600) // try it 500 ms * 600  = 5min
                    .condition(function () {
                        return (lockFile.checkSync(jobPath + JOB_LOCK) ? false : true);
                    })
                    .done(function () {
                        console.log("[INFO] Nothing to do -> Job " + jobID + " is cached.");
                        return resolve({jobID: jobID});
                    });
                return;
            }

            createTmpFolderForJob(jobPath);

            $ = normalizeClientContent($);
            saveAsDTBook($, jobPath);
            // return;
            console.log("[INFO] Write normalized page for job " + jobID + " ready.");
            //console.log($.html());

            dtbookToEpub3(jobPath).then(function (result) {

                if (result !== null && result.stdout && detailedLog) {
                    console.log('[DEBUG] ' + result.stdout);
                }
                console.log("[INFO] DP2 -> Dtbook to epub3 for job " + jobID + " ready!");
                return extractResult(jobPath);

            }).catch(function (err) {
                // extractResult
                saveFailedJobData(jobPath, jobID);
                reject(err);

            }).then(function (result) {

                // console.log(result);
                // if(fs.accessSync(jobPath))
                const audioFile = jobPath + '/epub/EPUB/audio/part0000_00_000.mp3';
                if (!fs.existsSync(audioFile)) {
                    saveFailedJobData(jobPath, jobID);
                    return reject('[ERROR] Job has no audio file!');
                }

                lockFile.unlockSync(jobPath + JOB_LOCK);

                resolve({jobID: jobID});

            });
        }); // promise end
    });
};


function saveFailedJobData(jobPath, jobId) {

    const pathToFailedJob = BASE_PATH + 'error/' + jobId;
    fsExtra.removeSync(pathToFailedJob);
    fsExtra.copy(pathToFailedJob, {clobber: true}, function (err) {

        fsExtra.removeSync(jobPath);
        if (err)
            return console.error('[ERROR] Copy data of failed job: ' + err);
        // console.log("success!")
    });
}

function normalizeClientContent($, jobPath) {

    //  fs.writeFileSync(jobPath + 'before_normalize.html', $.html());
    $("[style]").each(function () {
        $(this).removeAttr('style');
    });
    unwrap($, 'br');
    //  fs.writeFileSync(jobPath + 'after_normalize.html', $result.html());
    return $;
}

function saveAsDTBook($data, jobPath) {

    var skeleton = '<?xml version="1.0" encoding="UTF-8"?>';
    skeleton += '<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-2//EN" "http://www.daisy.org/z3986/2005/dtbook-2005-2.dtd">';
    skeleton += '<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/" version="2005-2" xml:lang="de">';
    skeleton += '<head><meta content="C00000" name="dtb:uid"/><meta name="dc:Title" content="Test"/></head>';
    skeleton += '<book><frontmatter><doctitle>Test</doctitle></frontmatter><bodymatter><level1></level1></bodymatter></book></dtbook>';

    const $ = cheerio.load(skeleton, {xmlMode: true});
    $('level1').append($data.html());

    fs.writeFileSync(jobPath + DAISY3, $.html());
}


function dtbookToEpub3(jobPath) {

    const input = ' --source ' + jobPath + DAISY3;
    const output = ' -o ' + jobPath + EPUB3;
    const voiceConfig = ' --tts-config ' + BASE_PATH + VOICE_CONFIG;
    const language = ' --language de ';
    // const hostDP2 = '--host ' + HOST_DP2;

    var cmd = 'cd ' + PATH_DP2_CLI + ' && ./dp2  --starting true';
    cmd += ' dtbook-to-epub3 --audio true';
    cmd += voiceConfig;
    cmd += language;
    cmd += ' ' + input + output;

    return execCmd(cmd);
}


function execCmd(cmd) {

    if (detailedLog)
        console.log(cmd);

    return new Promise(function (resolve, reject) {

        exec(cmd, function (error, stdout, stderr) {

            //  if (detailedLog)
            //     console.log("[DEBUG] :  " + stdout);

            if (stdout.indexOf('[ERROR]	ERR:') > -1)
                reject('[ERROR] Error exec ' + cmd);
            else if (stdout.indexOf('Error bringing the pipeline2 up') > -1)
                reject('[ERROR] Error exec ' + cmd);
            else {
                resolve({
                    stdout: stdout,
                    stderr: stderr
                });
            }
        });
    });
}

function prepareTMPFolder() {
    // rimraf.sync(TMP);

    if (!fs.existsSync(BASE_PATH + TMP)) {
        fs.mkdirSync(BASE_PATH + TMP);
    }
}

function generateJobPath(jobID) {
    return BASE_PATH + TMP + jobID + '/';
}

function createTmpFolderForJob(jobPath) {

    fsExtra.removeSync(jobPath);
    fs.mkdirSync(jobPath);

    lockFile.lockSync(jobPath + JOB_LOCK);

    sem.leave();
}


function extractResult(jobPath) {

    return new Promise(function (resolve, reject) {
            // unzip result
            const resultAsZip = jobPath + EPUB3 + 'output-dir/';
            const epub = resultAsZip + 'daisy3.epub';
            const zipFile = resultAsZip + 'daisy3.zip';

            fs.rename(epub, zipFile, function (err) {

                if (err)
                    return reject('Unzip: ' + err);

                // unzip epub
                var zip = new AdmZip(zipFile);
                zip.extractAllTo(jobPath + 'epub/');
                fsExtra.removeSync(jobPath + EPUB3);

                resolve('Result extracted.');
            });

        }
    );
}

function getMD5Checksum($) {

    return crypto.createHash('md5').update($.text()).digest("hex");
}

function unwrap($, el) {

    $(el).each(function () {
        var $this = $(this);
        $(this).after($this.contents()).remove();
    });
}

module.exports = TTSGenerator;
