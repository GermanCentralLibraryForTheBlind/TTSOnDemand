module.exports = {

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

            $("#timeRangeSlider").removeAttr('disabled');
            var totalDuration = self.model.getTotalDuration();
            const min = Math.floor(totalDuration / 60);
            const seconds = Math.floor(totalDuration % 60);
            totalDuration =  min + ':' + seconds; // exchange to minutes
            
            $("#timeRangeSliderOutput").text(totalDuration);
        });
        this.model.bind('change:can_escape', function () {
            self.render();
        });
        this.render();
    },

    render: function () {

        if (this.model.get("is_playing"))
            $("#play").attr("class", "glyphicon glyphicon-pause aligned");
        else
            $("#play").attr("class", "glyphicon glyphicon-play aligned");

        // if (this.model.get("can_escape"))
        //     $("#escape").removeAttr('disabled');
        // else
        //     $("#escape").attr('disabled', 'disabled');

        return this;
    },
    playpause: function () {
        var self = this;
        // load a file if we haven't already
        if (this.is_loaded === false) {
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

            if (this.model.get("is_stop")) {
                this.model.set("is_stop", false);
                self.model.startPlayback(null);
            }

        }
    },
    playAt: function (percent) {
        this.model.startPlaybackAt(percent);
    },
    stop: function () {

        if (this.model.get("is_playing")) {
            this.model.pause();
            $("*").removeClass("highlight");

            this.model.set("is_stop", true);
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
};