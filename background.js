/**
 * @file ccc/background.js
 * @license MIT
 * @version 1
 */
'use strict';

// --------------------------------------------------

// https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
// https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes

let DefaultRules = {
	"font": {
		"*": {
			"*": {
				"*": {
					"ACAO": "star",
					"ACAC": false,
					"ACAM": ["GET"]
				}
			}
		}
	}
};
let Rules = DefaultRules;

let setRules = async function(json) {
	let parsed = JSON.parse(json);
	await browser.storage.sync.set({
		rules: json
	});
	Rules = parsed;
};
let readRulesFromStorage = async function() {
	let json = await browser.storage.sync.get('rules');
	if (typeof json === 'string') {
		Rules = JSON.parse(json);
	} else {
		Rules = DefaultRules;
	}
};
let clearStorage = async function() {
	await browser.storage.sync.clear();
	Rules = DefaultRules;
};

/*
{
	"Type1": {
		"Origin1": {
			"Target1": {
				"Path1": {
					"ACRH": [""],
					"ACAO": "allow",
					"ACEH": [""],
					"ACAC": false,
					"ACAM": ["GET", "POST"],
					"ACAH": [""]
				}
			}
		}
	}
}
*/

// --------------------------------------------------

/**
 * @typedef {Object} RuleEntry
 * ACRM (Access-Control-Request-Method) is processed with ACAM
 * @property {string[]} ACRH _preflight-request_ Access-Control-Request-Headers
 * @property {string} ACAO _response_ Access-Control-Allow-Origin: "allow" or "block" or "star"
 * @property {string[]} ACEH _response_ Access-Control-Expose-Headers
 * @property {boolean} ACAC _response_ Access-Control-Allow-Credentials
 * @property {string[]} ACAM _preflight-response_ Access-Control-Allow-Methods
 * @property {string[]} ACAH _preflight-response_ Access-Control-Allow-Headers
 * @param {string} type Type
 * @param {string} origin Origin
 * @param {string} target Target Origin
 * @param {string} path Path
 * @returns {?RuleEntry}
 */
let matchRule = function(type, origin, target, path) {
	let r_type = Rules[type] || Rules['*'];
	if (!r_type) {
		return null;
	}

	let r_origin;
	for (let e_origin of Reflect.ownKeys(r_type)) {
		if (e_origin === '*' || origin.endsWith(e_origin)) {
			r_origin = r_type[e_origin];
			break;
		}
	}
	if (!r_origin) {
		return null;
	}

	let r_target;
	for (let e_target of Reflect.ownKeys(r_origin)) {
		if (e_target === '*' || target.endsWith(e_target)) {
			r_target = r_origin[e_target];
			break;
		}
	}
	if (!r_target) {
		return null;
	}

	let r_path;
	for (let e_path of Reflect.ownKeys(r_target)) {
		if (e_path === '*' || path.startsWith(e_path)) {
			r_path = r_target[e_path];
			break;
		}
	}
	if (!r_path) {
		return null;
	}

	return r_path;
};

// --------------------------------------------------

const Preflights = { __proto__: null };
const Requests = { __proto__: null };
let hashDetails = function(details) {
	return `${details.originUrl}|${details.url}`;
}

let handlePreflightRequest = function(details, record, rule, [h_acrm, h_acrh, h_origin]) {
	if (rule.ACAO === 'block') {
		return { cancel: true };
	}

	if (h_acrm && rule.ACAM && !rule.ACAM.includes(h_acrm.value)) {
		return { cancel: true };
	}

	let dirty = false;

	if (rule.ACAO === 'allow' || rule.ACAO === 'star') {
		_removeFromArray(details.requestHeaders, h_origin);
		dirty = true;
	}

	let acrh_omitted;
	if (h_acrh && rule.ACRH) {
		let original = h_acrh.value.toLowerCase().split(/, */g);
		let intersect = _intersect(rule.ACRH, original); 
		if (intersect.length !== original.length) {
			acrh_omitted = _complement(intersect, original);
			record.acrh_omitted = acrh_omitted;
			h_acrh.value = intersect.join(', ');
			dirty = true;
		}
	}

	if (dirty) {
		return { requestHeaders: details.requestHeaders };
	}
};
let handleRequest = function(details, record, rule, [h_acrm, h_acrh, h_origin]) {
	if (rule.ACAO === 'block') {
		return { cancel: true };
	}

	if (rule.ACAM && !rule.ACAM.includes(details.method)) {
		return { cancel: true };
	}

	let dirty = false;

	if (rule.ACAO === 'allow' || rule.ACAO === 'star') {
		_removeFromArray(details.requestHeaders, h_origin);
		dirty = true;
	}

	if (record.acrh_omitted) {
		_removeHeaders(details.requestHeaders, record.acrh_omitted);
		dirty = true;
	}

	if (rule.ACAC === false) {
		let original_length = details.requestHeaders.length;
		_removeHeaders(details.requestHeaders, ['Authorization', 'Cookie']);
		if (details.requestHeaders.length !== original_length) {
			dirty = true;
		}
	}

	if (dirty) {
		return { requestHeaders: details.requestHeaders };
	}
};

let handlePreflightResponse = function(details, rule, [h_acao, h_aceh, h_acac, h_acam, h_acah]) {
	let dirty = false;

	if (rule.ACAO === 'allow') {
		_setHeader(details.responseHeaders, h_acao, 'Access-Control-Allow-Origin', details.originUrl);
		dirty = true;
	} else if (rule.ACAO === 'star') {
		_setHeader(details.responseHeaders, h_acao, 'Access-Control-Allow-Origin', '*');
		dirty = true;
	}

	if (h_aceh && rule.ACEH) {
		let original = h_aceh.value.split(/, */g);
		let intersect = _intersect(rule.ACEH, original);
		if (intersect.length !== original.length) {
			h_aceh.value = intersect.join(', ');
			dirty = true;
		}
	}

	if (typeof rule.ACAC === 'boolean') {
		_setHeader(details.responseHeaders, h_acac, 'Access-Control-Allow-Credentials', String(rule.ACAC));
		dirty = true;
	}

	if (h_acam && rule.ACAM) {
		let original = h_acam.value.split(/, */g);
		let intersect = _intersect(rule.ACAM, original);
		if (intersect.length !== original.length) {
			h_acam.value = intersect.join(', ');
			dirty = true;
		}
	}

	if (h_acah && rule.ACAH) {
		let original = h_acah.value.split(/, */g);
		let intersect = _intersect(rule.ACAH, original);
		if (intersect.length !== original.length) {
			h_acah.value = intersect.join(', ');
			dirty = true;
		}
	}

	if (dirty) {
		return { responseHeaders: details.responseHeaders };
	}
};
let handleResponse = function(details, rule, [h_acao, h_aceh, h_acac, h_acam, h_acah]) {
	let dirty = false;

	if (rule.ACAO === 'allow') {
		_setHeader(details.responseHeaders, h_acao, 'Access-Control-Allow-Origin', details.originUrl);
		dirty = true;
	} else if (rule.ACAO === 'star') {
		_setHeader(details.responseHeaders, h_acao, 'Access-Control-Allow-Origin', '*');
		dirty = true;
	}

	if (h_aceh && rule.ACEH) {
		let original = h_aceh.value.split(/, */g);
		let intersect = _intersect(rule.ACEH, original);
		if (intersect.length !== original.length) {
			h_aceh.value = intersect.join(', ');
			dirty = true;
		}
	}

	if (typeof rule.ACAC === 'boolean') {
		_setHeader(details.responseHeaders, h_acac, 'Access-Control-Allow-Credentials', String(rule.ACAC));
		dirty = true;
	}

	if (dirty) {
		return { responseHeaders: details.responseHeaders };
	}
};

// --------------------------------------------------

browser.webRequest.onBeforeSendHeaders.addListener(function(details) {
	if (details.tabId === -1 || !details.requestHeaders) {
		return;
	}

	let headers = _digestHeaders(details.requestHeaders, [
		'access-control-request-method', 'access-control-request-headers',
		'origin'
	]);
	let h_origin = headers[2];
	if (!h_origin) {
		return;
	}

	let url = new URL(details.url);
	let rule = matchRule(details.type, details.originUrl, url.origin, url.pathname);
	if (!rule) {
		return;
	}

	let key = hashDetails(details);
	let record = Preflights[key];
	if (details.method === 'OPTIONS' && !record) {
		record = {
			rule: rule,
			origin: h_origin.value,
			acrh_omitted: null
		};
		let ret = handlePreflightRequest(details, record, rule, headers);
		if (ret && !ret.cancel) {
			Preflights[key] = record;
		}
		return ret;
	} else {
		if (record) {
			delete Preflights[key];
		} else {
			record = {
				rule: rule,
				origin: h_origin.value,
				acrh_omitted: null
			};
		}
		let ret =  handleRequest(details, record, rule, headers);
		if (ret && !ret.cancel) {
			Requests[details.requestId] = record;
		}
		return ret;
	}
}, {
	urls: ['<all_urls>']
}, [
	'blocking',
	'requestHeaders'
]);

browser.webRequest.onHeadersReceived.addListener(function(details) {
	if (!details.responseHeaders) {
		return;
	}

	let record;
	if (details.method === 'OPTIONS') {
		let key = hashDetails(details);
		record = Preflights[key];
		if (record) {
			isPreflight = true;
		}
	}
	if (!record) {
		record = Requests[details.requestId];
		if (!record) {
			return;
		}
		delete Requests[details.requestId];
	}

	let headers = _digestHeaders(details.responseHeaders, [
		'access-control-allow-origin', 'access-control-expose-headers',
		'access-control-allow-credentials', 'access-control-allow-methods',
		'access-control-allow-headers'
	]);

	if (isPreflight) {
		return handlePreflightResponse(details, record.rule, headers);
	} else {
		return handleResponse(details, record.rule, headers);
	}
}, {
	urls: ['<all_urls>']
}, [
	'blocking',
	'responseHeaders'
]);

browser.runtime.onMessage.addListener(async function(message, sender) {
	let { topic, data } = message;

	if (topic === 'ccc_get_rules') {
		return JSON.stringify(Rules);
	} else if (topic === 'ccc_set_rules') {
		return await setRules(data);
	} else if (topic === 'ccc_read_storage') {
		return await readRulesFromStorage();
	} else if (topic === 'ccc_clear_storage') {
		return await clearStorage();
	}

});

readRulesFromStorage();

// --------------------------------------------------

/**
 * @typedef {Object} HttpHeader
 * @property {string} name
 * @property {string} [value]
 * @property {number[]} [binaryValue]
 */

 /**
  * @param {HttpHeader[]} headers
  * @param {HttpHeader} header
  * @param {string} name
  */
function _setHeader(headers, header, name, value) {
	if (header) {
		header.value = value;
	} else {
		headers.push({
			name: name,
			value: value
		});
	}
}

/**
 * @param {HttpHeader[]} headers
 * @param {string[]} names
 */
function _removeHeaders(headers, names) {
	for (let i = 0, l1 = names.length; i < l1; i++) {
		let name = names[i];
		for (let j = 0, l2 = headers.length; j < l2; j++) {
			let header = headers[j];
			if (header.name.toLowerCase() === name) {
				headers.splice(j, 1);
				j--;
				l2--;
			}
		}
	}
}

/**
 * @param {HttpHeader[]} headers details.___headers
 * @param {string[]} interests Array of lower-cased header names
 * @return {HttpHeader[]} Array of HttpHeader, ordered by *interests*
 */
function _digestHeaders(headers, interests) {
	let ret = [];
	for (let header of headers) {
		let index = interests.indexOf(header.name.toLowerCase());
		if (index === -1) {
			continue;
		}

		ret[index] = header;
	}
	return ret;
}

/**
 * @param {Array} A Array A
 * @param {any} x Element to remove
 * @returns {Array} Array A
 */
function _removeFromArray(A, x) {
	for (let i = A.indexOf(x); i !== -1; i = A.indexOf(x, i)) {
		A.splice(i, 1);
	}
	return A;
}
/**
 * @param {Array} A Array A
 * @param {Array} B Array B
 * @returns {Array} Intersection
 */
function _intersect(A, B) {
	let Y = [];
	if (B.length === 0) {
		return Y;
	}
	for (let i = 0, l = A.length; i < l; i++) {
		let x = A[i];
		if (B.includes(x)) {
			Y.push(x);
		}
	}
	return Y;
}
/**
 * @param {Array} S Array S
 * @param {Array} U Array U
 * @returns {Array} Complement
 */
function _complement(S, U) {
	if (S.length === 0) {
		return U.slice();
	}
	let Y = [];
	for (let i = 0, l = U.length; i < l; i++) {
		let x = U[i];
		if (!S.includes(x)) {
			Y.push(x);
		}
	}
	return Y;
}