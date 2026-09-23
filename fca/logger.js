'use strict';
/* eslint-disable linebreak-style */

const rawChalk = require('chalk');
const chalk = (rawChalk && rawChalk.default) ? rawChalk.default : rawChalk;
const moment = require('moment-timezone');

function getCurrentTime() {
	const tz = global.GoatBot?.config?.timeZone || global.FloppaBot?.config?.timeZone || "Asia/Dhaka";
	try {
		const str = moment().tz(tz).format("HH:mm:ss DD/MM/YYYY");
		return chalk.gray ? chalk.gray(str) : str;
	} catch (_) {
		const str = moment().format("HH:mm:ss DD/MM/YYYY");
		return chalk.gray ? chalk.gray(str) : str;
	}
}

function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

// Patterns of noisy Priyansh FCA messages to suppress so output remains clean and beautiful
const SPAM_PATTERNS = [
	/Start the Login Process/i,
	/Not Ready To Solve Appstate/i,
	/Encrypt State Off/i,
	/Successfully Appstate Solved/i,
	/Login as ID:/i,
	/Welcome To Server:/i,
	/You Are Currently Using Version:/i,
	/0 Hours/i,
	/Good luck/i,
	/You Are Using Version: Premium Access/i,
	/Auto Restart MQTT Client After: 0 Minutes/i,
	/Can't get account area but fca ignores it/i,
	/Currently logged/i,
	/This feature is only for Replit/i,
	/ExtraUpTime/i
];

function isSpam(str) {
	if (!str || typeof str !== 'string') return false;
	return SPAM_PATTERNS.some(rx => rx.test(str));
}

function getPrefix(level) {
	const name = "FLOPPA-NATIVE";
	switch (level) {
		case 'warn':
			return chalk.yellowBright ? chalk.yellowBright(`${name} WARN:`) : `${name} WARN:`;
		case 'error':
			return chalk.redBright ? chalk.redBright(`${name} ERR:`) : `${name} ERR:`;
		case 'success':
			return chalk.greenBright ? chalk.greenBright(`${name}:`) : `${name}:`;
		case 'info':
		case 'normal':
		default:
			return chalk.cyanBright ? chalk.cyanBright(`${name}:`) : `${name}:`;
	}
}

module.exports = {
	Normal: function(Str, Data, Callback) {
		if (Str && !isSpam(String(Str))) {
			console.log(`${getCurrentTime()} ${getPrefix('normal')} ${Str}`);
		}
		if (getType(Data) == 'Function' || getType(Data) == 'AsyncFunction') {
			return Data();
		}
		if (Data !== undefined) {
			return Data;
		}
		if (getType(Callback) == 'Function' || getType(Callback) == 'AsyncFunction') {
			Callback();
		}
		else return Callback;
	},
	Warning: function(str, callback) {
		if (str && !isSpam(String(str))) {
			console.log(`${getCurrentTime()} ${getPrefix('warn')} ${str}`);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Error: function(str, callback) {
		if (str && !isSpam(String(str))) {
			console.log(`${getCurrentTime()} ${getPrefix('error')} ${str}`);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Success: function(str, callback) {
		if (str && !isSpam(String(str))) {
			console.log(`${getCurrentTime()} ${getPrefix('success')} ${str}`);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Info: function(str, callback) {
		if (str && !isSpam(String(str))) {
			console.log(`${getCurrentTime()} ${getPrefix('info')} ${str}`);
		}
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	}
};
