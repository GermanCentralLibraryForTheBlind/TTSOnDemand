//TODO:
// [ ] access control security token
// [ ] session id

const generator = require('./../tts/dzb-tts-on-demand.js'),
    cheerio = require('cheerio'),
    request = require('request'),
    path = require("path"),
    http = require("http"),
    url = require('url'),
    fs = require('fs'),
    moment = require('moment'),
    ip = require('ip'),
    sem = require('semaphore')(1),
    SiteFilter = require('./../client/site-filter');

var cachingIntervall;
var logProcess;

var router = function (app) {

    // Generic error handler used by all endpoints.
    function handleError(res, reason, message, code) {
        console.error("[ERROR] " + reason);
        res.status(code || 500).json({"error": reason});
    }

    //***********************************************************
    // this route will be used for audio generation
    //***********************************************************
    app.post("/tts", function (req, res) {

        var data = '';

        if (req.method === 'POST') {

            var userAgent = '';
            try { userAgent = req.headers['user-agent']; } catch (err) {}

            console.info('[INFO] POST request  from  userAgent: ' + userAgent + ' url: ' + fullUrl(req));

            req.setEncoding('utf8');

            req.on('data', function (chunk) {
                data += chunk;
            });

            req.on('end', function () {
                //console.info("received data: " +data);
                generator.textToSpeech(data).then(function (result) {
                    //debugPrint(result);
                    return res.json(result);

                }).catch(function (err) {
                    return handleError(res, err, 'Nothing is alright! Something goes wrong.');
                });
            });
        }
    });

    app.get("/logs", function (req, res) {

        debugPrint('[INFO] Request logs.');

        try {

            if (!logProcess)
                logProcess = require('child_process', {
                    shell: true,
                    stdio: 'inherit'
                }).exec('npm run logs | ./node_modules/.bin/ansi-to-html -x');

            res.setHeader('content-type', 'text/html');
            res.write("<style type=\"text/\css\">body,span {background-color: #424242; display:block;}<\/style>");
            // pipe both stdout and stderr to response object
            logProcess.stdout.pipe(res, {end: false});
            logProcess.stderr.pipe(res, {end: false});
            // on exit close the response
            logProcess.on('exit', function (exitCode) {
                // log exitCode@
                debugPrint('logProcess process exit-code:', exitCode);
                // end response
                res.end();
            });

        } catch (err) {
            res.end();
            console.error('[ERROR] ' + err);
        }
    });

    //**********************************************************************************
    // routes below only using for testing
    // TODO: should be disabled in production
    //**********************************************************************************
    app.get("/injected", function (req, res) {

        const href = req.query.href;

        //debugPrint(href);

        getPage(href, function (page) {

            page = replacements(page);

            var host = ip.address() + ':3000';

            if (process.env.NODE_ENV === 'production')
                host = 'tts.dzb.de:3000';

            const base = req.protocol + '://' + host;
            page = inject(page, base);

            fs.writeFileSync(path.resolve(__dirname) + '/../../public/temp.html', page);

            res.send('ready');
        });
    });

    app.get("/article/refs", function (req, res) {

        getArticleRefs("http://www.mdr.de/sachsen/index.html", function (refsToArticles) {
            res.json(refsToArticles);
        });
    });

    app.get("/caching/on", function (req, res) {

        console.log('[INFO] caching on');
        caching();
        if (cachingIntervall === undefined)
            cachingIntervall = setInterval(caching, 600000); // 10min

        res.send('Caching is activated!');
    });

    app.get("/caching/of", function (req, res) {

        clearInterval(cachingIntervall);

        res.send('Caching is deactivated!');
    });

    function caching() {

        const start = moment(new Date());
        
            debugPrint('\n\n[INFO] ********************************************');
            debugPrint('[INFO] Start caching at: ' + start.format());
            debugPrint('[INFO] ********************************************\n\n');
        
        const config = {content: ['.sectionWrapperMain', '#content']};

        getArticleRefs("http://www.mdr.de/sachsen/index.html", function (refsToArticles) {

            debugPrint('[INFO] Found ' + refsToArticles.length + ' articles refs\n');

            refsToArticles.forEach(function (item, i) {

                const href = 'http://www.mdr.de' + item.href;
                //debugPrint('[INFO] Try to load: ' + href);

                getPage(href, function (page) {

                    //debugPrint('[INFO] Article from ' + href + ' loaded');
                    const $ = cheerio.load(page);
                    const $content = $(config.content[0], config.content[1]);
                    SiteFilter.$ = cheerio;

                    const $normalizedContent = SiteFilter.skip($content);

                    // var options = {
                    //     host: 'localhost',
                    //     port: '3000',
                    //     path: '/tts',
                    //     method: 'POST',
                    //     headers: {
                    //         'Content-Type': 'application/xhtml+xml'
                    //     }
                    // };
                    //
                    // var req = http.request(options, function (res) {
                    //
                    //     res.on('end', function () {
                    //         debugPrint('[INFO] End POST request :' + href);
                    //     });
                    //
                    // });
                    //
                    // req.setTimeout(3000);
                    // req.on('error', function (err) {
                    //     debugPrint('[ERROR]  ', err);
                    // });
                    // // post the data
                    // req.write($normalizedContent.html());
                    // req.end();
                    sem.take(function () {
                        generator.textToSpeech($normalizedContent.html()).then(function (result) {

                            debugPrint('\n\n[INFO] Result of caching ' + JSON.stringify(result));
                            const end = moment(new Date());
                            const diff = moment.duration(end.diff(start));
                            const duration = moment.utc(diff.asMilliseconds()).format("HH:mm:ss.SSS");
                            debugPrint('[INFO] End of Job: ' + end.format());
                            debugPrint('[INFO] Duration since start caching: ' + duration + '\n\n');
                            sem.leave();

                        }).catch(function (err) {
                            // return handleError(res, err, 'Nothing is alright! Something goes wrong.');
                            console.error('[ERROR] caching of job went wrong: ' + err);
                            sem.leave();
                        });
                    });
                });
            });
        });
    }

    function getArticleRefs(mainPage, callback) {

        getPage(mainPage, function (page) {

            const $ = cheerio.load(page);
            var refsToArticles = [];

            $('.cssArticle').each(function (index) {

                const dataId = $(this).attr('data-id');

                if (dataId) {
                    const href = $(this).find('a').attr('href');
                    var data = {};
                    data.ID = dataId;
                    data.href = href;
                    // debugPrint(index + ": " + data.ID);
                    // debugPrint("href : " + data.href);
                    refsToArticles.push(data);
                }
            });

            callback(refsToArticles);
        });
    }

    function getPage(href, callback) {

        request(href, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                return callback(body);
            }
            else
                console.error('[ERROR] ' + error); // TODO: MAil ???
        });
    }

    function replacements(data) {

        data = data.replace(/\/resources/g, 'http://www.mdr.de/resources');
        data = data.replace(/\/administratives/g, 'http://www.mdr.de/administratives');
        //data = data.replace(/src="/g, 'src="http://www.mdr.de');
        data = data.replace(/urlScheme':'/g, 'urlScheme\':\'http://www.mdr.de');

        return data;
    }

    function inject(page, host) {
        const $ = cheerio.load(page);
        const scriptPath = host + '/public/bundle.js';
        debugPrint('[INFO] Inject path: ' + scriptPath);
        $('body').append($('<script src=\"' + scriptPath + '\"><\/script>'));
        return $.html();
    }

    function fullUrl(req) {
        return url.format({
            protocol: req.protocol,
            host: req.headers.host,
            pathname: req.originalUrl
        });
    }
};

function debugPrint(msg) {
    if(process.env.MODE === 'DEBUG') {
        debugPrint(msg);
    }
}

module.exports = router;