const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");
const { Jimp } = require("jimp");
const { Readable } = require("stream");
const axios = require("axios");

let deltaNext = 5;
const expToLevel = (exp, delta = deltaNext) => Math.floor((1 + Math.sqrt(1 + 8 * exp / delta)) / 2);
const levelToExp = (level, delta = deltaNext) => Math.floor(((Math.pow(level, 2) - level) * delta) / 2);

function roundRect(ctx, x, y, width, height, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

async function makeRankCard(userID, usersData, threadsData, threadID, delta = 5, api = global.GoatBot?.fcaApi) {
	const userRecord = await usersData.get(userID).catch(() => ({}));
	const exp = typeof userRecord?.exp === "number" && !isNaN(userRecord.exp) ? userRecord.exp : 0;
	const name = userRecord?.name || `User ${userID}`;

	const levelUser = expToLevel(exp, delta);
	const expNextLevel = levelToExp(levelUser + 1, delta) - levelToExp(levelUser, delta);
	const currentExp = Math.max(0, exp - levelToExp(levelUser, delta));
	const progressRatio = expNextLevel > 0 ? Math.min(1, currentExp / expNextLevel) : 1;
	const percent = Math.round(progressRatio * 100);

	const allUsers = (await usersData.getAll().catch(() => [])) || [];
	allUsers.sort((a, b) => (b.exp || 0) - (a.exp || 0));
	let rank = allUsers.findIndex(u => String(u.userID) === String(userID)) + 1;
	if (rank <= 0) rank = allUsers.length + 1;

	// Fallback to Jimp if native canvas is unavailable
	if (!isCanvasAvailable || typeof createCanvas !== "function") {
		try {
			const card = new Jimp({ width: 800, height: 240, color: 0x0a0b12ff });
			try {
				const avatarUrl = await usersData.getAvatarUrl(userID);
				if (avatarUrl) {
					const av = await Jimp.read(avatarUrl);
					av.resize({ w: 140, h: 140 });
					av.circle();
					card.composite(av, 40, 50);
				}
			} catch (_) {}
			const buf = await card.getBuffer("image/png");
			const stream = Readable.from(buf);
			stream.path = `rank_${userID}.png`;
			return stream;
		} catch (jimpErr) {
			console.warn("[RANK] Jimp fallback card error:", jimpErr.message);
			return null;
		}
	}

	// Create Canvas
	const width = 1000;
	const height = 300;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	// 1. Dark Obsidian Background
	ctx.fillStyle = "#0a0b12";
	ctx.fillRect(0, 0, width, height);

	// 2. Ambient Glow Spheres
	const gAvatar = ctx.createRadialGradient(140, 150, 10, 140, 150, 170);
	gAvatar.addColorStop(0, "rgba(0, 242, 254, 0.35)");
	gAvatar.addColorStop(1, "rgba(0, 242, 254, 0)");
	ctx.fillStyle = gAvatar;
	ctx.beginPath();
	ctx.arc(140, 150, 170, 0, Math.PI * 2);
	ctx.fill();

	const gAccent = ctx.createRadialGradient(860, 75, 10, 860, 75, 200);
	gAccent.addColorStop(0, "rgba(121, 40, 202, 0.35)");
	gAccent.addColorStop(1, "rgba(121, 40, 202, 0)");
	ctx.fillStyle = gAccent;
	ctx.beginPath();
	ctx.arc(860, 75, 200, 0, Math.PI * 2);
	ctx.fill();

	// 3. Inner Glassmorphic Container
	roundRect(ctx, 16, 16, width - 32, height - 32, 24);
	ctx.fillStyle = "rgba(18, 22, 36, 0.78)";
	ctx.fill();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
	ctx.lineWidth = 1.5;
	ctx.stroke();

	// 4. Draw Avatar with Glowing Ring
	const avatarX = 135;
	const avatarY = 150;
	const avatarR = 68;

	let avatarImg = null;
	try {
		const avatarUrl = await usersData.getAvatarUrl(userID).catch(() => null);
		if (avatarUrl) {
			const res = await axios.get(avatarUrl, {
				responseType: "arraybuffer",
				timeout: 5000,
				headers: { "User-Agent": "Mozilla/5.0" }
			}).catch(() => null);
			if (res?.data) {
				avatarImg = await loadImage(Buffer.from(res.data)).catch(() => null);
			}
		}
	} catch (_) {}

	ctx.save();
	// Glowing outer ring
	ctx.beginPath();
	ctx.arc(avatarX, avatarY, avatarR + 4, 0, Math.PI * 2);
	const ringGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
	ringGrad.addColorStop(0, "#00f2fe");
	ringGrad.addColorStop(0.5, "#4facfe");
	ringGrad.addColorStop(1, "#7928ca");
	ctx.strokeStyle = ringGrad;
	ctx.lineWidth = 4;
	ctx.shadowColor = "#00f2fe";
	ctx.shadowBlur = 12;
	ctx.stroke();
	ctx.restore();

	// Clip circular avatar
	ctx.save();
	ctx.beginPath();
	ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();

	if (avatarImg) {
		ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
	} else {
		// Fallback initials avatar
		ctx.fillStyle = "#1e293b";
		ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 44px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(name.charAt(0).toUpperCase() || "U", avatarX, avatarY);
	}
	ctx.restore();

	// 5. User Name
	ctx.save();
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 32px sans-serif";
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
	ctx.shadowBlur = 6;
	let displayName = name;
	if (ctx.measureText(displayName).width > 360) {
		while (ctx.measureText(displayName + "...").width > 360 && displayName.length > 0) {
			displayName = displayName.slice(0, -1);
		}
		displayName += "...";
	}
	ctx.fillText(displayName, 245, 95);
	ctx.restore();

	// 6. Badges: Rank & Level
	// Rank Badge Pill
	roundRect(ctx, 640, 52, 145, 40, 12);
	const rankGrad = ctx.createLinearGradient(640, 52, 785, 92);
	rankGrad.addColorStop(0, "#f59e0b");
	rankGrad.addColorStop(1, "#d97706");
	ctx.fillStyle = rankGrad;
	ctx.fill();
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 16px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(`🏆 RANK #${rank}`, 712, 72);

	// Level Badge Pill
	roundRect(ctx, 800, 52, 150, 40, 12);
	const lvlGrad = ctx.createLinearGradient(800, 52, 950, 92);
	lvlGrad.addColorStop(0, "#7928ca");
	lvlGrad.addColorStop(1, "#ff0080");
	ctx.fillStyle = lvlGrad;
	ctx.fill();
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 16px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(`⚡ LEVEL ${levelUser}`, 875, 72);

	// 7. Progress Labels
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	ctx.fillStyle = "#94a3b8";
	ctx.font = "600 16px sans-serif";
	ctx.fillText(`EXP: ${currentExp.toLocaleString()} / ${expNextLevel.toLocaleString()}`, 245, 178);

	ctx.textAlign = "right";
	ctx.fillStyle = "#00f2fe";
	ctx.font = "bold 17px sans-serif";
	ctx.fillText(`${percent}%`, 950, 178);

	// 8. Progress Bar
	const barX = 245;
	const barY = 195;
	const barWidth = 705;
	const barHeight = 24;
	const barRadius = 12;

	// Track background
	roundRect(ctx, barX, barY, barWidth, barHeight, barRadius);
	ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
	ctx.fill();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
	ctx.lineWidth = 1;
	ctx.stroke();

	// Progress Fill
	const fillWidth = Math.max(barRadius * 2, Math.min(barWidth, Math.round(barWidth * progressRatio)));
	roundRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
	const fillGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
	fillGrad.addColorStop(0, "#00f2fe");
	fillGrad.addColorStop(0.5, "#4facfe");
	fillGrad.addColorStop(1, "#7928ca");
	ctx.fillStyle = fillGrad;
	ctx.shadowColor = "#00f2fe";
	ctx.shadowBlur = 8;
	ctx.fill();

	const buffer = canvas.toBuffer("image/png");
	const stream = Readable.from(buffer);
	stream.path = `rank_${userID}.png`;
	return stream;
}

if (!global.client) global.client = {};
global.client.makeRankCard = makeRankCard;

module.exports = {
	config: {
		name: "rank",
		version: "2.0.0",
		author: "frnAlt",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem thẻ rank level đẹp mắt của bạn hoặc người được tag/reply",
			en: "View stylish rank level card for yourself, replied user, or tagged users"
		},
		category: "rank",
		guide: {
			vi: "   {pn} [để trống | @tags | reply tin nhắn | UID]",
			en: "   {pn} [empty | @tags | reply message | UID]"
		},
		envConfig: {
			deltaNext: 5
		}
	},

	onStart: async function ({ message, event, usersData, threadsData, commandName, envCommands, api, args }) {
		deltaNext = envCommands?.[commandName]?.deltaNext || 5;
		let targetUsers = [];

		const arrayMentions = Object.keys(event.mentions || {});
		if (arrayMentions.length > 0) {
			targetUsers = arrayMentions;
		} else if (event.messageReply) {
			const replySender = event.messageReply.senderID || event.messageReply.actorFbId;
			if (replySender) targetUsers = [String(replySender)];
			else targetUsers = [event.senderID];
		} else if (args[0] && /^\d+$/.test(args[0])) {
			targetUsers = [args[0]];
		} else {
			targetUsers = [event.senderID];
		}

		try {
			if (!isCanvasAvailable || typeof createCanvas !== "function") {
				for (const userID of targetUsers) {
					const userRecord = await usersData.get(userID).catch(() => ({}));
					const exp = typeof userRecord?.exp === "number" && !isNaN(userRecord.exp) ? userRecord.exp : 0;
					const name = userRecord?.name || `User ${userID}`;
					const levelUser = expToLevel(exp, deltaNext);
					const currentLevelExp = levelToExp(levelUser, deltaNext);
					const nextLevelExp = levelToExp(levelUser + 1, deltaNext);
					const expNeed = nextLevelExp - currentLevelExp;
					const currentProgress = exp - currentLevelExp;
					const percent = Math.min(100, Math.max(0, Math.floor((currentProgress / (expNeed || 1)) * 100)));

					const allUsers = (await usersData.getAll().catch(() => [])) || [];
					allUsers.sort((a, b) => (b.exp || 0) - (a.exp || 0));
					let rank = allUsers.findIndex(u => String(u.userID) === String(userID)) + 1;
					if (rank <= 0) rank = allUsers.length + 1;

					const filledBlocks = Math.round(percent / 10);
					const emptyBlocks = 10 - filledBlocks;
					const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

					const cardBody = 
						`╔════════════ 🏆 RANK PROFILE ════════════╗\n` +
						`👤 Member: ${name}\n` +
						`🎖️ Global Rank: #${rank} | ⚡ Level: ${levelUser}\n` +
						`📊 Progress: [${progressBar}] ${percent}%\n` +
						`✨ EXP: ${exp.toLocaleString()} / ${nextLevelExp.toLocaleString()}\n` +
						`╚════════════════════════════════════════╝`;

					let avatarStream = null;
					try {
						const avatarUrl = await usersData.getAvatarUrl(userID);
						avatarStream = await global.utils.getStreamFromURL(avatarUrl, `avatar_${userID}.jpg`).catch(() => null);
					} catch (_) {}

					await message.reply({
						body: cardBody,
						...(avatarStream ? { attachment: avatarStream } : {})
					});
				}
				return;
			}

			const rankCards = await Promise.all(targetUsers.map(async userID => {
				return await makeRankCard(userID, usersData, threadsData, event.threadID, deltaNext, api);
			}));

			return message.reply({
				attachment: rankCards.filter(Boolean)
			});
		} catch (err) {
			console.error("[RANK CARD ERROR]:", err);
			for (const userID of targetUsers) {
				try {
					const userRecord = await usersData.get(userID).catch(() => ({}));
					const exp = typeof userRecord?.exp === "number" && !isNaN(userRecord.exp) ? userRecord.exp : 0;
					const name = userRecord?.name || `User ${userID}`;
					const levelUser = expToLevel(exp, deltaNext);
					const currentLevelExp = levelToExp(levelUser, deltaNext);
					const nextLevelExp = levelToExp(levelUser + 1, deltaNext);
					const expNeed = nextLevelExp - currentLevelExp;
					const currentProgress = exp - currentLevelExp;
					const percent = Math.min(100, Math.max(0, Math.floor((currentProgress / (expNeed || 1)) * 100)));

					const allUsers = (await usersData.getAll().catch(() => [])) || [];
					allUsers.sort((a, b) => (b.exp || 0) - (a.exp || 0));
					let rank = allUsers.findIndex(u => String(u.userID) === String(userID)) + 1;
					if (rank <= 0) rank = allUsers.length + 1;

					const filledBlocks = Math.round(percent / 10);
					const emptyBlocks = 10 - filledBlocks;
					const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

					const cardBody = 
						`╔════════════ 🏆 RANK PROFILE ════════════╗\n` +
						`👤 Member: ${name}\n` +
						`🎖️ Global Rank: #${rank} | ⚡ Level: ${levelUser}\n` +
						`📊 Progress: [${progressBar}] ${percent}%\n` +
						`✨ EXP: ${exp.toLocaleString()} / ${nextLevelExp.toLocaleString()}\n` +
						`╚════════════════════════════════════════╝`;

					const avatarUrl = await usersData.getAvatarUrl(userID).catch(() => `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
					const avatarStream = await global.utils.getStreamFromURL(avatarUrl, `avatar_${userID}.jpg`).catch(() => null);

					await message.reply({
						body: cardBody,
						...(avatarStream ? { attachment: avatarStream } : {})
					});
				} catch (_) {}
			}
		}
	},

	onChat: async function ({ usersData, event }) {
		if (!event.senderID || isNaN(event.senderID)) return;
		try {
			const user = await usersData.get(event.senderID).catch(() => null);
			let exp = typeof user?.exp === "number" && !isNaN(user.exp) ? user.exp : 0;
			await usersData.set(event.senderID, {
				exp: exp + 1
			});
		} catch (_) {}
	}
};
