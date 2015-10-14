import reqwest from 'reqwest'
import iframeMessenger from 'guardian/iframe-messenger'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import d3 from 'd3'
import bonzo from 'ded/bonzo'
import articles from '../../data/articles.json!json'
import bean from 'fat/bean'
import copy from '../../data/copy.json!json'
import meta from '../../data/meta.json!json'
import scrollTo from './lib/scrollTo'
import share from './lib/share'

var mainTemplateFn = doT.template(mainTemplate);

var shareFn = share('Interactive title', 'http://gu/SHORTURL', '#hashtag');

const colors = {
    developing: '#F69A31',
    developed: '#4A84B8',
    key: '#999999'
};

function range(start, stop, step=1){
    var a=[start], b=start;
    while(b<stop){b+=step;a.push(b)}
    return a;
};

function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

function responseToData(spreadsheet) {
    var data = {};
    function dictify(key) {
        var arr = spreadsheet.sheets[key];
        for (var i = 0; i < arr.length; i++) {
            data[arr[i].Country] = data[arr[i].Country] || {};
            data[arr[i].Country][key] = arr[i]
        }
    }
    var keys = ['emissions', 'pledgemin', 'pledgemax', 'blurbs', 'population',
                'Reduction from current policies', 'Reduction from baseline year']
    keys.forEach(key => dictify(key))
    return data;
}

async function run(el) {
    var spreadsheet = await reqwest({
        url: 'https://interactive.guim.co.uk/docsdata-test/1uYYw7D7PPph4l_KKwEGsIfSpxkaAxYrmVP_2Tjm7V_E.json',
        type: 'json', contentType: 'application/json'
    });

    var data = responseToData(spreadsheet);

    var countries = [
        'EU', 'Japan', 'Russia', 'US', 'Canada', 'Australia',
        'Brazil', 'China', 'India', 'Indonesia', 'Ethiopia', 'Kenya', 'Mexico', 'Morocco'];

    var cumulative = {
        'EU': 329071.7808,
        'Japan': 51004.718100000006,
        'Russia': 102709.24369999999,
        'US': 366421.2663999999,
        'Canada': 28316.718200000003,
        'Australia': 14880.338899999999,
        'Brazil': 11774.7869,
        'China': 150108.5208,
        'India': 37975.8932,
        'Indonesia': 9554.054300000002,
        'Ethiopia': 146.79560000000004,
        'Kenya': 331.6266,
        'Mexico': 14983.070699999997,
        'Morocco': 1243.3649999999996
    };

    var overviewDataPoints = countries.map((c, i) => {
        var allEmissions = [].concat(
                range(1990, 2030).map(v => data[c].emissions[v]),
                range(2013, 2030).map(v => data[c].pledgemin[v]))
        return {
            x: i,
            country: c,
            pledgedReduction: data[c]['Reduction from current policies']['%'],
            population: data[c].population['2012'],
            developing: data[c].emissions.Developing === 'TRUE',
            pastEmissions: range(1990, 2012).map(v => { return {year: v, val: data[c].emissions[v]} }),
            'pastEmissions-pc': range(1990, 2012).map(v => { return {year: v, val: data[c].emissions[v] / data[c].population[v] } }),
            allEmissions: allEmissions,
            yFn: d3.scale.linear().domain([0, Math.max.apply(null, allEmissions)]).range([70, 0]),
            yFn: d3.scale.linear().domain([0, Math.max.apply(null, allEmissions)]).range([70, 0]),
            '1990': data[c].emissions['1990'],
            '2012': data[c].emissions['2012'],
            '2030a': data[c].emissions['2030'],
            '2030b': data[c].pledgemin['2030'],
            '1990-pc': data[c].emissions['1990'] / data[c].population['1990'],
            '2012-pc': data[c].emissions['2012'] / data[c].population['2012'],
            '2030a-pc': data[c].emissions['2030'] / data[c].population['2030'],
            '2030b-pc': data[c].pledgemin['2030'] / data[c].population['2030'],
            'cumulative': cumulative[c],
            cum2030a: range(2013, 2030).map(y => Number(data[c].emissions[y])).reduce((a,b) => a+b),
            cum2030b: range(2013, 2030).map(y => Number(data[c].pledgemin[y])).reduce((a,b) => a+b)
        };
    })

    var width, height;
    var xpadding = 0;
    var leftpadding;
    var max = regmax = 15000;
    var toppadding = 30;
    var view;
    var lastscaley;
    var width1990 = 17;
    var width2030 = 36;
    var widthPledge = 15;
    var offset1990 = (width2030 - width1990) / -2;
    var offset2012 = (width2030 - width1990) / -2;
    var offset2030 = 0;
    var offsetPledge = -offset1990+2;
    var keyVisible = true;
    var maxGridLines = 12;
    var views = ['2030', 'absolute', '%', 'percapita', '1990', '2012'];

    el.innerHTML = mainTemplateFn({
        countries: countries.map(c => {
            return {
                fullName: meta[c].full, name: c, blurb: data[c].blurbs.Copy,
                body: articles[c].response.content.fields.body, heading: articles[c].response.content.webTitle
            }
        })
    });

    var els = {
        container: el.querySelector('.indc-container'),
        overviewContainer: el.querySelector('.indc-overview-container'),
        menuPlaceholder: el.querySelector('.indc-country-menu-placeholder'),
        menuContainer: el.querySelector('.indc-country-menu-container'),
        svgContainer: el.querySelector('.indc-svg-container'),
        $copyHeader: bonzo(el.querySelectorAll('.indc-copy__header')),
        $copyDesc: bonzo(el.querySelectorAll('.indc-copy__desc')),
        currentView: el.querySelector('.indc-stepper__currentview'),
        viewCount: el.querySelector('.indc-stepper__viewcount'),
    };

    els.viewCount.innerHTML = views.length;
    els.svg = d3.select(els.svgContainer).append('svg').attr({class: 'indc-overview'});
    els.defs = els.svg.append("defs");

    function createMarker(defs, id, size, color, bgColor, d) {
        var clipId = `clip-${id}`;
        var clipPath = defs.append('clipPath')
            .datum(d)
            .attr('id', clipId)
            .append('rect')
                .attr({x: 0, y: -5, width: 8, height: 10});
        let marker = defs.append("marker")
            .attr({
                "id": `marker-${id}`,
                "viewBox": "0 -5 8 10",
                "refX": 7.8,
                "refY": 0,
                "markerWidth": size,
                "markerHeight": size,
                'markerUnits': 'userSpaceOnUse',
                "orient": "auto",
                'clip-path': `url(#${clipId})`
            })
        marker.append('path').attr({
            'd': "M0,-5L8,0L0,5",
            'fill': color
        })
        marker.append('path').attr({
            'd': 'M0,-5L8,-5L8,5L0,5L8,0Z',
            'fill': bgColor
        })
    }

    var emissionsRenderFns = [].slice.call(el.querySelectorAll('.indc-article__emissions')).map((node, i) => {
        var country = node.getAttribute('country');
        var d = data[country];
        var emissions = range(1990, 2030).map(y => [y, d.emissions[y]]);
        var pledge = range(2013, 2030).map(y => [y, d.pledgemin[y]]);

            var max = Math.max.apply(null, [].concat(emissions.map(v=>v[1]), pledge.map(v=>v[1])));

        var points = emissions.slice();

        var svg = d3.select(node).append('svg')
        var defs = svg.append('defs');

        var dtype = d.emissions.Developing === 'TRUE' ? 'developing' : 'developed';
        console.log(colors[dtype]);
        createMarker(defs, `projection-${i}`, 10, 'white', '#969696');
        createMarker(defs, `pledge-${i}`, 20, colors[dtype], '#969696');

        svg.attr({class: 'indc-country indc-country--' + dtype});

        svg.append('line').attr('class', 'indc-todayline')

        //svg.append('line').attr('class', 'indc-zeroline')

        /*var group = svg.append('g');
        group.selectAll('text')
            .data(range(1990, 2030, 10))
            .enter()
                .append('text')
                .attr('class', 'indc-year-text')
                .text(y => y);*/

        svg.append('path')
            .attr({'class': 'indc-line indc-line--emissions', 'marker-end': `url(#marker-projection-${i})`})
            .datum(points)

        var pledgePoints = pledge.slice()
        pledgePoints.unshift(emissions[22]) // join to 2012 emissions
        svg.append('path')
            .attr({'class': 'indc-line indc-line--pledge', 'marker-end': `url(#marker-pledge-${i})`})
            .datum(pledgePoints)

        return function render() {
            let {height, width} = node.getBoundingClientRect();
            var xFn = d3.scale.linear()
                .domain([1990, 2030])
                .range([0, width])
            var yFn = d3.scale.linear()
                .domain([0, max * 1.2])
                .range([height, 0])

            let svg = d3.select(node).select('svg');
            svg.attr({height: height, width: width});

            svg.select('.indc-todayline').attr({
                x1: xFn(2012), x2: xFn(2012),
                y1: height * 0.1, y2: height
            })

            svg.select('.indc-zeroline').attr({
                x1: xFn(1990), x2: xFn(2030),
                y1: height, y2: height
            });

            [].slice.call(node.querySelectorAll('.indc-year-text')).forEach(el => {
                year = +el.textContent;
                el.setAttribute('x', xFn(year));
                el.setAttribute('y', height);
            });

            svg.select('.indc-line--emissions')
                .attr('d', d => {
                    return d3.svg.line().x(d => xFn(d[0])).y(d => yFn(d[1]))(d)/* + 'Z'*/
                })

            svg.select('.indc-line--pledge')
                .attr('d', d => {
                    return d3.svg.line().x(d => xFn(d[0])).y(d => yFn(d[1]))(d)/* + 'Z'*/
                })
        }
    })

    var resetDimensions = () => {
        var rect = els.overviewContainer.getBoundingClientRect();
        width = rect.width; height = Math.min(400, window.innerHeight * 0.7);
    }
    var setView = newView => {
        view = newView;
        els.overviewContainer.setAttribute('view', view);
    }

    setView(views[0]);
    resetDimensions();


    function getDomain(view) {
        if (view === 'cumulative') return [0, view === 'cumulativezoom' ? 40000 : 600000]
        else if (view === '%') return [-30, 200]
        else if (view === 'percapita') return [0, 25]
        else return [0, 15000];
    }

    overviewDataPoints.forEach(d => {
        var color = d.developing ? colors.developing : colors.developed;
        createMarker(els.defs, `projection-${d.country}`, 10, color, 'white', d);
        createMarker(els.defs, `pledge-${d.country}`, 20, color, 'white', d);
    })
    createMarker(els.defs, 'projection-key', 10, colors.key, 'white')
    createMarker(els.defs, 'pledge-key', 20, colors.key, 'white')


    var groups = {
        all: els.svg.append('g')
    };
    groups.axis = groups.all.append('g').attr('class', 'indc-axis')
    groups.labels = groups.all.append('g').attr('class', 'indc-labels')
    groups.lines = groups.all.append('g').attr('class', 'indc-lines')
    groups.countries = groups.all.append('g').attr('class', 'indc-countries')
    groups.key = groups.all.append('g').attr('class', 'indc-key')

    els.zeroline = groups.lines.append('line').attr('class', 'indc-zeroline')
    els.zerolabel = groups.lines.append('text').attr('class', 'indc-zerolabel').text('0')

    els.yaxistext = groups.axis.append('text').text('test test test').attr({
        class: 'indc-axis__text',
        dx: 40
    })

    els.hoveraxis = groups.axis.append('line').attr({
        class: 'indc-line indc-axis__hover'
    })


    els.hoveraxistext = groups.axis.append('text').attr({
        class: 'indc-line indc-axis__hovertext',
        'text-anchor': 'start',
        dx: 5, dy: -6,
        x: 0
    })

    var key2012text = groups.key.append('text').text('2012 emissions').attr({y: 34});
    var keypledgetext = groups.key.append('text').attr({class: 'indc-key__pledge-text', x: 0, y: 68});
    keypledgetext.append('tspan').text('2030 projection')
    keypledgetext.append('tspan').text('with pledge').attr({x: 0, dy: '1.4em'})

    groups.key.append('text').text('2030 projection').attr({class: 'indc-key__projection-text', x: 0, y: 2});
    groups.key.append('text').text('1990 to 2012').attr({class: 'indc-key__past-text', x: 35, y: 60});


    var key = {
        projection: groups.key.append('line').attr({
            class: 'indc-line indc-line--projection', "marker-end": "url(#marker-projection-key)",
            y1: 30, y2: 8,
            stroke: colors.key
        }),
        pledge: groups.key.append('line').attr({
            class: 'indc-line indc-line--pledge', "marker-end": "url(#marker-pledge-key)",
            y1: 30, y2: 55,
            stroke: colors.key
        }),
        past: groups.key.append('line').attr({
            class: 'indc-line indc-line--past',
            y1: 30, y2: 70,
            stroke: colors.key
        }),
        bar: groups.key.append('line').attr({
            class: 'indc-line indc-line--2012',
            stroke: colors.key
        })
    };

    els.markerKey = groups.key.append('text').attr({x: 22, y: 70});

    els.gridLines = range(0, maxGridLines).map(i => groups.lines.append('line').attr({class: 'indc-line indc-line--gridline'}))

    els.countries = groups.countries.selectAll('g').data(overviewDataPoints, d => d.country);

    els.countries.exit().remove()
    var g = els.countries.enter().append('g')
            .attr({class: 'indc-country', country: d => d.country})
            .classed('indc-country--developing', d => d.developing)
            .classed('indc-country--developed', d => !d.developing)


    g.insert('line').attr({class: 'indc-line indc-line--past'})

    g.insert('line').attr({class: 'indc-line indc-line--projection'})
        .attr("marker-end", d => `url(#marker-projection-${d.country})`);
    g.insert('line').attr({class: 'indc-line indc-line--pledge'})
        .attr("marker-end", d => `url(#marker-pledge-${d.country})`);
    g.insert('line').attr({class: 'indc-line indc-line--1990'})
    g.insert('line').attr({class: 'indc-line indc-line--2012'})
    g.insert('text').attr({class: 'indc-country-label'})
    g.insert('rect').attr({class: 'indc-country-hitbox'})

    var renderCountries = () => {

        var compact = window.innerWidth < 740;
        var showYAxis = window.innerWidth > 400;
        var projectionOffset = compact ? 5 : 8;
        var bottompadding = 18;
        var width2012 = compact ? 18 : 36;
        leftpadding = showYAxis ? 15 : 0;

        groups.key.attr('transform', `translate(${width - leftpadding - (compact ? 120 : 200)}, 50)`)
        key2012text.attr({x: compact ? 25 : 50})


        groups.all.attr({transform: `translate(${leftpadding} 0)`})

        els.yaxistext.attr({
            x: 0, y: height - bottompadding - 20,
            transform: `rotate(-90 0 ${height - bottompadding - 20})`
        })

        key.bar.attr({x1: 0, x2: 0 + width2012, y1: 30, y2: 30})
        key.projection.attr({
            x1: 0 + width2012/2 - projectionOffset, x2: 0 + width2012/2 - projectionOffset
        })
        key.pledge.attr({
            x1: 0 + width2012/2 + projectionOffset, x2: 0 + width2012/2 + projectionOffset,
        })
        key.past.attr({x1: 0 + width2012/2, x2: 0 + width2012/2})

        els.currentView.innerHTML = views.indexOf(view) + 1;

        els.$copyHeader.text(copy[view].header);
        els.$copyDesc.text(copy[view].desc);
        els.yaxistext.text(copy[view].axis)

        var easing = 'cubic-out',
            duration = 500,
            suffix = view === 'percapita' ? '-pc' : '';

        var xFn = d3.scale.linear()
            .domain([1990, 2012])
            .range([0, 70])

        keyVisible = ['cumulative', '1990', '2012'].indexOf(view) === -1;

        var domain = getDomain(view);

        var scaley = lastscaley = d3.scale.linear()
            .domain(domain)
            .range([height - bottompadding, 24])

        var segmentSize = (width - leftpadding - xpadding*2) / overviewDataPoints.length;

        var yFnForYear = (year, offset = 0) => {
            return function(d) {
                if (view.indexOf('cumulative') === 0) {
                    var since = d['cum' + year] || 0;
                    return scaley(d.cumulative + since) + offset;
                } else {
                    var val = view === '%' ? (d[year+suffix] / d['2012'+suffix])*100 - 100: d[year+suffix];
                    return scaley(val) + offset;
                }
            }
        }

        var maxYVal = scaley.invert(0);
        var gridLineSpacingPreRounding = maxYVal / maxGridLines;
        var gridLineSpacing = gridLineSpacingPreRounding
        var exp = Math.round(Math.log10(gridLineSpacingPreRounding));
        var stops = [1,2,5]
        var gridLineSpacing;
        for (var i = 0; i < stops.length; i++) {
            gridLineSpacing = stops[i] * Math.pow(10, exp);
            if (maxYVal / gridLineSpacing  <= maxGridLines) break;
        }

        range(0, maxGridLines).forEach(i => {
            var y = gridLineSpacing * i;
            let canvasy = y !== 0 ? scaley(y) : height + 100;
            els.gridLines[i]
                .transition().duration(duration).ease(easing, 10)
                .attr({
                    y1: canvasy, y2: canvasy,
                    x1: 0 + leftpadding, x2: width
                })
        })

        els.zerolabel
            .text(`0 ${copy[view].unit}`)
            .transition().duration(duration).ease(easing, 10)
            .attr({x: 0, y: scaley(0) + 5})

        els.zeroline
            .transition().duration(duration).ease(easing, 10)
            .attr({
                x1: els.zerolabel.node().getComputedTextLength() + 5,
                x2: width - leftpadding,
                y1: scaley(0), y2: scaley(0)
            });

        var colx = d => xpadding + (segmentSize * d.x)
        var midx = d => colx(d) + segmentSize/2;

        var mainYear = view === '1990' ? '1990' : '2012';
        var pastYear = '1990';

        els.countries.selectAll('.indc-country-label').text(d => compact ? meta[d.country].compact : d.country)
        els.countries.selectAll('.indc-line--2012')
            .transition().duration(duration).ease(easing, 10)
            .attr({
                x1: d => midx(d) - width2012/2, x2: d => midx(d) + width2012/2,
                y1: yFnForYear(mainYear), y2: yFnForYear(mainYear)})

        els.countries.selectAll('.indc-line--past')
            .transition().duration(duration).ease(easing, 10)
            .attr({
                x1: d => midx(d), x2: d => midx(d),
                y1: yFnForYear(pastYear), y2: yFnForYear(mainYear)})

        els.countries.selectAll('.indc-line--projection')
            .transition().duration(duration).ease(easing, 10)
            .attr({
                x1: d => midx(d) - projectionOffset, x2: d => midx(d) - projectionOffset,
                y1: yFnForYear(mainYear), y2: yFnForYear(view === '2012' || view === '1990' ? mainYear : '2030a')})

        els.countries.selectAll('.indc-line--pledge')
            .transition().duration(duration).ease(easing, 10)
            .attr({
                x1: d => midx(d) + projectionOffset, x2: d => midx(d) + projectionOffset,
                y1: yFnForYear(mainYear), y2: yFnForYear(view === '2030' || view === '1990' ? mainYear : '2030b')})


        els.defs.selectAll('marker')
            .each(function(d) {
                var projection = this.id.indexOf('projection') !== -1;
                var size = projection ? 10 : (compact ? 12 : 20);
                d3.select(this).attr({markerWidth: size, markerHeight: size});
            })

        els.defs.selectAll('clipPath') // gross arrow clipping sry :(
            .each(function(d) {
                var rect = this.childNodes[0];
                var projection = this.id.indexOf('projection') !== -1;
                var size = projection ? 10 : (compact ? 12 : 20);
                if (d) {
                    var diff = projection ?
                        (8 / (size*0.8)) * Math.abs(yFnForYear(view === '2012' ? mainYear : '2030a')(d) - yFnForYear(mainYear)(d)) :
                        (8 / (size*0.8)) * Math.abs(yFnForYear(view === '2030' ? mainYear : '2030b')(d) - yFnForYear(mainYear)(d));
                    if (diff < 8) {
                        d3.select(rect).attr({x: 8 - diff, width: diff});
                    } else {
                        d3.select(rect).attr({x: 0, width: 8});
                    }
                }
            })

        els.countries.selectAll('.indc-country-hitbox')
            .attr({x: d => colx(d), y: 0, width: segmentSize, height: height})

        els.countries.selectAll('.indc-country-label')
            .transition().duration(duration).ease(easing, 10)
            .attr({
                x: midx,
                y: d => {
                    var clearance = 12, padding = 2;
                    var downcoord = y => y + clearance + padding;
                    var upcoord = y => y - padding - 6;
                    var today = yFnForYear(mainYear)(d);
                    if (!keyVisible) {
                        return upcoord(today);
                    }
                    var predicted = yFnForYear('2030a')(d);
                    var pledge = yFnForYear('2030b')(d);
                    var predictedHeight = predicted - today;
                    var pledgeHeight = pledge - today;

                    if (predictedHeight < 0) { // up
                        if (pledgeHeight < 0) return downcoord(today); // both up
                        else if (Math.abs(predictedHeight) < Math.abs(pledgeHeight)) return upcoord(predicted);
                        else return downcoord(pledge);
                    } else {
                        if (predictedHeight > 0) return upcoord(today); // both
                        else if (Math.abs(predictedHeight) < Math.abs(pledgeHeight)) return downcoord(predicted);
                        else return upcoord(pledge);
                    }
                }});
    }

    var renderLines = () => {
    }

    var render = (animate = false) => {
        resetDimensions();

        els.svg.attr({width: width, height: height});

        renderLines();
        emissionsRenderFns.forEach(fn => fn())
        renderCountries();
    }

    bean.on(els.svg.node(), 'click', '.indc-country-hitbox', evt => {
        var country = evt.currentTarget.parentElement.getAttribute('country')
    })

    bean.on(els.svg.node(), 'mouseenter', '.indc-country-hitbox', evt => {
        var country = evt.currentTarget.parentElement.getAttribute('country')
        els.overviewContainer.setAttribute('hovercountry', country);
    })

    bean.on(els.svg.node(), 'mouseleave', '.indc-country-hitbox', evt => {
        els.overviewContainer.removeAttribute('hovercountry');
    })

    bean.on(el.querySelector('.indc-stepper__arrow--prev'), 'click', evt => {
        var i = Math.max(0, views.indexOf(view)-1);
        setView(views[i]);
        renderCountries();
    })

    bean.on(el.querySelector('.indc-stepper__arrow--next'), 'click', evt => {
        els.overviewContainer.removeAttribute('started');
        var i = Math.min(views.length-1, views.indexOf(view)+1);
        setView(views[i]);
        renderCountries();
    })

    var hideHoverAxis = () => {
        els.hoveraxis.attr({
            y1: 0, y2: 0,
            x1: 0, x2: 0,
        })
        els.hoveraxistext.text('');
    }

    els.svg.node().addEventListener('mousemove', evt => {
        var hoverval = lastscaley.invert(evt.offsetY).toFixed(0);
        if (hoverval < 0 && view !== '%') hideHoverAxis();
        else {
            els.hoveraxis.attr({
                y1: evt.offsetY, y2: evt.offsetY,
                x1: xpadding, x2: width - leftpadding - xpadding
            })
            els.hoveraxistext.text(`${hoverval} ${copy[view].unit}`).attr({y: evt.offsetY});
        }
    })

    els.svg.node().addEventListener('mouseleave', hideHoverAxis)

    render();

    var timeout;
    window.addEventListener('resize', () => {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(render, 500);
    })

    var menuFixed = false;
    window.addEventListener('scroll', evt => {
        var {top} = els.menuPlaceholder.getBoundingClientRect()
        if (!menuFixed && top < 0) {
            bonzo(els.menuPlaceholder).addClass('indc-country-menu-placeholder--fixed');
            menuFixed = true;
        } else if (menuFixed && top > 0) {
            bonzo(els.menuPlaceholder).removeClass('indc-country-menu-placeholder--fixed');
            menuFixed = false;
        }
    })

    var articleEls = [].slice.call(el.querySelectorAll('.indc-article__anchor')).reverse();
    var updateMenuState = () => {
        for (var i = 0; i < articleEls.length; i++) {
            if (articleEls[i].getBoundingClientRect().top < 0) {
                els.container.setAttribute('country', articleEls[i].getAttribute('country'))
                return;
            }
        }
        els.container.removeAttribute('country');
    }

    window.addEventListener('scroll', throttle(updateMenuState, 150));

    bean.on(els.menuPlaceholder, 'click', 'li', evt => {
        var country = evt.target.getAttribute('country');
        scrollTo(el.querySelector(`.indc-article__anchor[country='${country}']`), updateMenuState);
    });

    [].slice.call(el.querySelectorAll('.indc-article__more')).forEach(moreEl => {
        bean.on(moreEl, 'click', () => bonzo(moreEl.parentNode).removeClass('is-collapsed'));
    });

    [].slice.call(el.querySelectorAll('.interactive-share')).forEach(shareEl => {
        var network = shareEl.getAttribute('data-network');
        bean.on(shareEl, 'click', () => shareFn(network));
    });

    iframeMessenger.resize()
}

export function init(el) {
    run(el)
        .then(_ => console.log('fin'))
        .catch(err => console.log(err.stack))
}
