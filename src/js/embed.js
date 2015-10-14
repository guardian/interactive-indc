import reqwest from 'reqwest'
import iframeMessenger from 'guardian/iframe-messenger'
import doT from 'olado/doT'
import countryCardTemplate from '../templates/country.html!text'

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

function linechart(emissions, pledgemin, pledgemax) {
    var yearStart = 1990, yearEnd = 2030;
    var years = range(yearStart, yearEnd);
    var numbers = [].concat(years.map(year => emissions[year]),
                            years.map(year => pledgemin[year]),
                            years.map(year => pledgemax[year])).filter(v => v !== undefined)
    var max = Math.max.apply(null, numbers);

    var currentPolicyCoords = years.map(year => [year, emissions[year]]);
    var currentPolicyScreenCoords = xyToScreen(currentPolicyCoords, max);
    var currentPolicyPath = `<path class="line" d="${coordsToPathVal(currentPolicyScreenCoords)}"></path>`;

    var pledgeMinCoords = years
        .filter(year => pledgemin[year] !== undefined)
        .map(year => [year, pledgemin[year]])
    var pledgeMinScreenCoords = xyToScreen(pledgeMinCoords, max);
    var connectingPoint1 = currentPolicyScreenCoords[currentPolicyScreenCoords.length - pledgeMinScreenCoords.length - 1];
    pledgeMinScreenCoords.unshift(connectingPoint1);
    var pledgeMaxCoords = years
        .filter(year => pledgemax[year] !== undefined)
        .map(year => [year, pledgemax[year]])
    var pledgeMaxScreenCoords = xyToScreen(pledgeMaxCoords, max);
    // var connectingPoint2 = currentPolicyScreenCoords[currentPolicyScreenCoords.length - pledgeMaxScreenCoords.length];
    // pledgeMaxScreenCoords.push(connectingPoint2);
    var pledgeScreenCoords = [].concat(/*pledgeMaxScreenCoords,*/ pledgeMinScreenCoords)
    var pledgePath = `<path class="pledge" d="${coordsToPathVal(pledgeMinScreenCoords)}"></path>`;

    var currentYearPath = `<path class="currentyear" d="M2012,${max - emissions[2012]}L2012,${max}"></path>`
    var paths = currentYearPath + currentPolicyPath + pledgePath
    return `<svg viewBox="${yearStart} 0 ${yearEnd-yearStart} ${max}" preserveAspectRatio="none">${paths}</svg>`;
}

function card(country, data) {
    console.log(country, data[country]);
    'x% improvement over current policies'
    'x% more than current policies'
    'x% below 1990 levels'
    'x% above 2010 levels'

    return countryCardTemplateFn({
        country: country,
        blurb: data[country].blurbs.Copy,
        reductionFromCurrentPolicy: Number(data[country]['Reduction from current policies']['%']).toFixed(0),
        reductionFromBaseline: Number(data[country]['Reduction from baseline year']['%']).toFixed(0),
        baselineYear: data[country]['Reduction from baseline year']['baseline'],
        linechart: linechart(data[country].emissions, data[country].pledgemin, data[country].pledgemax)
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

export function init(el) {
    run(el)
        .then(_ => console.log('fin'))
        .catch(err => console.log(err.stack))
}
