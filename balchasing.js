'use strict';
$(function () {
    $('.more-players-toggle, .less-players-toggle').on('click', function () {
        $(this).toggle().parents('tr').siblings('[data-extra-player]').toggle();
        $(this).siblings('a').toggle();
        return false;
    });
});
function loadError(oError) {
    throw new URIError('The script ' + oError.target.src + " didn't load correctly.");
}
function prefixScript(url, onloadFunction) {
    if ($('script[src="' + url + '"]').length) {
        onloadFunction();
        return;
    }
    var newScript = document.createElement('script');
    newScript.onerror = loadError;
    if (onloadFunction) {
        newScript.onload = onloadFunction;
    }
    document.body.appendChild(newScript);
    newScript.src = url;
}
function bcLLScripts(urls, callback) {
    var l = function (idx) {
        if (idx >= urls.length) {
            if (callback) {
                callback();
            }
            return;
        }
        prefixScript(urls[idx], function () {
            l(idx + 1);
        });
    };
    l(0);
}
function wsURL(path) {
    var loc = window.location,
        new_uri;
    if (loc.protocol === 'https:') {
        new_uri = 'wss:';
    } else {
        new_uri = 'ws:';
    }
    new_uri += '//' + loc.host;
    return new_uri + path;
}
function createCookie(name, value, days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1e3);
        expires = '; expires=' + date.toGMTString();
    } else {
        expires = '';
    }
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/';
}
function readCookie(name) {
    var nameEQ = encodeURIComponent(name) + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}
('use strict');
(function () {
    function updateTooltip(tooltip, x, y, value) {
        if (value === 0) {
            tooltip.style.display = 'none';
            return;
        }
        var transl = 'translate(' + (x + 15) + 'px, ' + (y + 15) + 'px)';
        tooltip.style.webkitTransform = transl;
        tooltip.innerHTML = value;
    }
    window.mkHeatmap = function (elem, data, settings) {
        if (!data || !data.values) {
            return;
        }
        settings = settings || {};
        var w = $(elem).width(),
            h = $(elem).height(),
            xfactor = h / (data.max_x * 2),
            yfactor = w / (data.max_y * 2);
        var config = $.extend({}, { container: elem, maxOpacity: 0.5, radius: 10, blur: 0.75 }, settings);
        var heatmap = h337.create(config);
        function clamp(v, m, f) {
            v = v + m;
            if (v < 0) {
                v = 0;
            }
            if (v > 2 * m) {
                v = 2 * m;
            }
            return v * f;
        }
        var t = [],
            min = 0,
            max = 0;
        for (var i = 0; i < data.values.length; i++) {
            var h = data.values[i],
                px = clamp(h.y, data.max_y, yfactor),
                py = clamp(-h.x, data.max_x, xfactor),
                v = h.v,
                p = { x: px, y: py, value: v };
            if (h.f) {
                if (settings.doubleRadiusForFlag) {
                    p.radius = 2 * config.radius;
                }
                if (settings.fixedLabelForFlag) {
                    $('<div class="permanent tooltip">' + v + '</div>')
                        .css({ left: px + 'px', top: py + 'px' })
                        .appendTo(elem);
                }
            }
            t.push(p);
        }
        heatmap.setData({ min: 0, max: data.max, data: t });
        var tooltip = $(elem).find('.tooltip');
        if (tooltip.length) {
            tooltip = tooltip[0];
            elem.onmousemove = function (ev) {
                var x = ev.layerX;
                var y = ev.layerY;
                var value = heatmap.getValueAt({ x: x, y: y });
                tooltip.style.display = 'block';
                updateTooltip(tooltip, x, y, value);
            };
            elem.onmouseout = function () {
                tooltip.style.display = 'none';
            };
        }
    };
})();
document.addEventListener('DOMContentLoaded', function () {
    var $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    if ($navbarBurgers.length > 0) {
        $navbarBurgers.forEach(function ($el) {
            $el.addEventListener('click', function () {
                var target = $el.dataset.target;
                var $target = document.getElementById(target);
                $el.classList.toggle('is-active');
                $target.classList.toggle('is-active');
            });
        });
    }
});
