const axios = require("axios");

const DEFAULT_DESKTOP_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.182 Safari/537.36";
const DEFAULT_MOBILE_AGENT = "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";

/**
 * Validates whether a cookie/appState session is alive on Facebook without triggering security flags.
 * @param {string} cookie Cookie string format
 * @param {string} userAgent Custom Mobile or Desktop User-Agent
 * @returns {Promise<Boolean>}
 */
module.exports = async function (cookie, userAgent) {
	try {
		const ua = userAgent || DEFAULT_DESKTOP_AGENT;
		const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
		const targetUrl = isMobile ? "https://mbasic.facebook.com/" : "https://www.facebook.com/";

		const headers = {
			cookie,
			"user-agent": ua,
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
			"accept-language": "en-US,en;q=0.9",
			"sec-ch-ua-mobile": isMobile ? "?1" : "?0",
			"sec-fetch-dest": "document",
			"sec-fetch-mode": "navigate",
			"sec-fetch-site": "none",
			"upgrade-insecure-requests": "1"
		};

		const response = await axios({
			url: targetUrl,
			method: "GET",
			maxRedirects: 5,
			headers,
			validateStatus: () => true,
			timeout: 15000
		});

		const finalUrl = response.request?.res?.responseUrl || "";
		if (finalUrl.includes("/checkpoint/")) {
			const checkpointMatch = finalUrl.match(/\/checkpoint\/(\d+)/);
			const checkpointId = checkpointMatch ? checkpointMatch[1] : "unknown";
			throw Object.assign(new Error(`Account checkpoint restriction (ID: ${checkpointId}). Please resolve on Facebook before running bot.`), { name: "CHECKPOINT_ERROR", checkpointId });
		}

		const dataStr = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");

		if (dataStr.includes("/checkpoint/")) {
			throw Object.assign(new Error("Account checkpoint restriction. Please log into Facebook to verify account."), { name: "CHECKPOINT_ERROR" });
		}

		// Extract c_user from cookie string to check if the response acknowledges this user
		const cUserMatch = cookie.match(/c_user=(\d+)/);
		const currentUserId = cUserMatch ? cUserMatch[1] : "";

		const isLoggedIn =
			(currentUserId && (dataStr.includes(`"USER_ID":"${currentUserId}"`) || dataStr.includes(`c_user=${currentUserId}`))) ||
			dataStr.includes('"USER_ID"') ||
			dataStr.includes('"actorID"') ||
			dataStr.includes('"ACCOUNT_ID"') ||
			dataStr.includes('action="/logout.php"') ||
			dataStr.includes('name="fb_dtsg"') ||
			dataStr.includes('/privacy/') ||
			dataStr.includes('/notifications') ||
			dataStr.includes('href="/login/save-password');

		const isLoggedOut =
			!isLoggedIn &&
			(dataStr.includes('id="login_form"') ||
			 dataStr.includes('id="loginbutton"') ||
			 finalUrl.includes("/login/"));

		return isLoggedIn && !isLoggedOut;
	}
	catch (e) {
		if (e.name === "CHECKPOINT_ERROR") {
			throw e;
		}
		return false;
	}
};