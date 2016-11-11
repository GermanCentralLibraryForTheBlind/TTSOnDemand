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
    SiteFilter = require('./../client/site-filter');

var cachingIntervall;

var router = function (app) {

    // Generic error handler used by all endpoints.
    function handleError(res, reason, message, code) {
        console.log("[ERROR] " + reason);
        res.status(code || 500).json({"error": reason});
    }

    //***********************************************************
    // this route will be used for audio generation
    //***********************************************************
    app.post("/tts", function (req, res) {

        var data = '';

        if (req.method === 'POST') {

            console.info('[INFO] POST request  from ' + fullUrl(req));

            req.setEncoding('utf8');

            req.on('data', function (chunk) {
                data += chunk;
            });

            req.on('end', function () {
                //console.info("received data: " +data);
                generator.textToSpeech(data).then(function (result) {
                    //console.log(result);
                    return res.json(result);

                }).catch(function (err) {
                    return handleError(res, err, 'Nothing is alright! Something goes wrong.');
                });
            });
        }
    });

    //**********************************************************************************
    // following routes only for testing
    // should be later disabled
    //**********************************************************************************
    app.get("/injected", function (req, res) {

        const href = req.query.href;

        //console.log(href);

        getPage(href, function (page) {

            page = replacements(page);

            var host = req.get('host');

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

        if (cachingIntervall === undefined)
            cachingIntervall = setInterval(caching, 60000);

        res.send('Caching is activated!');
    });

    app.get("/caching/of", function (req, res) {

        clearInterval(cachingIntervall);

        res.send('Caching is deactivated!');
    });

    function caching() {

        const config = {content: ['.sectionWrapperMain', '#content']};

        getArticleRefs("http://www.mdr.de/sachsen/index.html", function (refsToArticles) {

            console.log('[INFO] Found ' + refsToArticles.length + ' article refs');

            refsToArticles.forEach(function (item) {

                const href = 'http://www.mdr.de' + item.href;
                //console.log('[INFO] Try to load: ' + href);

                getPage(href, function (page) {

                    //console.log('[INFO] Article from ' + href + ' loaded');
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
                    //         console.log('[INFO] End POST request :' + href);
                    //     });
                    //
                    // });
                    //
                    // req.setTimeout(3000);
                    // req.on('error', function (err) {
                    //     console.log('[ERROR]  ', err);
                    // });
                    // // post the data
                    // req.write($normalizedContent.html());
                    // req.end();
                    generator.textToSpeech($normalizedContent.html()).then(function (result) {

                        console.log('[INFO] Result of caching ' + JSON.stringify(result));

                    }).catch(function (err) {
                        // return handleError(res, err, 'Nothing is alright! Something goes wrong.');
                        console.error('[ERROR] caching of job went wrong: ' + err);
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
                    // console.log(index + ": " + data.ID);
                    // console.log("href : " + data.href);
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
        console.log('[INFO] Inject path: ' + scriptPath);
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

module.exports = router;