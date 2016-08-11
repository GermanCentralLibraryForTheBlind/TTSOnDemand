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
        mathJaxUrl: "/MathJax.js"
    };


    $( "#read" ).click(function() {

        readium = new Readium(readiumOptions, readerOptions);

        var openPageRequest = undefined;

        var ebookURL = 'tmp/epub';
        readium.reader.updateSettings({"fontSize":150, "scroll":true});
        readium.openPackageDocument(ebookURL, null, openPageRequest);

    });

    // why this event will be not raised?
    readium.reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, function ($iframe, spineItem) {
        //readium.reader.openPageRight();
        readium.reader.escapeMediaOverlay()
    });
});

