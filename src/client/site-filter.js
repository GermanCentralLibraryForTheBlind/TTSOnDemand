// TODO docu jquery/ Cheerio
const Filter = {};

Filter.skip = function ($content) {

    const $normalizedContent = Filter.$('<div>');
    var i = 0;

    const escape = ['noscript'];

    $content.find("*").each(function () {

        var $this = Filter.$(this);

        if ($this.attr('id') === 'btnRead') { // TODO: get id dynamic
            // escape our read button
            return;
        }

        if (containsTextNode($this)) {
            //console.log($this.prop("tagName") + ' : ' + $this.html());
            // todo: ignore if it invisible
            
            //************************** ignore reader view *********************************
            if ($this.parents('#reader').length !== 0)
                return;
            //**************************************************************************

            //************************** user specific *********************************
            if (escape[0] === $this.prop("tagName").toLowerCase())
                return;
            if ($this.hasClass("hidden"))
                return;
            if ($this.parents('.conInline').length !== 0)
                return;
            if ($this.parents('.firstMediaFull').length !== 0)
                return;
            //**************************************************************************

            var $p = Filter.$('<p>');
            var $clonedThis = $this.clone();
            $this.attr('id', 'ID-TTS-' + i);
            $p.attr('id', 'ID-TTS-' + i);
            $p.append($clonedThis.contents());
            //************************** user specific *********************************
            $p.find("*").removeAttr("data-ctrl-link");
            //**************************************************************************
            $normalizedContent.append($p);
            i++;
        }
    });
    return $normalizedContent;
};

function containsTextNode($element) {

    const childNodes = $element[0].childNodes;

    for (var i = 0; i < childNodes.length; i++) {

        if (childNodes[i].nodeType === 3/*NODE.TEXT_NODE*/ && !(/^\s+$/.test(childNodes[i].nodeValue)))
            return true;
    }
    return false;
}

module.exports = Filter;
