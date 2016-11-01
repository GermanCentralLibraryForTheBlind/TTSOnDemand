/* todo:
 [ ] verify that no content/structure of original page lost during injected smil tagged elements
 [X] get the path to smil and new tagged content  dynamically
 */

const
    Backbone = require('backbone'),
    $ = require('jquery'),
//uuid = require('node-uuid'),
    MediaOverlay = require('./media-overlay-js/media-overlay.js');

Backbone.$ = $;
require('./css/style.css');

const HOST = 'http://' + window.location.host;
const JOB_BASE_PATH = HOST + '/static/';
const TAGGED_CONTENT = '/epub/EPUB/daisy3-2.xhtml';
const SMIL = '/epub/EPUB/mo/daisy3-2.smil';
const BACKEND = HOST + '/tts';

var player;

const config = {
    btnRead: 'btnRead',
    addButtonTo: '.conDetailHeader',
    content: ['.sectionWrapperMain', '#content']
};


$(document).ready(function () {

    const styleTag = $('<style>.highlight { background-color: #ffcb59; } </style>')
    const btnRead = $('<button id="' + config.btnRead + '" type="button">Vorlesen </button>');
    $(config.addButtonTo).append(btnRead);
    $('html > head').append(styleTag);

    $("#" + config.btnRead).click(function (event) {

        if (player && player.isLoaded()) {
            player.playpause();
            return;
        }

        const btn = $(event.currentTarget);
        btn.addClass('sk-rotating-plane');

        const $content = $(config.content[0], config.content[1])
        const $normalizedContent = $('<div>');
        var i = 0;

        const ignore = ['noscript'];

        $content.find("*").each(function () {

            var $this = $(this);

            if($this.attr('id') === config.btnRead) {
                // ignore our read button
                return;
            }

            if (containsTextNode($this)) {
                //console.log($this.prop("tagName") + ' : ' + $this.html());

                //************************** user specific *********************************
                if (ignore[0] === $this.prop("tagName").toLowerCase())
                    return;
                if ($this.hasClass("hidden"))
                    return;
                //**************************************************************************

                var $p = $('<p>');
                var $clonedThis = $this.clone();
                $this.attr('id', 'ID-TTS-' + i);
                $p.attr('id', 'ID-TTS-' + i);
                $p.append($clonedThis.contents());
                $normalizedContent.append($p);
                i++;
            }
        });

        sendData($normalizedContent.html()).then(function (res) {
            btn.removeClass('sk-rotating-plane');
            const result = JSON.parse(res.response);
            //console.log(result);
            readContent(result.jobID);

        }).catch(function (err) {
            btn.removeClass('sk-rotating-plane');
            console.log(err);
        });

    });
    console.log("ready!");
});


function containsTextNode($element) {

    const childNodes = $element[0].childNodes;

    for (var i = 0; i < childNodes.length; i++) {

        if (childNodes[i].nodeType === Node.TEXT_NODE && !(/^\s+$/.test(childNodes[i].nodeValue)))
            return true;
    }
    return false;
}

function readContent(jobID) {

    const tts = $('<div>', {id: 'tts'});

    tts.load(JOB_BASE_PATH + jobID + TAGGED_CONTENT, function (response, status, xhr) {

        if (status == "error") {
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

        xhr.addEventListener('error', function () {
            reject('Oups! Something goes wrong.');
        });

        xhr.open('POST', BACKEND);
        xhr.send(data);
    })
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
            self.render()
        });
        this.model.bind('change:is_ready', function () {
            self.is_loaded = true;
        });
        this.model.bind('change:can_escape', function () {
            self.render()
        });
        this.render();
    },

    render: function () {
        if (this.model.get("is_playing")) {
            $("#" + config.btnRead).text("Pause");
            $("#cb").attr('disabled', 'disabled');
        }
        else {
            $("#" + config.btnRead).text("Vorlesen");
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
        }
        else {
            if (this.model.get("is_playing")) {
                this.model.pause();
            }
            else {
                this.model.resume();
            }
        }
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