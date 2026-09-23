'use strict';
/* eslint-disable linebreak-style */

const rawChalk = require('chalk');
const chalk = (rawChalk && rawChalk.default) ? rawChalk.default : rawChalk;
const isHexcolor = (color) => typeof color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
var getText = function(/** @type {string[]} */ ...Data) {
	var Main = (Data.splice(0,1)).toString();
		for (let i = 0; i < Data.length; i++) Main = Main.replace(RegExp(`%${i + 1}`, 'g'), Data[i]);
	return Main;
};
/**
 * @param {any} obj
 */
function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function safeHex(color, text) {
	try {
		if (typeof chalk.hex === 'function' && isHexcolor(color)) {
			return chalk.hex(color)(text);
		}
		if (typeof chalk.cyan === 'function') {
			return chalk.cyan(text);
		}
	} catch (_) {}
	return text;
}

module.exports = {
	Normal: function(/** @type {string} */ Str, /** @type {() => any} */ Data ,/** @type {() => void} */ Callback) {
		try {
			const tag = `${(global.Fca?.Require?.Priyansh?.MainName) || '[ FCA-HZI ]'} > `;
			const prefix = safeHex(global.Fca?.Require?.Priyansh?.MainColor || '#9900FF', tag);
			console.log(prefix + Str);
		} catch (_) {
			console.log('[ FCA ] > ' + Str);
		}
		if (getType(Data) == 'Function' || getType(Data) == 'AsyncFunction') {
			return Data();
		}
		if (Data) {
			return Data;
		}
		if (getType(Callback) == 'Function' || getType(Callback) == 'AsyncFunction') {
			Callback();
		}
		else return Callback;
	},
	Warning: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
		try {
			const prefix = (chalk.magenta && chalk.magenta.bold) ? chalk.magenta.bold('[ FCA-WARNING ] > ') : '[ FCA-WARNING ] > ';
			const body = chalk.yellow ? chalk.yellow(str) : String(str);
			console.log(prefix + body);
		} catch (_) {
			console.log('[ FCA-WARNING ] > ' + str);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Error: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
		try {
			const prefix = (chalk.magenta && chalk.magenta.bold) ? chalk.magenta.bold('[ FCA-ERROR ] > ') : '[ FCA-ERROR ] > ';
			const body = chalk.red ? chalk.red(str || "Already Faulty, Please Contact: Facebook.com/Priyanhu.Rajput.official") : String(str || "");
			console.log(prefix + body);
		} catch (_) {
			console.log('[ FCA-ERROR ] > ' + str);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Success: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
		try {
			const tag = `${(global.Fca?.Require?.Priyansh?.MainName) || '[ FCA-HZI ]'} > `;
			const prefix = safeHex('#9900FF', tag);
			const body = chalk.green ? chalk.green(str) : String(str);
			console.log(prefix + body);
		} catch (_) {
			console.log('[ FCA-SUCCESS ] > ' + str);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Info: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
		try {
			const tag = `${(global.Fca?.Require?.Priyansh?.MainName) || '[ FCA-HZI ]'} > `;
			const prefix = safeHex('#9900FF', tag);
			const body = chalk.blue ? chalk.blue(str) : String(str);
			console.log(prefix + body);
		} catch (_) {
			console.log('[ FCA-INFO ] > ' + str);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	}
};
