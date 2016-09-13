const tTSGenerator = require('./dzb-tts-on-demand.js');
const cheerio = require('cheerio');
const request = require('request'),
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
// todo session id
            req.on('end', function () {
                //console.info("received data: " +data);
                tTSGenerator.textToSpeech(data).then(function (result) {
                    //console.log(result);
                    return res.send('All is alright!');

                }).catch(function (err) {
                    console.log(err);
                    return res.send('Nothing is alright! Something goes wrong.');
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

            fs.writeFileSync(path.resolve(__dirname) + '/../../tmp/temp.html', page);

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
        $('body').append($('<script src="http://localhost:3000/public/bundle.js"></script>'));
        return $.html();
    }
};

module.exports = router;