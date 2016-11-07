require(['jquery', 'readium_js/Readium'], function ($, Readium) {

    var readium = undefined;

    var readiumOptions =
    {
        jsLibRoot: "../",
        cacheSizeEvictThreshold: undefined,
        useSimpleLoader: false, // false so we can load ZIP'ed EPUBs
        openBookOptions: {}
    };


    var readerOptions =
    {
        needsFixedLayoutScalerWorkAround: false,
        el: "#viewport",
        annotationCSSUrl: "../../css/annotations.css",
        mathJaxUrl: "/MathJax.src"
    };


    $("#btnRead").click(function () {

        readium = new Readium(readiumOptions, readerOptions);

        var openPageRequest = undefined;

        var ebookURL = 'tmp/epub';
        readium.reader.updateSettings({"fontSize": 150/*, "scroll":true*/});
        readium.openPackageDocument(ebookURL, null, openPageRequest);

        readium.reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, function ($iframe, spineItem) {
            //readium.reader.openPageNext();
            readium.reader.playMediaOverlay();
        });

    });

    $("#btnClose").click(function () {

        if (readium && readium.reader) // window.push/popstate
        {
            readium.closePackageDocument();
            try {
                readium.reader.pauseMediaOverlay();
            } catch (err) {
                //ignore error.
                //can occur when ReaderView._mediaOverlayPlayer is null, for example when openBook() fails
            }
        }

        $("#viewport").empty();
    });
});

