'use strict';

const config = require('./config.json');
const config_ws = require('./config_ws.json');
const spaceSingle = String.fromCharCode(32);
const spaceDouble = spaceSingle.repeat(2);
const emptyString = '';

// generate the SOAP Body string with full structure and all parameters
let getXMLParameters = (params) => {
    let strSoapReq = '';
    strSoapReq = strSoapReq + generateSoapBody('startSoapBody');
    strSoapReq = strSoapReq + generateSoapFunctionCallStart(params);
    config.params.forEach((param) => {
        if (params[param]) {
            strSoapReq = strSoapReq + generateSoapParameter(param, params[param]);
        }
    });
    strSoapReq = strSoapReq + generateSoapfunctionCallEnd(params);
    strSoapReq = strSoapReq + generateSoapBody('endSoapBody');

    return strSoapReq;
}

// remove double spaces
let removeDoubleSpaces = (myString) => {
    while (myString.indexOf(spaceDouble) > 0) {
        myString = myString.replace(spaceDouble, spaceSingle);
    }

    return myString;
}

// replace encoded signs
// remove some symbols
let clearResult = (result) => {
    result = result.replace('&lt;', '<');
    result = result.replace('&gt;', '>');
    result = result.replace(String.fromCharCode(9), '');
    result = result.replace(String.fromCharCode(10), '');
    result = result.replace(String.fromCharCode(11), '');
    result = result.replace(String.fromCharCode(12), '');
    result = result.replace(String.fromCharCode(13), '');
    result = removeDoubleSpaces(result);

    return result;
}

// generating opening/closing tag for the WebService (SOAP) body
let generateSoapBody = (paramName) => {
    return config.params_WS[paramName].join(emptyString);
}

// generating opening tag for the WebService option
let generateSoapFunctionCallStart = (params) => {
    let strSoap;
    let url = params.nsURL || config.nsURL;
    strSoap = '<' + params.webServiceFunctionName + ' xmlns="' + url + '">';

    return strSoap;
}

// generating closing tag for the WebService option
let generateSoapfunctionCallEnd = (params) => {
    let strSoap;
    strSoap = '</' + params.webServiceFunctionName + '>';

    return strSoap;
}

// every SOAP parameter should be a XML tag
let generateSoapParameter = (strParam, strValue) => {
    let strSoap;
    strSoap = '<' + strParam + '>';
    strSoap = strSoap + strValue;
    strSoap = strSoap + '</' + strParam + '>';

    return strSoap;
}

let sortObject = (o) => {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}

let decorateResult = (params, valueJSON) => {
    let functionName = params.webServiceFunctionName;
    let objResult = {};
    let keys = {};
    if (config_ws[functionName] && config_ws[functionName].fields) {
        keys = config_ws[functionName].fields;
    } else {
        console.log(`NO config found for WebService option "${functionName}"`)
    }

    if (Array.isArray(valueJSON)) {
        return valueJSON.map(e => decorateResult(params, e));
    }

    if (typeof valueJSON !== 'object') {
        valueJSON = JSON.parse(valueJSON);
    }

    // change the labels by --labelSufix (-l)
    Object.getOwnPropertyNames(valueJSON).sort().forEach((p) => {
        let key = p;
        if (keys[p]) {
            key = keys[p][`label${params.labelSufix}`];
        }

        objResult[key] = valueJSON[p][0];
    });

    // sort the object before return
    return sortObject(objResult);
}

// return the result, w/o
let getResultPath = (functionName) => {
    if (!config_ws[functionName]) {
        // w/o config, we do not know the result path
        // return the whole document
        console.log(`NO config found for WebService option "${functionName}"`)
        return ['soap:Envelope'];
    }

    // evaluate the expression
    // and replace it in the result path
    let rpl = {
        '${functionName}Response': `${functionName}Response`,
        '0': 0,
        '${functionName}Result': `${functionName}Result`
    }

    return config_ws[functionName].paths.map(e => rpl[e] || e);
}

// parse the result
let getResult = (params, valueJSON) => {
    // stop backward linking
    let objResult = Object.create(valueJSON);

    if (typeof objResult !== 'object') {
        objResult = JSON.parse(objResult);
    }

    // remove the unnecessary XML tags
    getResultPath(params.webServiceFunctionName).forEach((p) => {

        if (objResult === undefined || objResult === null || objResult[p] === undefined || objResult[p] === null) {
            return;
        }

        objResult = objResult[p];
    });

    return objResult;
}

// exports everything for unit tests
module.exports = {
    getXMLParameters: getXMLParameters,
    removeDoubleSpaces: removeDoubleSpaces,
    clearResult: clearResult,
    generateSoapBody: generateSoapBody,
    generateSoapFunctionCallStart: generateSoapFunctionCallStart,
    generateSoapfunctionCallEnd: generateSoapfunctionCallEnd,
    generateSoapParameter: generateSoapParameter,
    decorateResult: decorateResult,
    sortObject: sortObject,
    getResult: getResult
};