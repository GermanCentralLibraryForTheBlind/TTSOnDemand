require(["readium_shared_js/globalsSetup", "readium_shared_js/globals"], function (GlobalsSetup, Globals) {


    // TODO: unfortunately this is not a reliable method to discover AMD module availability with RequireJS, because:
    // 1) Almond does not implement .specified() and/or .defined()
    // 2) Package names always return false?
    // PS: not a blocking issue, just something to consider improving
    if (!require.specified) {
        console.log("!require.specified => using RequireJS-Almond as AMD loader?");
    }
    if (!require.defined) {
        console.log("!require.defined => using RequireJS-Almond as AMD loader?");
    }

    if (require.specified && require.specified('readium_plugin_annotations')) {

        require(['readium_plugin_annotations'], function (annotationPluginConfig) {
            console.log("readium_plugin_annotations:");
            console.debug(annotationPluginConfig);
        });
    }

    if (require.specified && require.specified('readium_plugin_example')) {

        require(['readium_plugin_example'], function (examplePluginConfig) {
            console.log("readium_plugin_example:");
            console.debug(examplePluginConfig);

            examplePluginConfig.borderColor = "blue";
            examplePluginConfig.backgroundColor = "cyan";
        });
    }


    require(['jquery', 'readium_js/Readium'], function ($, Readium) {

        var readium = undefined;
        var altBook = false;

        var readiumOptions =
        {
            jsLibRoot: "../build-output/",
            cacheSizeEvictThreshold: undefined,
            useSimpleLoader: false, // false so we can load ZIP'ed EPUBs
            openBookOptions: {}
        };


        var origin = window.location.origin;
        if (!origin) {
            origin = window.location.protocol + '//' + window.location.host;
        }
        var prefix = (self.location && self.location.pathname && origin) ? (origin + self.location.pathname + "/..") : "";

        var readerOptions =
        {
            needsFixedLayoutScalerWorkAround: false,
            el: "#result",
            annotationCSSUrl: prefix + "/annotations.css",
            mathJaxUrl: "/MathJax.js"
        };

        ReadiumSDK.on(ReadiumSDK.Events.PLUGINS_LOADED, function (reader) {

            Globals.logEvent("PLUGINS_LOADED", "ON", "dev/index.js");

            // legacy (should be undefined / null)
            console.log(reader.plugins.annotations);

            // same as above, new implementation
            console.log(reader.plugins.highlights);

            if (reader.plugins.highlights) {
                reader.plugins.highlights.initialize({annotationCSSUrl: readerOptions.annotationCSSUrl});
                reader.plugins.highlights.on("annotationClicked", function (type, idref, cfi, id) {
                    console.log("ANNOTATION CLICK: " + id);
                    reader.plugins.highlights.removeHighlight(id);
                });
                reader.plugins.highlights.on("textSelectionEvent", function () {
                    console.log("ANNOTATION SELECT");
                    reader.plugins.highlights.addSelectionHighlight(Math.floor((Math.random() * 1000000)), "highlight");
                });
            }

            // external (require()'d via Dependency Injection, see examplePluginConfig function parameter passed above)
            console.log(reader.plugins.example);
            if (reader.plugins.example) {

                reader.plugins.example.on("exampleEvent", function (message) {
                    console.log("Example plugin: \n" + message);

                    var altBook_ = altBook;
                    altBook = !altBook;

                    setTimeout(function () {

                        var openPageRequest = undefined; //{idref: bookmark.idref, elementCfi: bookmark.contentCFI};

                        var ebookURL = altBook_ ? "EPUB/epubReadingSystem" : "EPUB/internal_link.epub";

                        readium.openPackageDocument(
                            ebookURL,
                            function (packageDocument, options) {
                                console.log(options.metadata.title);
                                $('#title').text(options.metadata.title);
                            },
                            openPageRequest
                        );

                    }, 200);
                });
            }
        });

        $(document).ready(function () {

            readium = new Readium(readiumOptions, readerOptions);

            var openPageRequest = undefined; 

            var ebookURL = "/home/alan/workspace/TTSOnDemand/tmp/output-dir/daisy3.epub";

            readium.openPackageDocument(
                ebookURL,
                function (packageDocument, options) {
                    console.log(options.metadata.title);
                    $('#title').text(options.metadata.title);
                },
                openPageRequest
            );
        });


    });
});
