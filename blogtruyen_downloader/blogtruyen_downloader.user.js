// ==UserScript==
// @id           blogtruyen-downloader@devs.forumvi.com
// @name         blogtruyen downloader
// @namespace    http://devs.forumvi.com
// @description  Download manga on blogtruyen.com
// @version      2.1.0
// @icon         http://i.imgur.com/qx0kpfr.png
// @author       Zzbaivong
// @license      MIT
// @include      http://blogtruyen.com/truyen/*
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @require      https://greasyfork.org/scripts/18532-filesaver/code/FileSaver.js?version=128198
// @require      https://greasyfork.org/scripts/20389-jquery-ajax-blob-arraybuffer/code/jquery-ajax-blob-arraybuffer.js?version=130475
// @resource     jszip https://greasyfork.org/scripts/19855-jszip/code/jszip.js?version=126859
// @resource     worker https://greasyfork.org/scripts/20372-zipped/code/zipped.js?version=130355
// @noframes
// @supportURL   https://github.com/baivong/Userscript/issues
// @run-at       document-idle
// @grant        GM_getResourceText
// ==/UserScript==

jQuery(function ($) {
    'use strict';

    var changeHost = false,
        configs = {
            lang: {
                DOWNLOADALL: 'Tải xuống tất cả',
                DOWNLOAD: 'Tải xuống',
                WAITING: 'Đang tải',
                COMPLETE: 'Tải xong',
                SKIP: 'Không tải',
                ERROR: 'Bị lỗi',
                WARNING: 'Quá trình tải chưa hoàn thành.'
            },
            color: {
                DOWNLOAD: 'green',
                WAITING: 'gray',
                COMPLETE: 'orange',
                SKIP: 'blueviolet',
                ERROR: 'red'
            },
            notify: {
                CONTENT: 'Tải xuống hoàn tất',
                ICON: 'http://i.imgur.com/qx0kpfr.png'
            }
        };

    function deferredAddZip(url, filename, current, total) {
        var deferred = $.Deferred();

        if (url.search(/(googleusercontent|blogspot)\.com/) === -1) url = '//images-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&url=' + url;

        $.ajax({
            url: url,
            dataType: 'blob',
            processData: false
        }).always(function () {
            $button[current].text((counter[current] - 1) + '/' + total);
        }).done(function (result) {
            worker.postMessage({
                run: false,
                index: current,
                name: filename,
                content: result
            });
            ++counter[current];
            deferred.resolve(result);
        }).fail(function (err) {
            console.error(err);
            deferred.reject(err);
        });

        return deferred;
    }

    function nextDownload() {
        ++nextChapter;
        autoDownload();
    }

    function autoDownload() {
        if (disableDownloadAll) return;
        if (nextChapter >= totalChapter) return;

        $downloadAllText.text((nextChapter + 1) + '/' + totalChapter);

        var $next = $downloadList.eq(nextChapter);
        if ($next.text() !== configs.lang.DOWNLOAD) {
            nextDownload();
            return;
        }

        if (nextChapter >= totalChapter) return;

        $next.click();
    }

    function pad(str, max) {
        str = str.toString();
        return str.length < max ? pad('0' + str, max) : str;
    }

    function updateTitle() {
        doc.title = '[' + complete + '/' + progress + '] ' + tit;
    }

    function notiDisplay() {
        if (!allowNotification) return;

        new Notification(comicName, {
            body: configs.notify.CONTENT,
            icon: configs.notify.ICON
        }).onclick = function () {
            this.close();
        };
    }

    function getChaper(obj) {
        var $this = $button[obj.current],
            $contents = obj.contentChap.find('img'),
            deferreds = [],
            images = [];

        if (!$contents.length) {
            $this.text(configs.lang.ERROR).css({
                color: configs.color.ERROR,
                'pointer-events': 'none'
            }).attr('href', '#error');

            deferreds[0] = function () {
                return $.Deferred().reject($contents);
            }();
        } else {
            $this.text(configs.lang.WAITING).css('color', configs.color.WAITING);

            $contents.each(function (i, v) {
                images[i] = v.src;
                if (obj.list) images[i] = $(v).data('src');
                images[i] = decodeURIComponent(images[i]);
                images[i] = images[i].replace(/^.+&url=/, '');
                images[i] = images[i].replace(/(https?:\/\/)lh(\d)(\.bp\.blogspot\.com)/, '$1$2$3'); // $2 = (Math.floor((Math.random() * 4) + 1))
                images[i] = images[i].replace(/\?.+$/, '');
                if (images[i].indexOf('blogspot.com') !== -1) images[i] += '?imgmax=0';
                if (changeHost) images[i] = images[i].replace(/(lh)?\d+\.bp\.blogspot\.com/, 'lh' + (Math.floor((Math.random() * 4) + 3)) + '.googleusercontent.com');
            });

            $.each(images, function (i, v) {
                var filename = v.replace(/\?.+$/, '').replace(/.*\//g, ''),
                    filetype = filename.replace(/.*\./g, '');

                if (filetype === filename) filetype = 'jpg';
                filename = pad(i, 3) + '.' + filetype;

                deferreds.push(deferredAddZip(images[i], filename, obj.current, images.length));
            });
        }

        $.when.apply($, deferreds).done(function () {
            $this.text(configs.lang.COMPLETE);
        }).fail(function (err) {
            obj.nameChap = '0__Error__' + obj.nameChap;
            $this.css('color', configs.color.ERROR);
            console.error(err);
        }).always(function () {
            worker.postMessage({
                run: true,
                index: obj.current,
                name: $.trim(obj.nameChap) + '.zip'
            });

            ++complete;
            updateTitle();

            nextDownload();
            if (--alertUnload <= 0) $(window).off('beforeunload');
        });
    }

    function toggleSkip($btn) {
        if ($btn.text() === configs.lang.SKIP) {
            $btn.text(configs.lang.DOWNLOAD).css({
                color: configs.color.DOWNLOAD,
                'pointer-events': 'auto'
            }).attr('href', '#download');
        } else if ($btn.text() === configs.lang.DOWNLOAD) {
            $btn.text(configs.lang.SKIP).css({
                color: configs.color.SKIP,
                'pointer-events': 'none'
            }).attr('href', '#skip');
        }
    }

    function warningClose() {
        $(window).on('beforeunload', function () {
            return configs.lang.WARNING;
        });
    }


    window.URL = window.URL || window.webkitURL;

    var $download = $('<a>', {
            'class': 'chapter-download',
            href: '#download',
            text: configs.lang.DOWNLOAD,
            css: {
                color: configs.color.DOWNLOAD
            }
        }),
        counter = [],
        current = 0,
        alertUnload = 0,
        complete = 0,
        progress = 0,
        doc = document,
        tit = doc.title,
        disableDownloadAll = true,
        $downloadAll,
        $downloadAllText,
        $downloadList,
        nextChapter = 0,
        totalChapter = 0,
        allowNotification = true,
        comicName,
        // workerText = '(function(){function e(a,c){var d=new JSZip;b["item"+a].forEach(function(a){d.file(a.name,a.content)});d.generateAsync({type:"blob"}).then(function(b){self.postMessage({index:a,name:c,content:b})},function(a){self.postMessage(a)})}var b={};self.addEventListener("message",function(a){var c="item"+a.data.index;b[c]||(b[c]=[]);a.data.run?e(a.data.index,a.data.name):b[c].push({name:a.data.name,content:a.data.content})},!1)})();',
        workerBlob = new Blob([(GM_getResourceText('jszip') + GM_getResourceText('worker'))], {
            type: 'text/javascript'
        }),
        workerURL = window.URL.createObjectURL(workerBlob),
        worker = new Worker(workerURL),
        $button = [];


    worker.addEventListener('message', function (event) {
        var $currBtn = $button[event.data.index];

        $currBtn.attr({
            href: window.URL.createObjectURL(event.data.content),
            download: event.data.name
        }).css({
            color: configs.color.COMPLETE,
            'pointer-events': 'auto'
        });

        setTimeout(function () {
            window.URL.revokeObjectURL($currBtn.attr('href'));
            $currBtn.css({
                color: configs.color.WAITING,
                'pointer-events': 'none'
            }).attr('href', '#remove');
        }, 15000);

        saveAs(event.data.content, event.data.name);
        if (complete === progress) notiDisplay();

    }, false);

    worker.addEventListener('error', function (err) {
        console.error(err);
    }, false);


    Notification.requestPermission(function (result) {
        if (result === 'denied') {
            allowNotification = false;
            return;
        } else if (result === 'default') {
            allowNotification = false;
            return;
        }
        allowNotification = true;
    });
    if (Notification.permission !== 'denied') Notification.requestPermission();


    if (/^\/truyen\/[^\/\n]+\/[^\/\n]+$/.test(location.pathname)) {
        comicName = $('h1').text();

        $('.linkchapter select').first().replaceWith($download);

        $download.one('click', function (e) {
            e.preventDefault();

            $button[current] = $(this);

            ++progress;

            warningClose();
            ++alertUnload;

            counter[current] = 1;
            getChaper({
                list: false,
                contentChap: $('#content'),
                nameChap: comicName,
                current: current
            });
        });

    } else {
        comicName = $('#breadcrumbs').text().trim().split(' > ')[1];

        $('#list-chapters .download').html($download);

        $downloadAll = $('<span>', {
            id: 'DownloadAllButton',
            css: {
                display: 'inline-block',
                borderColor: 'orangered',
                backgroundColor: 'orange'
            },
            html: '<span class="icon-circle-arrows-bottom"></span>'
        });
        $downloadAllText = $('<span>', {
            text: configs.lang.DOWNLOADALL
        });
        $downloadList = $('.chapter-download');
        totalChapter = $downloadList.length;

        $downloadList.one('click', function (e) {
            e.preventDefault();

            var $this = $(this),
                $chapLink = $this.closest('p').find('.title a');

            $button[current] = $this;

            ++progress;
            updateTitle();

            $this.css('pointer-events', 'none');

            if (alertUnload <= 0) warningClose();
            ++alertUnload;

            $.get($chapLink.attr('href')).done(function (responseText) {
                responseText = responseText.replace(/<img [^>]*src=['"]([^'"]+)[^>]*>/gi, function (match, capture) {
                    return '<img data-src="' + capture + '" />';
                });

                counter[current] = 1;
                getChaper({
                    list: true,
                    contentChap: $(responseText).find('#content'),
                    nameChap: $chapLink.text(),
                    current: current
                });
                ++current;
            }).fail(function (err) {
                console.error(err);
            });
        }).parent().on('contextmenu', function (e) {
            e.preventDefault();

            var $this = $(this),
                $btn = $this.children(),
                indexChapter = $this.closest('p').index();

            if (e.ctrlKey || e.altKey) {
                $downloadList.each(function (i, el) {
                    var $el = $(el);
                    if ((e.ctrlKey && indexChapter >= i) || (e.altKey && indexChapter <= i)) {
                        toggleSkip($el);
                    } else {
                        return true;
                    }
                });
            } else {
                toggleSkip($btn);
            }
        });

        $('.fl-r.like-buttons').append($downloadAll.append($downloadAllText));
        $downloadAll.one('click', function () {
            disableDownloadAll = false;
            autoDownload();
        });

    }

});
