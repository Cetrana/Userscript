// ==UserScript==
// @name         nHentai Downloader
// @namespace    http://devs.forumvi.com
// @description  Download manga on nHentai.net
// @version      1.4.0
// @icon         http://i.imgur.com/FAsQ4vZ.png
// @author       Zzbaivong
// @license      MIT
// @match        http://nhentai.net/g/*
// @match        https://nhentai.net/g/*
// @require      https://code.jquery.com/jquery-3.2.1.slim.min.js
// @require      https://greasyfork.org/scripts/19855-jszip/code/jszip.js?version=164038
// @require      https://greasyfork.org/scripts/18532-filesaver/code/FileSaver.js?version=164030
// @noframes
// @connect      self
// @supportURL   https://github.com/baivong/Userscript/issues
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

jQuery(function ($) {
    'use strict';

    /**
     * Output extension
     * @type {String} zip
     *                cbz
     *
     * Tips: Convert .zip to .cbz
     * Windows
     * $ ren *.zip *.cbz
     * Linux
     * $ rename 's/\.zip$/\.cbz/' *.zip
     */
    var outputExt = 'cbz'; // or 'zip'


    function end() {
        $win.off('beforeunload');

        if (debug) console.timeEnd('nHentai');
    }

    function getInfo() {
        var $info = $('#info'),
            $h1 = $info.find('h1'),
            $h2 = $info.find('h2'),
            $tags = $('#tags').clone(),
            info = '';

        $tags.find('.tag-container.hidden').remove();
        $tags.find('.count').remove();
        $tags.find('.tags a').replaceWith(function () {
            return this.textContent.trim() + ', ';
        });
        $tags.find('.tags').replaceWith(function () {
            return this.textContent.trim().slice(0, -1);
        });
        $tags.find('.tag-container').replaceWith(function () {
            return this.textContent.trim().replace(/[\n\s\t]{2,}/, ' ');
        });

        if ($h1.length) info += $h1.text().trim() + '\r\n';
        if ($h2.length) info += $h2.text().trim() + '\r\n';
        if ($tags.length) info += '\r\n' + $tags.text().trim().replace(/[\n\s\t]{2,}/g, '\r\n');

        if (debug) console.log(info);
        return info;
    }

    function genZip() {
        zip.file('info.txt', getInfo());

        zip.generateAsync({
            type: 'blob'
        }).then(function (blob) {
            var zipName = tit.split(' » ')[0]
                .replace(/\s/g, '_') + '.' + comicId + '.' + outputExt;

            if (prevZip) window.URL.revokeObjectURL(prevZip);
            prevZip = blob;

            $download.html('<i class="fa fa-check"></i> Complete')
                .css('backgroundColor', 'green')
                .attr({
                    href: window.URL.createObjectURL(prevZip),
                    download: zipName
                });

            saveAs(blob, zipName);

            doc.title = '[⇓] ' + tit;
            if (debug) console.log('COMPLETE');
            end();
        }, function (reason) {
            $download.html('<i class="fa fa-exclamation"></i> Fail')
                .css('backgroundColor', 'red');

            doc.title = '[x] ' + tit;
            if (debug) console.error(reason, 'ERROR');
            end();
        });
    }

    function dlImg(url, success, error) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            onload: function (response) {
                success(response);
            },
            onerror: function (err) {
                error(err);
            }
        });
    }

    function next() {
        current++;

        $download.html('<i class="fa fa-cog fa-spin"></i> ' + current + '/' + total);

        current < total ? addZip() : genZip();
    }

    function addZip() {
        var url = images[current],
            filename = url.replace(/.*\//g, '');

        dlImg(url, function (response) {
            zip.file(filename, response.response);

            if (debug) console.log(url);
            next();
        }, function (err) {
            zip.file(filename + '_' + comicId + '_error.gif', 'R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=', { base64: true });
            $download.css('backgroundColor', '#FF7F7F');

            if (debug) console.error(err, url);
            next();
        });
    }


    var zip = new JSZip(),
        prevZip = false,
        current = 0,
        total = 0,
        images = [],
        $images = $('#thumbnail-container img'),
        $download = $('#download-torrent, #download'),
        doc = document,
        tit = doc.title,
        $win = $(window),
        comicId = location.pathname.match(/\d+/)[0],
        debug = false;

    if (!$images.length || !$download.length) return;

    window.URL = window.URL || window.webkitURL;

    $download.css('backgroundColor', 'cornflowerblue')
        .one('click', function (e) {
            e.preventDefault();
            if (debug) console.time('nHentai');

            $win.on('beforeunload', function () {
                return 'Progress is running...';
            });

            $download.attr('href', '#download')
                .html('<i class="fa fa-cog fa-spin"></i> Waiting...')
                .css('backgroundColor', 'orange');

            $images.each(function (i, v) {
                var src = $(v).data('src');

                if (/^\/\/t\./i.test(src)) src = location.protocol + src;
                src = src.replace('t.n', 'i.n')
                    .replace(/\/(\d+)t\./, '/$1.');

                images[i] = src;
            });

            total = images.length;
            addZip();
        });

});
