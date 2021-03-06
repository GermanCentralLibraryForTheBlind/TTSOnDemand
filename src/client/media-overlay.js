const
    Backbone = require('backbone'),
    $ = require('jquery'),
    AudioClipPlayer = require('./audio-clip-player.js'),
    SmilModel = require('./model/smil-model.js');

Backbone.$ = $;

// TODO: event get current playing progress timer maybe raise event every second  

// loads and plays a single SMIL document
var MediaOverlay = Backbone.Model.extend({
    audioplayer: null,
    smilModel: null,
    
    highlighting: null,

    // observable properties
    defaults: {
        is_ready: false,
        is_document_done: false,
        is_playing: false,
        is_stop: false,
        should_highlight: true,
        current_text_document_url: null,
        current_text_element_id: null,
        can_escape: false,
    },


    initialize: function () {
        var self = this;
        
        // default highlighting colors
        this.highlighting = {
            color: "black", 
            backgroundColor: "#ffcb59"
        };
        this.audioplayer = new AudioClipPlayer();
        this.audioplayer.setConsoleTrace(true);

        // always know whether we're playing or paused
        this.audioplayer.setNotifyOnPause(function () {
            self.set({is_playing: self.audioplayer.isPlaying()});
        });
        this.audioplayer.setNotifyOnPlay(function () {
            self.set({is_playing: self.audioplayer.isPlaying()});
        });
    },
    setSmilUrl: function (smilUrl) {
        this.url = smilUrl;
    },
    fetch: function (options) {
        this.set({is_ready: false});
        options || (options = {});
        options.dataType = "xml";
        Backbone.Model.prototype.fetch.call(this, options);
    },
    // backbone fetch() callback
    parse: function (xml) {
        var self = this;
        this.smilModel = new SmilModel();
        this.smilModel.setUrl(this.url);
        this.smilModel.setNotifySmilDone(function () {
            if (self.get("is_playing")) {
                self.audioplayer.pause();
            }
            self.set({is_document_done: true});
        });

        this.smilModel.setNotifyCanEscape(function (canEscape) {
            self.set({can_escape: canEscape});
        });

        // very important piece of code: attach render functions to the model
        // at runtime, 'this' is the node in question
        this.smilModel.addRenderers({
            "audio": function () {
                // have the audio player inform the node directly when it's done playing
                var thisNode = this;
                self.audioplayer.setNotifyClipDone(function () {
                    thisNode.notifyChildDone();
                });
                var isJumpTarget = false;
                if (this.hasOwnProperty("isJumpTarget")) {
                    isJumpTarget = this.isJumpTarget;
                    // reset the node's property
                    this.isJumpTarget = false;
                }

                // play the node
                self.audioplayer.play($(this).attr("src"), parseFloat($(this).attr("clipBegin")), parseFloat($(this).attr("clipEnd")), isJumpTarget);
            },
            "text": function () {
                var src = $(this).attr("src");
                // broadcast the text properties so that any listeners can do the right thing wrt loading/highlighting text
                self.set({
                    current_text_document_url: stripFragment(src),
                    current_text_element_id: getFragment(src)
                });

                function getFragment(url) {
                    if (url.indexOf("#") !== -1 && url.indexOf("#") < url.length - 1) {
                        return url.substr(url.indexOf("#") + 1);
                    }
                    return "";
                }

                function stripFragment(url) {
                    if (url.indexOf("#") === -1)
                        return url;
                    else
                        return url.substr(0, url.indexOf("#"));
                }
            }
        });

        // start the playback tree at <body>
        var smiltree = $(xml).find("body")[0];
        this.smilModel.build(smiltree);
        this.set({is_ready: true});
    },
    // start playback
    // node is a SMIL node that indicates the starting point
    // if node is null, playback starts at the beginning
    startPlayback: function (node) {
        this.set({is_document_done: false});
        //TODO: proper function for this model state validation 
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.smilModel.render(node);
    },
    startPlaybackAt: function (percent) {
        this.set({is_document_done: false});
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.smilModel.renderAt(percent);
    },
    pause: function () {
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.audioplayer.pause();
    },
    resume: function () {
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.audioplayer.resume();
    },
    // escape: function () {
    //     if (this.get("is_ready") === false || this.smilModel === null) {
    //         return;
    //     }
    //     this.smilModel.escape();
    // },
    findNodeByTextSrc: function (src) {
        if (this.get("is_ready") === false || this.smilModel === null) {
            return null;
        }
        var elm = this.smilModel.findNode("text", "src", src);
        if (elm === null) {
            elm = this.smilModel.findNode("seq", "epub:textref", src);
        }
        return elm;
    },
    findNodeById: function (id) {
        if (this.get("is_ready") === false || this.smilModel === null)
            return null;
        var elm = this.smilModel.findNode("", "id", id);
        return elm;
    },
    // volume is a floating-point number between 0 and 1
    setVolume: function (volume) {
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.audioplayer.setVolume(volume);
    },
    setRate: function (rate) {
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.audioplayer.setRate(rate);
    },
    // // add an epub:type value to the list of things that playback must skip
    addSkipType: function (name) {
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.smilModel.addSkipType(name);
    },
    // // remove an epub:type value from the list of things that playback must skip
    // removeSkipType: function (name) {
    //     if (this.get("is_ready") === false || this.smilModel === null)
    //         return;
    //     this.smilModel.removeSkipType(name);
    // },
    //
    // // add an epub:type value to the list of things that users may escape
    addEscapeType: function (name) {
        if (this.get("is_ready") === false || this.smilModel === null)
            return;
        this.smilModel.addEscapeType(name);
    },
    // // remove an epub:type value from the list of things that users may escape
    // removeEscapeType: function (name) {
    //     if (this.get("is_ready") === false || this.smilModel === null)
    //         return;
    //     this.smilModel.removeEscapeType(name);
    // },
    getTotalDuration: function () {

        if (this.get("is_ready") === false || this.smilModel === null)
            return '';
        return this.smilModel.getTotalDuration();
    },
    getHighlightingColors: function () {
        return this.highlighting;
    }
});

module.exports = MediaOverlay;