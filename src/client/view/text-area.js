module.exports = {

    lastId: null,

    initialize: function () {
        var self = this;
        this.model.bind('change:current_text_element_id', function () {
            self.highlight(true);
        });
    },


    // highlight the new ID and unhighlight the old one
    // annoyingly, using removeClass to unhighlight wasn't working in iframes
    // so rather than leave everything highlighted, we'll just make sure it's in view
    highlight: function (scrollOn) {
        var id = this.model.get("current_text_element_id");

        if (this.model.get("should_highlight")) {

            if (this.lastId != null) {
                // undo the background color change
                var lastelm = getTextElm(this.lastId);
                //console.log("Before remove class");
                //console.log(lastelm);
                lastelm.removeClass("highlight");
                //console.log("After remove class");
                //console.log(lastelm);
            }

            var elm = getTextElm(id);

            if (elm.length > 0) {
                this.lastId = id;

                if (scrollOn && !isOnScreen($("#" + id))) {

                    const offset = $("#" + id).offset();
                    $(document).scrollTop(offset.top - 60);
                }

                elm.addClass("highlight");
            }
        }
        function getTextElm(elmId) {
            return $("html").contents().find("#" + elmId);
        }

        function isOnScreen ($el) {

            var win = $(window);

            var viewport = {
                top : win.scrollTop(),
                left : win.scrollLeft()
            };
            viewport.right = viewport.left + win.width();
            viewport.bottom = viewport.top + win.height();

            var bounds = $el.offset();
            bounds.right = bounds.left + $el.outerWidth();
            bounds.bottom = bounds.top + $el.outerHeight();
            // console.log(viewport);
            // console.log(bounds);

            return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

        }
    }
};