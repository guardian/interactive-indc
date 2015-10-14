System.config({
  defaultJSExtensions: true,
  transpiler: "traceur",
  babelOptions: {
    "optional": [
      "runtime",
      "optimisation.modules.system"
    ]
  },
  traceurOptions: {
    asyncFunctions: true,
    "optional": [
      "runtime"
    ]
  },
  paths: {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*"
  },

  map: {
    "Canop/hu.js": "github:Canop/hu.js@master",
    "babel": "npm:babel-core@5.8.25",
    "babel-runtime": "npm:babel-runtime@5.8.25",
    "core-js": "npm:core-js@1.2.0",
    "d3": "github:mbostock/d3@3.5.6",
    "ded/bonzo": "github:ded/bonzo@2.0.0",
    "ded/bowser": "github:ded/bowser@1.0.0",
    "fat/bean": "github:fat/bean@1.0.14",
    "guardian/iframe-messenger": "github:guardian/iframe-messenger@master",
    "hammer": "github:hammerjs/hammer.js@2.0.4",
    "json": "github:systemjs/plugin-json@0.1.0",
    "lodash": "npm:lodash@3.10.1",
    "olado/doT": "github:olado/doT@1.0.1",
    "reqwest": "github:ded/reqwest@2.0.4",
    "samsonjs/strftime": "github:samsonjs/strftime@0.9.2",
    "text": "github:systemjs/plugin-text@0.0.2",
    "traceur": "github:jmcriffey/bower-traceur@0.0.91",
    "traceur-runtime": "github:jmcriffey/bower-traceur-runtime@0.0.91",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:babel-runtime@5.8.25": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:core-js@1.2.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:lodash@3.10.1": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});
