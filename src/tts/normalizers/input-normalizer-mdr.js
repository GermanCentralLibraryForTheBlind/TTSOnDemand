/**
 * Created by lars voigt on 20.10.16.
 */
module.exports = function ($) {

        // better way to do this will be more generic ->
        // build element tree from  h1-hx, p elements

        $('.hidden').remove();
        $('.conComments').remove();
        $('.conRelatedLinks').remove();
        $('.conTimestamp').remove();
        $('.cssBoxTeaserStandard').remove();
        $('img').remove()
        $('button').remove();
        $('a').remove();
        $('ul').remove();
        $('hr').remove();

        const $br = $('br');
        $br.remove();
        $br.each(function () {
            $(this).replaceWith(' ');
        });
        //$('a').removeAttr('href');
        $('noscript').remove();
        //$('span').remove();


        // todo refactoring
        //
        // dachzeile
        //
        var newElement = $("<h1/>");
        var id = $('.dachzeile').attr('id');
        newElement.attr('id', id);
        newElement.attr('class', 'dachzeile');
        // Replace the current element with the new one and carry over the contents
        $('.dachzeile').replaceWith(function () {
            return $(newElement).append($(this).contents());
        });

        //
        // headline
        //
        newElement = $("<h2/>");
        id = $('.headline').attr('id');
        newElement.attr('id', id);
        newElement.attr('class', 'headline');
        // Replace the current element with the new one and carry over the contents
        $('.headline').replaceWith(function () {
            return $(newElement).append($(this).contents());
        });

        //
        // replace org  h1 with temp h1 h2
        //
        const $h1 = $('h1');

        $h1.children().each(function (index, element) {
            $(element).insertBefore($(element).parent());
        });
        //
        $h1.remove();


        $('h3').replaceWith('<h3>' + $('h3').html() + '</h3>');


        $('div > span').each(function () {
            var p = $('<p>' + $(this).html() + '</p>');
            $(this).replaceWith(p);
        });

        $('cite > span').each(function () {
            var p = $('<p>' + $(this).html() + '</p>');
            $(this).replaceWith(p);
        });
        // unwrap div elements
        $('div').each(function () {
            unwrap($,'div');
        });

        unwrap($,'blockquote');
        unwrap($,'footer');
        unwrap($,'cite');

        // remove whitespace between tags
        //$.contents().filter(function() {
        //    return this.nodeType = Node.TEXT_NODE && /\S/.test(this.nodeValue) === false;
        //}).remove();

        $('p:empty').remove();



        return $;
    };


    function unwrap($, el) {

        $(el).each(function () {
            var $this = $(this);
            $(this).after($this.contents()).remove();
        });
    }