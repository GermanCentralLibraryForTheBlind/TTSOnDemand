const $player = $('#player');
const $expandAudioBtn = $("#btn-expand-audio");
const $collapseAudioBtn = $("#btn-collapse-audio");
const $buttons = $("#btn-expand-audio, #btn-collapse-audio");


$collapseAudioBtn.hide();


function toggleAudioExpand(expand) {
    if (expand)
        $player.addClass('expanded-audio');
    else
        $player.removeClass('expanded-audio');
}

// Keyboard.on(Keyboard.MediaOverlaysAdvancedPanelShowHide, 'reader', function(){
//     var toFocus = undefined;
//     if ($player.hasClass('expanded-audio'))
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

$expandAudioBtn.on("click", function () {
    var wasFocused = document.activeElement === $expandAudioBtn[0];
    toggleAudioExpand(true);
    $buttons.toggle();
    if (wasFocused)
        setTimeout(function () {
            $collapseAudioBtn[0].focus();
        }, 50);
});

$collapseAudioBtn.on("click", function () {
    var wasFocused = document.activeElement === $collapseAudioBtn[0];
    toggleAudioExpand(false);
    $buttons.toggle();
    if (wasFocused)
        setTimeout(function () {
            $expandAudioBtn[0].focus();
        }, 50);
});