const
    Backbone = require('backbone'),
    $ = require('jquery'),
    uuid = require('node-uuid'),
    MediaOverlay = require('./media-overlay-js/media-overlay.js');

Backbone.$ = $;
require('./css/style.css');

const host = 'http://' + window.location.host;

const daisyFile = host + '/static/epub/EPUB/daisy3-2.xhtml';
const smil = host + '/static/epub/EPUB/mo/daisy3-2.smil';
const backend = host + '/tts';

var player;

const config = {
    btnRead: 'btnRead',
    addButtonTo: '.conDetailHeader',
    content: ['.sectionWrapperMain', '#content']
};


$(document).ready(function () {

    const styleTag = $('<style>.highlight { background-color: yellow; } </style>')
    const btnRead = $('<button id="' + config.btnRead + '" type="button">Vorlesen </button>');
    $(config.addButtonTo).append(btnRead);

    $('html > head').append(styleTag);

    $("h1, h2, h3, h4 , h5, p, span").each(function () {
        $(this).attr('id', 'ID' + uuid.v4()); //alternative will be jquery-ui uniqueId()
    });

    $("#" + config.btnRead).click(function () {

        if (player != null && player.isLoaded()) {
            player.playpause();
            return;
        }
        const content = $(config.content[0], config.content[1]).html();
        sendData(content).then(function (result) {

            //console.log(result);
            readContent();

        }).catch(function (err) {
            console.log(err);
        });

    });
    console.log("ready!");
});


function readContent() {

    const tts = $('<div>', {id: 'tts'});

    tts.load(daisyFile, function (response, status, xhr) {

        if (status == "error") {
            var msg = "Sorry but there was an error: ";
            console.log(msg + xhr.status + " " + xhr.statusText);
            return;
        }

        $("h1, h2, h3, h4 , h5, p").each(function () {

            const id = $(this).attr('id');
            $(this).replaceWith(tts.find("#" + id));

        }).promise().done(function () {


            var model = new MediaOverlay({"smil_url": smil});

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

        xhr.open('POST', backend);
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

                //if (!$(elm[0]).visible()) {
                //    elm[0].scrollIntoView();
                //}
                elm.addClass("highlight");
            }

            function getTextElm(elmId) {
                return $("html").contents().find("#" + elmId);
            }
        }
    }

});