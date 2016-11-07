'use strict';

const funcs = require('./functions.js');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const parseString = require('xml2js').parseString;

module.exports = (params) => {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        let url = params.url || 'http://www2.mon.bg/ws/ws.asmx';

        xhr.onload = (err, res) => {
            // the response is xml string, not object
            return parseString(xhr.responseText, function (err, result) {
                let student = funcs.getResult(params, result);

                if (result['soap:Fault'] && (student === undefined || student === null || student === {})) {
                    return reject(new Error(JSON.stringify(result['soap:Fault'][0])));
                }

                // the response is xml string, not object
                return parseString(student, function (err, resul) {
                    if (resul === undefined || resul === null || resul === {}) {
                        let er = JSON.stringify(student);
                        if (student['soap:Fault']) {
                            er = JSON.stringify(student['soap:Fault'][0]);
                        }

                        return reject(new Error(er));
                    }

                    // some of the WebService response is nested in "response" tag
                    // but it is available after parsing the XML result
                    if (resul.hasOwnProperty('response')) {
                        resul = resul.response;
                    }

                    // ONLY "getUniversityStudentDataFromEGN", "getStudentDataFromEGNExtended", "getStudentDataFromEGN"
                    // are returning any (useful) result for now
                    if (!resul.hasOwnProperty('student')) {
                        return reject(new Error('Expected result to be nested in "student" tag'));
                    }

                    return resolve(funcs.decorateResult(params, resul.student));
                });
            });
        }

        xhr.onerror = () => {
            return reject(new Error('Error while getting XML.'));
        }

        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'text/xml');
        xhr.send(funcs.getXMLParameters(params));
    });
}

module.exports.functions = funcs;
//callWEBService(params)
//    .then((res) => {
//        console.log(res);
//    }, (err) => {
//        console.error(err);
//        return false;
//    });