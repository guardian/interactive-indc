var fs = require('fs')

module.exports = function(grunt) {

    require('jit-grunt')(grunt);
    try {
        var awsKeys = grunt.file.readJSON('./aws-keys.json')
    } catch (err) {
        console.warn('aws-keys.json not found')
    }

    grunt.initConfig({

        watch: {
            css: {
                files: ['src/css/**/*'],
                tasks: ['sass'],
            }
        },

        clean: {
            build: ['build']
        },

        sass: {
            options: {
                sourceMap: true
            },
            interactive: {
                files: {
                    'build/main.css': 'src/css/main.scss',
                    'build/embed.css': 'src/css/embed.scss',
                }
            }
        },

        copy: {
            boot: { src: 'src/js/boot.js', dest: 'build/boot.js' }
        },

        shell: {
            options: {
                execOptions: { cwd: '.' }
            },
            main: { command: './node_modules/.bin/jspm bundle-sfx src/js/main build/main.js --format amd' },
            embed: { command: './node_modules/.bin/jspm bundle -m src/js/embed build/embed.js' }
        },

        aws: awsKeys,

        aws_s3: {
            options: {
                accessKeyId: '<%= aws.AWSAccessKeyId %>',
                secretAccessKey: '<%= aws.AWSSecretKey %>',
                region: 'us-east-1',
                uploadConcurrency: 5, // 5 simultaneous uploads
                downloadConcurrency: 5, // 5 simultaneous downloads
                debug: grunt.option('dry'),
                bucket: 'gdn-cdn'
            },
            production: {
                options: {
                    differential: true
                },
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: [
                            // shared
                            'jspm_packages/system.js', 'src/js/config.js',
                            // interactive
                            'build/boot.js', 'build/main.css', 'build/main.js', 'build/main.js.map', 'index.html', 'test.html',
                        ],
                        dest: 'embed/indc/',
                        params: { CacheControl: 'max-age=60' }
                    }
                ]
            }
        },

        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8000,
                    base: '.',
                    middleware: function (connect, options, middlewares) {
                        // inject a custom middleware http://stackoverflow.com/a/24508523
                        middlewares.unshift(function (req, res, next) {
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', '*');
                            if (req.originalUrl.indexOf('/jspm_packages/') === 0 ||
                                req.originalUrl.indexOf('/bower_components/') === 0) {
                                res.setHeader('Cache-Control', 'public, max-age=315360000');
                            }
                            return next();
                        });
                        return middlewares;
                    }
                }
            }
        }
    });

    grunt.registerTask('build', ['clean', 'sass'])
    grunt.registerTask('deploy', ['build', 'shell', 'copy', 'aws_s3']);
    grunt.registerTask('default', ['build', 'connect', 'watch']);
}
