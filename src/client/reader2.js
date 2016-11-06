/* todo:
 [ ] verify that no content/structure of original page lost during injected smil tagged elements
 [X] get the path to smil and new tagged content  dynamically
 */

const
    $ = require('jquery'),
    Backbone = require('backbone'),
    SiteFilter = require('./site-filter'),
    MediaOverlay = require('./media-overlay-js/media-overlay.js'),
    fs = require('fs');

Backbone.$ = $;
SiteFilter.$ = $;
require('./css/style.css');

const HOST_TTS_SERVICE = getPathOfTTSService();
const JOB_BASE_PATH = HOST_TTS_SERVICE + '/static/';
const TAGGED_CONTENT = '/epub/EPUB/daisy3-2.xhtml';
const SMIL = '/epub/EPUB/mo/daisy3-2.smil';
const BACKEND = HOST_TTS_SERVICE + '/tts';

fixBootstrapFontPath();
const playerView = fs.readFileSync(__dirname + '/templates/player-view.html', 'utf8');
var player;

const config = {
    btnRead: 'btnRead',
    addButtonTo: '.conDetailHeader',
    content: ['.sectionWrapperMain', '#content']
};


$(document).ready(function () {

    $(config.addButtonTo).append($(playerView));

    $("#" + config.btnRead).click(function (event) {

        if (player && player.isLoaded()) {
            player.playpause();
            return;
        }

        const btn = $(event.currentTarget);
        btn.addClass('sk-rotating-plane');

        const $content = $(config.content[0], config.content[1])
        const $normalizedContent = SiteFilter.skip($content);

        sendData($normalizedContent.html()).then(function (res) {
            btn.removeClass('sk-rotating-plane');
            const result = JSON.parse(res.response);
            //console.log(result);
            showPlayerMenu();
            readContent(result.jobID);

        }).catch(function (err) {
            btn.removeClass('sk-rotating-plane');
            console.error(err);
        });

    });
    console.log("ready!");
});


function  fixBootstrapFontPath() {

    const p = HOST_TTS_SERVICE + '/public/';
    var style = '@font-face { font-family: \'Glyphicons Halflings\'; ';
    style += 'src: url(\''+p+'fonts/glyphicons-halflings-regular.eot\');';
    style += 'src: url(\''+p+'fonts/glyphicons-halflings-regular.eot?#iefix\') format(\'embedded-opentype\'),';
    style += 'url(\''+p+'fonts/glyphicons-halflings-regular.woff2\') format(\'woff2\'),';
    style += 'url(\''+p+'fonts/glyphicons-halflings-regular.woff\') format(\'woff\'), ';
    style += 'url(\''+p+'fonts/glyphicons-halflings-regular.ttf\') format(\'truetype\'),';
    style += 'url(\''+p+'fonts/glyphicons-halflings-regular.svg#glyphicons_halflingsregular\') format(\'svg\');}';

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

            new TextArea({model: model, el: $content});
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

const Player = Backbone.View.extend({

    is_loaded: false,

    events: {
        'click #playpause': 'playpause',
        'change #volume': 'setvolume',
        'click #escape': 'escape'
    },

    initialize: function () {
        var self = this;
        this.model.bind('change:is_playing', function () {
            self.render();
        });
        this.model.bind('change:is_ready', function () {
            self.is_loaded = true;
        });
        this.model.bind('change:can_escape', function () {
            self.render();
        });
        this.render();
    },

    render: function () {
        if (this.model.get("is_playing")) {
            $("#play").attr("class", "glyphicon glyphicon-pause aligned");
            $("#cb").attr('disabled', 'disabled');
        }
        else {
            $("#play").attr("class", "glyphicon glyphicon-play aligned");
            $("#cb").removeAttr('disabled');
        }
        if (this.model.get("can_escape")) {
            $("#escape").removeAttr('disabled');
        }
        else {
            $("#escape").attr('disabled', 'disabled');
        }

        return this;
    },
    playpause: function () {
        var self = this;
        // load a file if we haven't already
        if (this.is_loaded == false) {
            this.model.bind("change:is_ready", onready);
            function onready() {
                self.model.unbind("change:is_ready", onready);
                self.model.startPlayback(null);
            }

            this.model.fetch();

        } else {
            if (this.model.get("is_playing"))
                this.model.pause();
            else
                this.model.resume();

        }
    },
    stop: function () {
        if (this.model.get("is_playing")) {
            this.model.pause();
            $("*").removeClass("highlight");

            this.model.set("is_stop", true);
        }
        //TODO:
    },
    setvolume: function () {
        this.model.setVolume($("#volume")[0].value / 100);
    },
    escape: function () {
        this.model.escape();
    },
    isLoaded: function () {
        return this.is_loaded;
    }
});

const TextArea = Backbone.View.extend({
    lastId: null,

    initialize: function () {
        var self = this;
        this.model.bind('change:current_text_element_id', function () {
            self.highlight()
        });
    },


    // highlight the new ID and unhighlight the old one
    // annoyingly, using removeClass to unhighlight wasn't working in iframes
    // so rather than leave everything highlighted, we'll just make sure it's in view
    highlight: function () {
        var id = this.model.get("current_text_element_id");

        if (this.model.get("should_highlight")) {

            if (this.lastId != null) {
                // undo the background color change
                var lastelm = getTextElm(this.lastId);
                console.log("Before remove class");
                console.log(lastelm);

                lastelm.removeClass("highlight");

                console.log("After remove class");
                console.log(lastelm);

            }

            var elm = getTextElm(id);

            if (elm.length > 0) {
                this.lastId = id;

                if ($("#" + id).is(":visible") != true) {
                    elm[0].scrollIntoView();
                }
                elm.addClass("highlight");
            }

            function getTextElm(elmId) {
                return $("html").contents().find("#" + elmId);
            }
        }
    }

});