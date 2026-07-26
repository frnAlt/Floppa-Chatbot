const axios = require("axios");

const DEFAULT_MOBILE_AGENT = 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36';

/**
 * Validates whether a cookie/appState session is alive on Facebook
 * @param {string} cookie Cookie string format
 * @param {string} userAgent Custom Mobile or Desktop User-Agent
 * @returns {Promise<Boolean>}
 */
module.exports = async function (cookie, userAgent) {
	try {
		const ua = userAgent || DEFAULT_MOBILE_AGENT;
		const response = await axios({
			url: 'https://mbasic.facebook.com/settings',
			method: "GET",
			maxRedirects: 5,
			headers: {
				cookie,
				"user-agent": ua,
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"accept-language": "en-US,en;q=0.9",
				"sec-ch-ua-mobile": "?1",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"upgrade-insecure-requests": "1"
			}
		});

		if (response.request && response.request.res && response.request.res.responseUrl) {
			const finalUrl = response.request.res.responseUrl;
			if (finalUrl.includes('/checkpoint/')) {
				const checkpointMatch = finalUrl.match(/\/checkpoint\/(\d+)/);
				const checkpointId = checkpointMatch ? checkpointMatch[1] : 'unknown';
				throw Object.assign(new Error(`Account checkpoint restriction (ID: ${checkpointId}). Please resolve on Facebook before running bot.`), { name: 'CHECKPOINT_ERROR', checkpointId });
			}
		}

		if (typeof response.data === "string" && response.data.includes('/checkpoint/')) {
			throw Object.assign(new Error('Account checkpoint restriction. Please log into Facebook to verify account.'), { name: 'CHECKPOINT_ERROR' });
		}

		return response.data.includes('/privacy/') || response.data.includes('/notifications') || response.data.includes('href="/login/save-password') || response.data.includes('c_user=');
	}
	catch (e) {
		if (e.name === 'CHECKPOINT_ERROR') {
			throw e;
		}
		return false;
	}
};