// ==UserScript==
// @name         anti social locker
// @namespace    http://baivong.github.io/
// @description  Anti jQuery plugin Social Locker. If script doesn't work, please refresh the page to rebuild the cache and try again.
// @version      0.9.0
// @icon         http://i.imgur.com/nOuUrIW.png
// @author       Zzbaivong
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @supportURL   https://github.com/baivong/Userscript/issues
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function (global) {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        if (!('jQuery' in global)) return;

        var unlocked = 'Unlocked by Anti Social Locker',
            counter = 0,
            showCounter = function () {
                if (global.console) global.console.log(counter, 'Social Locker have been disabled!');
            },
            setCookie = function (cname, cvalue, exdays, path) {
                var domain = '',
                    d = new Date();

                if (exdays) {
                    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
                    exdays = '; expires=' + d.toUTCString();
                }
                if (!path) path = '/';
                document.cookie = cname + '=' + cvalue + '; path=' + path + exdays + domain + ';';
            };

        // Social Locker for jQuery (https://codecanyon.net/item/social-locker-for-jquery/3408941)
        (function ($) {
            if ($.fn.sociallocker) jQuery.fn.sociallocker = function () {
                var $lock = $(this.selector);
                $lock.show().attr('data-lock-id', unlocked);

                counter += $lock.length;
                showCounter();

                return this;
            };
        })(jQuery);

        // Panda Lockers (https://codecanyon.net/item/optin-panda-for-wordpress/10224279)
        (function ($) {
            if ($.fn.pandalocker) jQuery.fn.pandalocker = function () {
                var $lock = $('[data-lock-id]');

                $('[data-lock-id]').removeAttr('style').attr('data-lock-id', unlocked);

                counter += $lock.length;
                showCounter();

                return this;
            };
        })(jQuery);

        // Social Locker for Wordpress (https://codecanyon.net/item/social-locker-for-wordpress/3667715)
        (function ($) {
            if ('bizpanda' in global) global.bizpanda.initLockers = function () {
                $.each(global.bizpanda.lockerOptions, function (k, v) {
                    var mode = v.options.overlap.mode,
                        $lock = $('[data-lock-id="' + k + '"]');

                    $lock.removeAttr('style class').attr('data-lock-id', unlocked);
                    counter += $lock.length;

                    if (mode === 'full') {
                        $lock.next().remove();
                    } else if (mode === 'transparence') {
                        $lock.find('.onp-sl-transparence-mode').remove();
                    } else if (mode === 'blurring') {
                        $lock.closest('.onp-sl-content-wrap').replaceWith($lock);
                    } else {
                        counter -= $lock.length;
                        if (global.console) global.console.warn(mode, '=> Anti Social Locker unknown this mode. Please report at: https://github.com/baivong/Userscript/issues');
                    }

                    showCounter();
                });

                global.bizpanda = {};
                global.bizpanda.initLockers = function () {
                    return;
                };

                return false;
            };
        })(jQuery);

        // Easy Social Locker (https://codecanyon.net/item/easy-social-locker/6190651)
        (function ($) {
            var $events = $._data(document, 'events'),
                $doc = $(document),
                str,
                cid;

            if ($events && $events.esll_button_action) {
                $('script:not([src])').each(function () {
                    var txt = this.textContent;

                    if (txt.indexOf('esll_data') !== -1 && txt.indexOf('esll_button_action') !== -1) {
                        str = txt;
                        return false;
                    }
                });

                if (str) cid = str.match(/var\scid\s?=\s?(\d+)\;/);

                if (cid) {
                    cid = cid[1];
                } else {
                    cid = str.match(/\['(google|linkedin)(-share)?'\,\s?(\d+)\]/);

                    if (cid) {
                        cid = cid[3];
                    } else {
                        cid = '0';
                    }
                }
                if (cid !== '0') {
                    $doc.trigger('esll_button_action', ['facebook-share', cid]);
                } else {
                    $doc.trigger('esll_button_action');
                }

                counter += $('.esll-big, .esll-small').length;
                showCounter();
            }
        })(jQuery);

        // ARSocial - Social Share & Social Locker (https://codecanyon.net/item/arsocial-social-share-social-locker/15218913)
        (function ($) {
            var $pageId = $('#ars_page_id'),
                $lockId = $('#ars_locker_id'),
                $lockContents = $('.arsocialshare_locker_main_wrapper'),
                removeClass = 'ars_locked_full ars_locked_transparency ars_locked_blurring';

            if ($pageId.length && $lockId.length && $lockContents.length) {
                $lockContents.each(function () {
                    var $this = $(this),
                        $hidden = $('#' + $this.data('hidden-el'));

                    $hidden.attr('data-lock-id', unlocked).removeClass(removeClass).show();
                    $this.replaceWith($hidden);
                });

                counter += $lockContents.length;
                showCounter();
            }
        })(jQuery);

        // Social Share & Locker Pro Wordpress Plugin (http://codecanyon.net/item/social-share-locker-pro-wordpress-plugin/8137709)
        (function ($) {
            if (!('ism_general_locker' in global)) return;
            var $locker = $('.ism-before-row');

            if ($locker.length) {
                $locker.each(function () {
                    var $this = $(this),
                        $lockerAlert,
                        $lockerContent;

                    (function reUnlock() {
                        $lockerAlert = $('#' + $this.data('lockerid'));
                        $lockerContent = $('#' + $this.data('id'));
                        if (!$lockerAlert.length && !$lockerContent.is('[style]')) return;

                        $lockerContent.attr('data-lock-id', unlocked).removeAttr('style');
                        $lockerContent.parent('.ismLockerWrap').removeAttr('style');
                        $lockerAlert.remove();

                        setTimeout(function () {
                            reUnlock();
                        }, 500);
                    })();
                });

                counter += $locker.length;
                showCounter();
            }
        })(jQuery);

        // Viral Lock - Like, Google+1 or Tweet to Unlock (http://codecanyon.net/item/viral-lock-like-google1-or-tweet-to-unlock/1486602)
        // Viral Lock PHP - Like, Google+1 or Tweet to Unlock (http://codecanyon.net/item/viral-lock-php-like-google1-or-tweet-to-unlock/1632879)
        // Viral Coupon - Like, Tweet or G+ to get a Discount (http://codecanyon.net/item/viral-coupon-like-tweet-or-g-to-get-a-discount/2233568)
        (function ($) {
            if (!('virallocker_use' in global)) return;
            var $locked = $('.virallock-box'),
                $lockedPhp = $('.virallocker-box'),
                $lockedShop = $('.virallocker-box-checkout'),
                host = global.location.host,
                str,
                pid,
                getSource = function () {
                    var getStr;
                    $('script:not([src])').each(function () {
                        var txt = this.textContent;

                        if (txt.indexOf('virallocker_use') !== -1 && txt.indexOf('jQuery.post') !== -1) {
                            getStr = txt;
                            return false;
                        }
                    });
                    return getStr;
                },
                afterUnlock = function () {
                    showCounter();
                    global.location.reload();
                };

            if ($locked.length) {

                str = getSource();
                if (str) pid = str.match(/var\sdata\s?=\s?\{post\:\s?"(\d+)"\,\s?action\:/m);
                if (pid) pid = pid[1];

                setCookie('virallocker_' + pid, '0001', host);

                counter += $locked.length;
                afterUnlock();

            } else if ($lockedPhp.length) {

                str = getSource();
                if (str) pid = str.match(/"virallocker"\,\s?myID:\s?"(myid\d+)"\}/m);
                if (pid) pid = pid[1];

                setCookie('virallock_' + pid, '0001', host);

                counter += $lockedPhp.length;
                afterUnlock();

            } else if ($lockedShop.length) {

                str = getSource();
                if (str) pid = str.match(/var\sdata\s?=\s?{\s?action\:\s?"submit"\,\s?myID\:\s?"(\d+)"\}\;/m);
                if (pid) pid = pid[1];

                setCookie('virallock_' + pid, '0001', host);
                setCookie('virallock_time_' + pid, 'long', host);

                counter += $lockedPhp.length;
                afterUnlock();

            }
        })(jQuery);

    });

})(window);
