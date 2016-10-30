//TODO:
// [ ] access control security token
// [ ] session id

const generator = require('./../tts/dzb-tts-on-demand.js'),
    cheerio = require('cheerio'),
    request = require('request'),
    path = require("path"),
    http = require("http"),
    url = require('url'),
    fs = require('fs');

var router = function (app) {

    // Generic error handler used by all endpoints.
    function handleError(res, reason, message, code) {
        console.log("[ERROR] " + reason);
        res.status(code || 500).json({"error": message});
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
            page = inject(page);

            fs.writeFileSync(path.resolve(__dirname) + '/../../public/temp.html', page);

            res.send('ready');
        });
    });

    app.get("/article/refs", function (req, res) {

        getArticleRefs("http://www.mdr.de/sachsen/index.html", function (refsToArticles) {
            res.json(refsToArticles);
        });
    });

    app.get("/all/articles/tts", function (req, res) {

        const config = {content: ['.sectionWrapperMain', '#content']};

        getArticleRefs("http://www.mdr.de/sachsen/index.html", function (refsToArticles) {

            refsToArticles.forEach(function (item) {

                const href = 'http://www.mdr.de' + item.href;
                console.log('[INFO] Try to load: ' + href);

                getPage(href, function (page) {

                    console.log('[INFO] Article from ' + href + ' loaded');
                    const $ = cheerio.load(page);

                    var i = 0;
                    $('h1, h2, h3, h4, h5, p, span', $(config.content[0], config.content[1])).each(function () {
                        $(this).attr('id', 'ID-TTS-' + i);
                        i++;
                    });
                    const content = $(config.content[0], config.content[1]).html();

                    var options = {
                        host: 'localhost',
                        port: '3000',
                        path: '/tts',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/xhtml+xml'
                        }
                    };

                    var req = http.request(options, function (res) {

                        res.on('end', function () {
                            console.log('[INFO] End POST request :' + href);
                        });

                    });

                    req.setTimeout(3000);
                    req.on('error', function (err) {
                        console.log('[ERROR]  ', err);
                    });
                    // post the data
                    req.write(content);
                    req.end();


                });
            });
            res.send('Start caching!');
        });

    });

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
            if (!error && response.statusCode == 200) {
                return callback(body);
            }
        });
    }

    function replacements(data) {

        data = data.replace(/\/resources/g, 'http://www.mdr.de/resources');
        data = data.replace(/\/administratives/g, 'http://www.mdr.de/administratives');
        //data = data.replace(/src="/g, 'src="http://www.mdr.de');
        data = data.replace(/urlScheme':'/g, 'urlScheme\':\'http://www.mdr.de');

        return data;
    }

    function inject(page) {
        const $ = cheerio.load(page);
        $('body').append($('<script src="bundle.js"></script>'));
        return $.html();
    }

    function fullUrl(req) {
        return url.format({
            protocol: req.protocol,
            hostname: req.hostname,
            pathname: req.originalUrl
        });
    }
};

module.exports = router;