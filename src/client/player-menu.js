const $reader = $('#readerCSS');
const $btnCollapseExpandPlayerMenu = $("#btnCollapseExpandPlayerMenu");


function toggleAudioExpand(expand) {
    if (expand)
        $reader.addClass('expanded-audio');
    else
        $reader.removeClass('expanded-audio');
}

// Keyboard.on(Keyboard.MediaOverlaysAdvancedPanelShowHide, 'reader', function(){
//     var toFocus = undefined;
//     if ($reader.hasClass('expanded-audio'))
//     {
//         toggleAudioExpand(false);
//         toFocus = $expandAudioBtn[0];
//     }
//     else
//     {
//         toggleAudioExpand(true);
//         toFocus = $collapseAudioBtn[0];
//     }
//
//     $(document.body).removeClass('hide-ui');
//     setTimeout(function(){ toFocus.focus(); }, 50);
// });

$btnCollapseExpandPlayerMenu.on("click", function () {
    // var wasFocused = document.activeElement === $expandAudioBtn[0];
    if($reader.hasClass('expanded-audio'))
        toggleAudioExpand(false);
    else
        toggleAudioExpand(true);

    $('#btnCollapseExpandPlayerMenu span').toggleClass('glyphicon-save glyphicon-open');
});

