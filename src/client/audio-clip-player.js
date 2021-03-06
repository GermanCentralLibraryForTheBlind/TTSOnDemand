var AudioClipPlayer = function () {


    const isIOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;
    const isAndroid = navigator.userAgent.toLowerCase().indexOf('android') > -1;
    const readyEvent = isAndroid ? "canplaythrough" : "canplay";

    // clip info
    var src = null;
    var clipBegin = null;
    var clipEnd = null;

    // force the clip to reset its start time
    var forceReset = false;

    // the html audio element created to hold whatever the current file is
    const _audioElement = new Audio();

    // callback function
    var notifyClipDone = null;

    // send debug statements to the console
    var consoleTrace = false;

    // ID of the setInterval timer
    var intervalId = null;

    this.setNotifyClipDone = function (notifyClipDoneFn) {
        notifyClipDone = notifyClipDoneFn;
    };
    this.setConsoleTrace = function (isOn) {
        consoleTrace = isOn;

        if (consoleTrace === true) {
            console.log('DEBUG is on!');

            _audioElement.addEventListener('loadstart', function () {
                debugPrint('1. loadstart');
            }, false);
            _audioElement.addEventListener('durationchange', function () {
                debugPrint('2. durationchange');
            }, false);
            _audioElement.addEventListener('loadedmetadata', function () {
                debugPrint('3. loadedmetadata');
            }, false);
            _audioElement.addEventListener('loadeddata', function () {
                debugPrint('4. loadeddata');
            }, false);
            _audioElement.addEventListener('progress', function () {
                debugPrint('5. progress');
            }, false);
            _audioElement.addEventListener('canplay', function () {
                debugPrint('6. canplay');
            }, false);
            _audioElement.addEventListener('canplaythrough', function () {
                debugPrint("7. canplaythrough");
            }, false);
            _audioElement.addEventListener('play', function () {
                debugPrint('8. play');
            }, false);
            _audioElement.addEventListener('playing', function () {
                debugPrint('9. playing');
            }, false);
            _audioElement.addEventListener('pause', function () {
                debugPrint('10. pause');
            }, false);
            _audioElement.addEventListener('seeking', function () {
                debugPrint('a. seeking');
            }, false);
            _audioElement.addEventListener('seeked', function () {
                debugPrint('b. seeked');
            }, false);
        }
    };

    // clipBeginTime and clipEndTime are in seconds
    // filesrc is an absolute path, local or remote
    this.play = function (filesrc, clipBeginTime, clipEndTime, shouldForceReset) {

        src = filesrc;
        clipBegin = clipBeginTime;
        clipEnd = clipEndTime;
        forceReset = shouldForceReset;

        debugPrint("try to play " + src);
        debugPrint("from " + clipBegin + " to " + clipEnd);

        // make sure we haven't already created an element for this audio file
        if (_audioElement === null || _audioElement.getAttribute("src") !== src)
            loadData();
        else
        // the element is already loaded; just need to continue playing at the right point
            continueRender();
    };


    this.isPlaying = function () {
        if (_audioElement === null) {
            return false;
        }
        return !_audioElement.paused;
    };

    this.resume = function () {
        if (_audioElement !== null) {
            _audioElement.play();
        }
    };

    this.pause = function () {
        if (_audioElement !== null) {
            _audioElement.pause();
        }
    };

    this.setNotifyOnPause = function (notifyOnPause) {
        _audioElement.addEventListener("pause", function () {
            notifyOnPause();
        });
    };

    this.setNotifyOnPlay = function (notifyOnPlay) {
        _audioElement.addEventListener("play", function () {
            notifyOnPlay();
        });
    };

    this.getCurrentTime = function () {
        if (_audioElement !== null) {
            return _audioElement.currentTime;
        }
        return 0;
    };
    this.getCurrentSrc = function () {
        return src;
    };
    
    var self = this;

    var _rate = 1.0;
    this.setRate = function(rate)
    {
        _rate = rate;
        if (_rate < 0.5)
            _rate = 0.5;

        if (_rate > 3.0)
            _rate = 3.0;

        _audioElement.playbackRate = _rate;
    };
    // self.setRate(_rate);
    
    // this.getRate = function()
    // {
    //     return _rate;
    // }
    //

    var _volume = 1.0;
    // volume ranges from 0 to 1.0
    this.setVolume = function(volume)
    {
        _volume = volume;
        if (_volume < 0.0)
        {
            _volume = 0.0;
        }
        if (_volume > 1.0)
        {
            _volume = 1.0;
        }
        _audioElement.volume = _volume;
    };
    
    self.setVolume(_volume);
    
    function loadData() {

        debugPrint('load new audio file');

        // wait for 'canplay' before continuing
        _audioElement.addEventListener(readyEvent, readyToSeek);
        _audioElement.addEventListener("ended", ended);

        _audioElement.src = src;
        _audioElement.load();
    }


    /*
     * Will call this when the browser can start playing the audio
     */
    function readyToSeek() {

        _audioElement.removeEventListener(readyEvent, readyToSeek);

        if (clipEnd > _audioElement.duration) {
            debugPrint("File duration: " + _audioElement.duration + " is shorter" +
                " than specified clipEnd: " + clipEnd + " time");
            clipEnd = _audioElement.duration;
        }

        continueRender();
    }


    function continueRender() {

        debugPrint('Continue in the same audio file');

        // if the current time is already somewhere within the clip that we want to play, then just let it keep playing
        if (forceReset === false && _audioElement.currentTime > clipBegin && _audioElement.currentTime < clipEnd) {

            startClipTimer();
            _audioElement.play();
            self.setRate(_rate);
            debugPrint('Current time is within the clip.');

        } else {

            _audioElement.addEventListener("seeked", seeked);
            _audioElement.currentTime = clipBegin;
            debugPrint("Setting currentTime from " + _audioElement.currentTime + " to clipBegin " + clipBegin);

        }
    }

    function seeked() {

        _audioElement.removeEventListener("seeked", seeked);

        // playToForceAutostart();
        setTimeout(function () {
            startClipTimer();
            _audioElement.play();
            self.setRate(_rate);
        }, isAndroid ? 1000 : 500);
    }

    function startClipTimer() {

        // cancel the old timer, if any
        if (intervalId !== null) {
            clearInterval(intervalId);
        }

        // we're using setInterval instead of monitoring the timeupdate event because timeupdate fires, at best,
        // every 200ms, which messes up playback of short phrases.
        // 11ms seems to be chrome's finest allowed granularity for setInterval (and this is for when the tab is
        // active; otherwise it fires about every second)
        intervalId = setInterval(function () {

            if (_audioElement.currentTime >= clipEnd) {
                clearInterval(intervalId);
                debugPrint("Clip is done!");
                if (notifyClipDone !== null) {
                    notifyClipDone();
                }
            }
        }, 11);
    }

    function ended() {

        debugPrint("Clip ended");
        // cancel the timer, if any
        if (intervalId !== null) {
            clearInterval(intervalId);
        }
        if (notifyClipDone !== null) {
            notifyClipDone();
        }
    }

    function debugPrint(str) {
        if (consoleTrace === true) {
            console.log(str);
        }
    }

    /**************************************************************
     *
     *  IOS/ IPAD Support
     *
     * iOS, mobile Safari, and HTML5 audio limitations
     *
     * Audio streams cannot be loaded unless triggered by a user touch event such as onmousedown,
     * onmouseup, onclick, or ontouchstart.
     *
     * Listing 4. Playing an audio stream on page load in mobile Safari will silently fail.
     *
     * var audio = document.getElementById('audio');
     * audio.play();
     *
     * Information form https://www.ibm.com/developerworks/library/wa-ioshtml5/
     **************************************************************/

    if (isIOS) {
        // workaround to bypass the known limitation

        if ('ontouchstart' in document.documentElement) {
            debugPrint('ontouchstart');
            document.addEventListener("touchstart", touchInit, false);
        }
        document.addEventListener("mousedown", touchInit, false);

    }

    function touchInit() {
        debugPrint('touchInit');

        document.removeEventListener("touchstart", touchInit, false);
        document.removeEventListener("mousedown", touchInit, false);

        _audioElement.setAttribute("src", "touch/init/html5/audio.mp3");
        _audioElement.load();
    }


    /**************************************************************
     *
     *  ANDROID Support
     *
     **************************************************************/


    function playToForceAutostart() {
        debugPrint("playToForceAutostart");
        _audioElement.play();
    }

    function onPlayToForceAutostart() {
        debugPrint("onPlayToForceAutostart");
        _audioElement.removeEventListener('play', onPlayToForceAutostart, false);
        document.removeEventListener("mousedown", playToForceAutostart, false);
        _audioElement.pause();
    }

    if (isAndroid) {
        _audioElement.addEventListener('play', onPlayToForceAutostart, false);
        document.addEventListener("mousedown", playToForceAutostart, false);
    }

};
module.exports = AudioClipPlayer;