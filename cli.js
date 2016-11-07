#!/usr/bin/env node

const http = require('http');
const parseXML = require('xml2js').parseString;
const config = require('./config.json');
const callWS = require('./index.js');
const read = require('read');
var promtPassword = () => {
    return new Promise(function (resolve, reject) {
        read({
            prompt: 'Password: ',
            silent: true
        }, function (er, p) {
            if (er) {
                return reject(new Error(er));
            }

            return resolve(p);
        });
    });
};

// GET all WebService options
http.get(config.init_options, (res) => {
    var str = '';

    // another chunk of data has been recieved, so append it to `str`
    res.on('data', function (chunk) {
        str += chunk;
    });

    // the whole response has been recieved, so we continue
    res.on('end', function () {
        // the response is xml string, not object
        parseXML(str, (e, xmlStr) => {
            if (e) {
                consol.Error(e);
            }

            var cli_options = config.cli_params;

            // getting default ENV values, if available
            // and setting ENV values to CLI options
            Object.keys(cli_options).forEach((k) => {
                var value = cli_options[k];

                if (!value.hasOwnProperty('default')) {
                    // nothing to set
                    return;
                }

                if (value.default.indexOf('process.env.') === -1) {
                    // ordinary value
                    return;
                }

                var d = value.default.replace('process.env.', '');
                var e = process.env[d];

                if (e) {
                    // we have value from environment
                    // set value
                    cli_options[k].default = e;
                } else {
                    // if we do not have value remove the key, because
                    // "default" will break the "demand" option for the parameter
                    delete cli_options[k].default;
                }
            });

            var webServiceFunctionNames = xmlStr['wsdl:definitions']['wsdl:binding'][0]['wsdl:operation'].map(e => e.$.name);
            // limit the "n" key to the available options for the WebService
            cli_options.n.choices = webServiceFunctionNames;

            var argv = require('yargs')
                .usage(config.cli_usage)
                .options(cli_options)
                .help('help')
                .alias('h', 'help')
                .showHelpOnFail(true, 'Specify --help for available options')
                .argv;

            var emptyENVPass = (process.env.MIN_EDU_PASSWORD === undefined && (!argv.p));
            var newUserName = (process.env.MIN_EDU_USERNAME !== undefined && process.env.MIN_EDU_USERNAME !== argv.u);
            var ask4Pas = (newUserName || emptyENVPass);
            // if the userName is different or there is no ENV value set
            // ask for password through the console
            (ask4Pas ? promtPassword() : Promise.resolve())
            .then((newPassword) => {
                    if (newPassword) {
                        argv.p = newPassword;
                        argv.password = newPassword;
                    }

                    // call the WebService with the options chosen from the user
                    return callWS(argv);
                })
                .then((res) => {
                    console.log(res);
                }, (err) => {
                    console.error(err);
                    return false;
                });
        });
    });
}).on('socket', (socket) => {
    socket.emit('agentRemove');
});