//TODO:
// [ ] access control security token
// [ ] session id

const generator = require('./../tts/dzb-tts-on-demand.js'),
    cheerio = require('cheerio'),
    request = require('request'),
    path = require("path"),
    fs = require('fs');

var router = function (app) {

    // Generic error handler used by all endpoints.
    function handleError(res, reason, message, code) {
        console.log("ERROR: " + reason);
        res.status(code || 500).json({"error": message});
    }

    app.post("/tts", function (req, res) {

        var data = '';

        if (req.method === 'POST') {
            console.info('post');
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

    app.get("/injected", function (req, res) {

        const href = req.query.href;
        console.log(href);
        getPage(href, function (page) {

            page = replacements(page);
            page = inject(page);

            fs.writeFileSync(path.resolve(__dirname) + '/../../public/temp.html', page);

            res.send('ready');
        })


    });


    function getPage(href, callback) {

        request(href, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                return callback(body);
            }
        })
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
};

module.exports = router;