/**
 * @file ccc/options.js
 * @license MIT
 * @version 1
 */
'use strict';

// --------------------------------------------------

let _getRulesToTextarea = function(textarea) {
	return browser.runtime.sendMessage({
		topic: 'ccc_get_rules'
	}).then(function(json) {
		let parsed = JSON.parse(json);
		textarea.value = JSON.stringify(parsed, null, '  ');
	});
};
let _setRulesFromTextarea = function(textarea) {
	return browser.runtime.sendMessage({
		topic: 'ccc_set_rules',
		data: textarea.value
	});
};

// --------------------------------------------------

let txtJSON = document.getElementById('txtJSON');

let btnSave = document.getElementById('btnSave');
btnSave.addEventListener('click', function(event) {
	_setRulesFromTextarea(txtJSON);
}, {
	capture: false,
	once: false,
	passive: true
});

let btnReload = document.getElementById('btnReload');
btnReload.addEventListener('click', function(event) {
	browser.runtime.sendMessage({
		topic: 'ccc_read_storage'
	}).then(function() {
		return _getRulesToTextarea(txtJSON);
	});
}, {
	capture: false,
	once: false,
	passive: true
});

let btnReset = document.getElementById('btnReset');
btnReset.addEventListener('click', function(event) {
	browser.runtime.sendMessage({
		topic: 'ccc_clear_storage'
	}).then(function() {
		return _getRulesToTextarea(txtJSON);
	});
}, {
	capture: false,
	once: false,
	passive: true
});

_getRulesToTextarea(txtJSON);
