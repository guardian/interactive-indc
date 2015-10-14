import fs from 'fs';
import path from 'path';
import _ from 'lodash';


var chartdir = path.resolve(__dirname, 'embedcharts')

var chartFilenames = fs.readdirSync(chartdir);

var out = _(chartFilenames)
	.map(fn => {
		var fullSvg = fs.readFileSync(path.join(chartdir, fn), 'utf8')
		var i = fullSvg.indexOf('<svg');
		return [fn.split('.')[0], fullSvg.slice(i)]
	})
	.zipObject()
	.value()

fs.writeFileSync(path.resolve(__dirname, 'embedcharts.json'), JSON.stringify(out, null, 2));
