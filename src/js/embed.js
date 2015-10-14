import reqwest from 'reqwest'
import iframeMessenger from 'guardian/iframe-messenger'
import doT from 'olado/doT'
import countryCardTemplate from '../templates/country.html!text'
import charts from '../imgs/embedcharts.json!json'
import traceurRuntime from 'traceur-runtime'

var countryCardTemplateFn = doT.template(countryCardTemplate);

function range(start, stop, step=1){
  var a=[start], b=start;
  while(b<stop){b+=step;a.push(b)}
  return a;
};

function find(arr, fn) {
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) return arr[i];
    }
}

function xyToScreen(coords, max) {
    return coords.map(([x, y]) => [x, max - y]);
}

function coordsToPathVal(coords) {
    return coords.map(([x,y], i) => `${i===0 ? 'M' : 'L'}${x},${y.toFixed(2)}`).join('')
}

function card(country, data) {
    console.log(country, data[country]);
    'x% improvement over current policies'
    'x% more than current policies'
    'x% below 1990 levels'
    'x% above 2010 levels'

    return countryCardTemplateFn({
        country: country,
        svg: charts[country],
        blurb: data[country].blurbs.Copy,
        reductionFromCurrentPolicy: Number(data[country]['Reduction from current policies']['%']).toFixed(0),
        reductionFromBaseline: Number(data[country]['Reduction from baseline year']['%']).toFixed(0),
        baselineYear: data[country]['Reduction from baseline year']['baseline']
    });
}

async function run(el) {
    var spreadsheet = await reqwest({
        url: 'https://interactive.guim.co.uk/docsdata-test/1uYYw7D7PPph4l_KKwEGsIfSpxkaAxYrmVP_2Tjm7V_E.json',
        type: 'json', contentType: 'application/json'
    });
    var data = {};
    function dictify(key) {
        var arr = spreadsheet.sheets[key];
        for (var i = 0; i < arr.length; i++) {
            data[arr[i].Country] = data[arr[i].Country] || {};
            data[arr[i].Country][key] = arr[i]
        }
    }
    var keys = ['emissions', 'pledgemin', 'pledgemax', 'blurbs',
                'Reduction from current policies', 'Reduction from baseline year']
    keys.forEach(key => dictify(key))

    // el.innerHTML = Object.keys(data).map(k => card(k, data)).join('');

    var match = /\?country=(\w+)/.exec(document.location.search);
    if (match && data[match[1]]) {
        el.innerHTML = card(match[1], data);
    } else {
        el.innerHTML = "missing country in query string. (?country=US)";
    }


    iframeMessenger.resize()
}

function init() {
    run(document.querySelector('#container'))
        .then(_ => console.log('fin'))
        .catch(err => console.log(err.stack))
}

init();