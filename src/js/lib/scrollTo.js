const interval = 15;//, total = 300;

function getOffset(el) {
    return el ? el.offsetTop + getOffset(el.offsetParent) : 0;
}

var animationFrame = window.requestAnimationFrame;
var cancelFrame = window.cancelAnimationFrame;
var vendors = ['ms', 'moz', 'webkit', 'o'];
for (var x = 0; x < vendors.length && !animationFrame; ++x) {
    animationFrame = window[vendors[x]+'RequestAnimationFrame'];
    cancelFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
}

animationFrame = animationFrame || (cb => setTimeout(cb, 13));
cancelFrame = cancelFrame || (id => clearTimeout(id));

var currentFrame = null;

export default function scrollTo(el) {
    var start = window.pageYOffset;
    var end = getOffset(el) + 1;
    var distance = end - start;
    var total = Math.floor(Math.abs(distance) / 6 / interval) * interval;
    var elapsed = 0;

    if (currentFrame) cancelFrame(currentFrame);

    currentFrame = animationFrame(function scrollHandler() {
        var t = elapsed / total;
        window.scrollTo(0, Math.floor(start + distance * t * (2 - t)));
        if (elapsed < total) {
            elapsed += interval;
            currentFrame = animationFrame(scrollHandler);
        } else {
            currentFrame = null;
        }
    });
};

