/* todo:
 [ ] if the player invisible make the elements aria-hidden="true"
 [ ] if mobile browser than button xs
 [ ] verify that no content/structure of original page lost during injected smil tagged elements
 [X] get the path to smil and new tagged content  dynamically
 */

const
    $ = require('jquery'),
    Backbone = require('backbone'),
    SiteFilter = require('./site-filter'),
    MediaOverlay = require('./media-overlay.js'),
    PlayerView = require('./view/player'),
    TextAreaView = require('./view/text-area'),
    fs = require('fs');

Backbone.$ = $;
SiteFilter.$ = $;
require('./css/style.css');
require('./css/style.css');

const HOST_TTS_SERVICE = getPathOfTTSService();
const JOB_BASE_PATH = HOST_TTS_SERVICE + '/static/';
const TAGGED_CONTENT = '/epub/EPUB/daisy3-2.xhtml';
const SMIL = '/epub/EPUB/mo/daisy3-2.smil';
const BACKEND = HOST_TTS_SERVICE + '/tts';

fixBootstrapFontPath();
const playerTemplate = fs.readFileSync(__dirname + '/templates/player-view.html', 'utf8');

var player;

const config = {
    btnRead: 'btnRead',
    addButtonTo: '#content .sectionWrapperMain',
    content: ['.sectionWrapperMain', '#content']
};


$(document).ready(function () {

    $(config.addButtonTo).prepend($(playerTemplate));

    $("#" + config.btnRead).click(function (event) {

        toogleProcessSpinner();

        if (player && player.isLoaded()) {

            // start playback  at the beginning
            player.stop();
            player.playpause();
            toogleProcessSpinner();
            return;
        }


        const $content = $(config.content[0], config.content[1])
        const $normalizedContent = SiteFilter.skip($content);

        sendData($normalizedContent.html()).then(function (res) {
            toogleProcessSpinner();
            const result = JSON.parse(res.response);
            //console.log(result);
            showPlayerMenu();
            readContent(result.jobID);

        }).catch(function (err) {
            toogleProcessSpinner();
            console.error(err);
        });

    });
    console.log("ready!");
});


function showPlayerMenu() {

    $('.mnuPlayer').show();
    addListenerToPlayerMnu();
}

function addListenerToPlayerMnu() {

    $("#btnPlay").click(function () {

        if (player && player.isLoaded())
            player.playpause();
    });

    $("#btnStop").click(function () {

        if (player && player.isLoaded())
            player.stop();
    });

}

function toogleProcessSpinner() {

    const spinner = $('.glyphicon-spin');

    spinner.toggleClass('glyphicon-spin-hide');
}

function readContent(jobID) {

    const tts = $('<div>', {id: 'tts'});

    tts.load(JOB_BASE_PATH + jobID + TAGGED_CONTENT, function (response, status, xhr) {

        if (status === "error") {
            var msg = "Sorry but there is a problem: ";
            console.error(msg + xhr.status + " " + xhr.statusText);
            console.error(response);
            return;
        }

        $(config.content[0], config.content[1]).find('*').each(function () {

            const $el = $(this);
            const id = $el.attr('id');

            const ttsCounterpart = tts.find("#" + id);
            if (ttsCounterpart.length > 0) {

                $el.empty();
                $el.append(ttsCounterpart.contents());
            }
            else
                console.log('Element ' + id + ' doesnt exists???');

        }).promise().done(function () {


            var model = new MediaOverlay({"smil_url": JOB_BASE_PATH + jobID + SMIL});

            model.addSkipType("pagebreak");
            model.addSkipType("sidebar");
            model.addEscapeType("table-row");

            const $content = $(config.content[0], config.content[1]);

            if ($content == null)
                throw 'Highlighting area not found??';

            /***************************************************************************
             * backbone views
             ***************************************************************************/
            const TextArea = Backbone.View.extend(TextAreaView);
            new TextArea({model: model, el: $content});

            const Player = Backbone.View.extend(PlayerView);
            player = new Player({model: model, el: $("#controls")});

            player.playpause();

        });
    });
}

function sendData(data) {

    return new Promise(function (resolve, reject) {

        const xhr = new XMLHttpRequest();

        xhr.addEventListener('load', function () {
            resolve(xhr);
        });

        xhr.addEventListener('error', function (err) {
            reject('Oups! AJAX request failed: ' + BACKEND);
        });

        xhr.open('POST', BACKEND);
        xhr.send(data);
    });
}


function getPathOfTTSService() {

    // ie ? document.currentScript
    if (document.currentScript) {
        const thisScriptFullPath = document.currentScript.src;
        console.log('currentScriptFullPath : ' + thisScriptFullPath);
        const url = new URL(thisScriptFullPath);
        return url.protocol + '//' + url.host;
    } else
        throw Exception('Cannot get path to TTS service. Really bad!');
}

function fixBootstrapFontPath() {

    const p = HOST_TTS_SERVICE + '/public/';
    var style = '@font-face { font-family: \'Glyphicons Halflings\'; ';
    style += 'src: url(\'' + p + 'fonts/glyphicons-halflings-regular.eot\');';
    style += 'src: url(\'' + p + 'fonts/glyphicons-halflings-regular.eot?#iefix\') format(\'embedded-opentype\'),';
    style += 'url(\'' + p + 'fonts/glyphicons-halflings-regular.woff2\') format(\'woff2\'),';
    style += 'url(\'' + p + 'fonts/glyphicons-halflings-regular.woff\') format(\'woff\'), ';
    style += 'url(\'' + p + 'fonts/glyphicons-halflings-regular.ttf\') format(\'truetype\'),';
    style += 'url(\'' + p + 'fonts/glyphicons-halflings-regular.svg#glyphicons_halflingsregular\') format(\'svg\');}';

    const styleTag = $('<style type=\"text/css\">' + style + '<\/style>');
    $('head').prepend(styleTag);
    // fallback
    //var cssLink = $("<link>");
    //$("head").append(cssLink); //IE hack: append before setting href
    //
    //cssLink.attr({
    //    rel:  "stylesheet",
    //    type: "text/css",
    //    href: p + 'fonts.css'
    //});
}