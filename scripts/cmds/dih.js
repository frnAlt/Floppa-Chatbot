/**
 * @author frnAlt & Gtajisan
 * Dih Grower Game Command (scripts/cmds/dih.js)
 * 
 * Ported from the Telegram DickGrowerBot (https://github.com/kozalosev/DickGrowerBot):
 * - Daily dih growth roll once every 24 hours (-10 to +30 cm)
 * - Consecutive streak multiplier (+5 per day up to 20 days)
 * - Chat & Global leaderboards (top)
 * - Daily election of the Dih of the Day (bonus centimeters)
 * - Dih Fight (PVP duel with bets in cm, tag or tap-to-reply)
 * - Dih Loan (debt relief resetting negative lengths to 0 cm on credit)
 * - Dih Passport / Profile stats
 * - Admin length import/migration
 * 
 * Replaces all sensitive keywords with "dih" to bypass bad-word filters safely.
 */

"use strict";

const path = require("path");
const { readJSONSafe, writeJSONSafeSync } = require(path.join(process.cwd(), "database/controller/safeStorage.js"));

const DB_FILE = path.join(process.cwd(), "database/data/dihData.json");
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STREAK_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

// Helper to access safe persistent database
function getDihData() {
    return readJSONSafe(DB_FILE, { threads: {} });
}

function saveDihData(data) {
    writeJSONSafeSync(DB_FILE, data);
}

function getThreadDih(data, threadID) {
    if (!data.threads) data.threads = {};
    if (!data.threads[threadID]) {
        data.threads[threadID] = {
            users: {},
            lastDotd: null
        };
    }
    return data.threads[threadID];
}

function getUserDih(threadDih, userID, name = "Unknown") {
    if (!threadDih.users) threadDih.users = {};
    if (!threadDih.users[userID]) {
        threadDih.users[userID] = {
            name: name,
            length: 0,
            streak: 0,
            lastGrow: 0,
            lastGrowDelta: 0,
            totalGrows: 0,
            fightsWon: 0,
            fightsLost: 0,
            debt: 0,
            dotdCount: 0
        };
    } else if (name && name !== "Unknown" && threadDih.users[userID].name !== name) {
        threadDih.users[userID].name = name;
    }
    return threadDih.users[userID];
}

function getRankings(threadDih) {
    const list = Object.entries(threadDih.users || {}).map(([id, u]) => ({
        id,
        name: u.name || `User ${id}`,
        length: typeof u.length === "number" ? u.length : 0,
        streak: u.streak || 0,
        lastGrow: u.lastGrow || 0,
        totalGrows: u.totalGrows || 0,
        fightsWon: u.fightsWon || 0,
        fightsLost: u.fightsLost || 0,
        debt: u.debt || 0,
        dotdCount: u.dotdCount || 0
    }));
    list.sort((a, b) => b.length - a.length);
    return list;
}

module.exports = {
    config: {
        name: "dih",
        aliases: ["grow", "dihgrow", "dihfight"],
        version: "1.0.0",
        author: "frnAlt",
        countDown: 2,
        role: 0,
        shortDescription: {
            en: "Grow your dih daily, battle in PVP fights, and climb the leaderboard!"
        },
        longDescription: {
            en: "A complete port of the popular Telegram DickGrowerBot. Measure & grow your dih once every 24 hours (-10 to +30 cm) with streak multipliers, challenge friends in Dih Fights, elect Dih of the Day, take emergency loans, and top the leaderboard."
        },
        category: "game",
        guide: {
            en: "{pn} [grow] — Measure & grow your dih once every 24h\n" +
                "{pn} top [global] — View chat or global top dihs\n" +
                "{pn} fight <cm> [@user / reply] — Challenge someone to a dih duel\n" +
                "{pn} ofday — Elect or view today's crowned Dih of the Day\n" +
                "{pn} loan — Reset negative length to 0 cm on credit\n" +
                "{pn} stats [@user / reply] — View player dih stats and rank\n" +
                "{pn} import <cm> [@user / reply] — Admin import/adjust dihs\n" +
                "{pn} help — Display game rules and instructions"
        }
    },

    onStart: async function ({ api, event, args, message, usersData }) {
        const senderID = String(event.senderID);
        const senderName = (await usersData.getName(senderID).catch(() => null)) || `User ${senderID}`;
        const threadID = String(event.threadID);

        const dihData = getDihData();
        const threadDih = getThreadDih(dihData, threadID);
        const user = getUserDih(threadDih, senderID, senderName);

        const subCmd = (args[0] || "").toLowerCase();

        // ──────────────── 1. LEADERBOARD (top) ────────────────
        if (subCmd === "top" || subCmd === "leaderboard" || subCmd === "rank") {
            const isGlobal = (args[1] || "").toLowerCase() === "global";

            if (isGlobal) {
                const globalUsers = new Map();
                for (const t of Object.values(dihData.threads || {})) {
                    for (const [uid, u] of Object.entries(t.users || {})) {
                        const existing = globalUsers.get(uid);
                        if (!existing || (u.length || 0) > existing.length) {
                            globalUsers.set(uid, { ...u, id: uid });
                        }
                    }
                }
                const globalRankings = Array.from(globalUsers.values()).sort((a, b) => b.length - a.length);
                if (globalRankings.length === 0) {
                    return message.reply("🌱 No dihs have grown across the entire network yet! Type '!dih' to be the first.");
                }

                const medals = ["🥇", "🥈", "🥉"];
                let msg = `🌍 ═══ GLOBAL TOP DIHS ═══ 🌍\n\n`;
                const topCount = Math.min(10, globalRankings.length);
                for (let i = 0; i < topCount; i++) {
                    const p = globalRankings[i];
                    const medal = medals[i] || `${i + 1}.`;
                    const streakStr = p.streak > 1 ? ` 🔥${p.streak}d` : "";
                    msg += `${medal} ${p.name} — ${p.length} cm${streakStr}\n`;
                }
                msg += `\n═════════════════════════\n`;
                const myGlobalRank = globalRankings.findIndex(r => r.id === senderID) + 1;
                if (myGlobalRank > 0) {
                    msg += `📏 Your global position: #${myGlobalRank}`;
                }
                return message.reply(msg);
            }

            const rankings = getRankings(threadDih);
            if (rankings.length === 0) {
                return message.reply("🌱 No dihs have grown in this chat yet! Type '!dih' to measure yours first.");
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const medals = ["🥇", "🥈", "🥉"];
            let msg = `🏆 ═══ TOP DIHS IN THIS CHAT ═══ 🏆\n\n`;
            const topCount = Math.min(10, rankings.length);
            for (let i = 0; i < topCount; i++) {
                const p = rankings[i];
                const medal = medals[i] || `${i + 1}.`;
                const streakStr = p.streak > 1 ? ` 🔥${p.streak}d` : "";
                const dotdStr = (threadDih.lastDotd?.winnerID === p.id && threadDih.lastDotd?.date === todayStr) ? " 👑" : "";
                msg += `${medal} ${p.name} — ${p.length} cm${streakStr}${dotdStr}\n`;
            }

            msg += `\n═════════════════════════\n`;
            const myRank = rankings.findIndex(r => r.id === senderID) + 1;
            if (myRank > 0 && user.totalGrows > 0) {
                msg += `📏 Your position in the top is ${myRank} (${user.length} cm)`;
            } else {
                msg += `💡 Type '!dih' to measure yours and enter the leaderboard!`;
            }
            return message.reply(msg);
        }

        // ──────────────── 2. DIH FIGHT (pvp / duel) ────────────────
        if (subCmd === "fight" || subCmd === "pvp" || subCmd === "duel" || event.commandName === "dihfight") {
            let opponentID = null;
            let opponentName = null;

            // Opponent from message reply
            if (event.messageReply && event.messageReply.senderID) {
                opponentID = String(event.messageReply.senderID);
            }
            // Opponent from mentions
            else if (event.mentions && Object.keys(event.mentions).length > 0) {
                opponentID = Object.keys(event.mentions)[0];
                opponentName = event.mentions[opponentID]?.replace(/^@/, "").trim();
            }
            // Opponent from args
            else {
                for (const a of args) {
                    if (/^\d{10,25}$/.test(a) && a !== senderID) {
                        opponentID = a;
                        break;
                    }
                }
            }

            // Parse bet amount
            let bet = null;
            for (const a of args) {
                const num = parseInt(a);
                if (!isNaN(num) && num > 0 && String(num) === a) {
                    bet = num;
                    break;
                }
            }

            if (!bet) {
                return message.reply(
                    "⚔️ Please specify a valid bet in centimeters!\n" +
                    "Example: !dih fight 15 @user or reply to someone's message with '!dih fight 15'"
                );
            }

            if (!opponentID) {
                return message.reply(
                    "⚔️ Please tag a user or reply to their message to challenge them to a Dih Fight!\n" +
                    "Example: !dih fight 10 @friend or reply with '!dih fight 10'"
                );
            }

            if (opponentID === senderID) {
                return message.reply("😅 You cannot fight your own dih!");
            }

            const botID = String(api.getCurrentUserID());
            if (opponentID === botID) {
                return message.reply("🤖 The bot has no physical dih to fight with!");
            }

            if (user.totalGrows === 0) {
                return message.reply("🌱 You haven't grown your dih yet! Type '!dih' to grow yours first.");
            }

            if (user.length < bet) {
                return message.reply(`❌ You only have ${user.length} cm! You cannot place a bet of ${bet} cm.`);
            }

            const opponentUser = threadDih.users[opponentID];
            if (!opponentUser || opponentUser.totalGrows === 0) {
                opponentName = opponentName || (await usersData.getName(opponentID).catch(() => null)) || `User ${opponentID}`;
                return message.reply(`❌ ${opponentName} has not grown their dih yet in this chat!`);
            }

            if (opponentUser.length < bet) {
                return message.reply(`❌ ${opponentUser.name} only has ${opponentUser.length} cm and cannot cover a bet of ${bet} cm.`);
            }

            opponentName = opponentName || opponentUser.name || (await usersData.getName(opponentID).catch(() => null)) || `User ${opponentID}`;

            const challengeMsg = await message.reply(
                `⚔️ ═══ DIH FIGHT CHALLENGE ═══ ⚔️\n\n` +
                `🤺 ${user.name} (${user.length} cm) challenged ${opponentName} (${opponentUser.length} cm) to a Dih Fight!\n` +
                `💰 Bet: ${bet} cm on the line!\n\n` +
                `👉 @${opponentName}, reply to this message with "accept" or "fight" to duel, or "decline" to forfeit.\n` +
                `⏳ Challenge expires in 60 seconds.`,
                [opponentID]
            );

            if (challengeMsg?.messageID && global.GoatBot?.onReply) {
                global.GoatBot.onReply.set(challengeMsg.messageID, {
                    commandName: "dih",
                    type: "dihFight",
                    challengerID: senderID,
                    challengerName: user.name,
                    opponentID: opponentID,
                    opponentName: opponentName,
                    bet: bet,
                    threadID: threadID,
                    messageID: challengeMsg.messageID,
                    timestamp: Date.now()
                });
            }
            return;
        }

        // ──────────────── 3. DIH OF THE DAY (ofday / dotd) ────────────────
        if (subCmd === "ofday" || subCmd === "dotd" || subCmd === "dihofday") {
            const todayStr = new Date().toISOString().slice(0, 10);

            if (threadDih.lastDotd && threadDih.lastDotd.date === todayStr) {
                const winner = threadDih.users[threadDih.lastDotd.winnerID];
                return message.reply(
                    `👑 ═══ DIH OF THE DAY ═══ 👑\n\n` +
                    `Today's crowned Dih of the Day in this chat is:\n` +
                    `✨ ${threadDih.lastDotd.winnerName} ✨\n\n` +
                    `🎁 Bonus awarded: +${threadDih.lastDotd.bonus} cm!\n` +
                    `📏 Current length: ${winner ? winner.length : "?"} cm\n` +
                    `⏰ Next election tomorrow!`
                );
            }

            // Only active players who grew in the last 7 days qualify
            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const eligible = Object.entries(threadDih.users || {}).filter(([_, u]) => {
                return u.lastGrow && u.lastGrow >= oneWeekAgo && u.totalGrows > 0;
            });

            if (eligible.length === 0) {
                return message.reply(
                    `🗳️ No eligible dihs for today's election!\n` +
                    `Players must have grown their dih at least once in the last 7 days.\n` +
                    `Type '!dih' to grow yours and qualify!`
                );
            }

            // Select random active winner
            const [winnerID, winnerUser] = eligible[Math.floor(Math.random() * eligible.length)];
            const bonus = Math.floor(Math.random() * 6) + 10; // +10 to +15 cm

            winnerUser.length = (winnerUser.length || 0) + bonus;
            winnerUser.dotdCount = (winnerUser.dotdCount || 0) + 1;

            threadDih.lastDotd = {
                date: todayStr,
                winnerID: winnerID,
                winnerName: winnerUser.name || `User ${winnerID}`,
                bonus: bonus,
                timestamp: Date.now()
            };

            saveDihData(dihData);

            return message.reply(
                `🌟 ═══ ELECTION: DIH OF THE DAY ═══ 🌟\n\n` +
                `🗳️ The votes are in and the ruler has spoken!\n` +
                `👑 Today's crowned Dih of the Day in this chat is:\n` +
                `✨ ${winnerUser.name} ✨\n\n` +
                `🎁 Bonus: +${bonus} cm awarded!\n` +
                `📏 Current length: ${winnerUser.length} cm\n` +
                `🥒 All hail today's mighty ruler!`
            );
        }

        // ──────────────── 4. LOAN (debt relief) ────────────────
        if (subCmd === "loan" || subCmd === "debt") {
            if (user.length >= 0) {
                return message.reply(
                    `🛡️ Your dih is currently ${user.length} cm!\n` +
                    `The Dih Bank only provides emergency loans for dihs stuck in the negative.`
                );
            }

            const debtAmount = Math.abs(user.length);
            user.debt = (user.debt || 0) + debtAmount;
            user.length = 0;
            saveDihData(dihData);

            return message.reply(
                `🏦 ═══ DIH EMERGENCY LOAN APPROVED ═══ 🏦\n\n` +
                `Your negative length (-${debtAmount} cm) has been reset to 0 cm on credit!\n` +
                `💳 Current outstanding debt: ${user.debt} cm\n\n` +
                `💡 50% of your future positive daily rolls will automatically go toward repaying this loan until fully cleared.`
            );
        }

        // ──────────────── 5. STATS / PASSPORT ────────────────
        if (subCmd === "stats" || subCmd === "me" || subCmd === "profile" || subCmd === "passport") {
            let targetID = senderID;
            let targetName = senderName;

            if (event.messageReply && event.messageReply.senderID) {
                targetID = String(event.messageReply.senderID);
                targetName = (await usersData.getName(targetID).catch(() => null)) || `User ${targetID}`;
            } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                targetID = Object.keys(event.mentions)[0];
                targetName = event.mentions[targetID]?.replace(/^@/, "").trim() || (await usersData.getName(targetID).catch(() => null)) || `User ${targetID}`;
            }

            const targetUser = threadDih.users[targetID];
            if (!targetUser || targetUser.totalGrows === 0) {
                return message.reply(`🌱 ${targetName} has not grown their dih yet in this chat! Type '!dih' to start.`);
            }

            const rankings = getRankings(threadDih);
            const rank = rankings.findIndex(r => r.id === targetID) + 1;
            const totalFights = (targetUser.fightsWon || 0) + (targetUser.fightsLost || 0);
            const winRate = totalFights > 0 ? Math.round(((targetUser.fightsWon || 0) / totalFights) * 100) : 0;

            let nextText = "Ready now! Type !dih to grow.";
            if (Date.now() - (targetUser.lastGrow || 0) < COOLDOWN_MS) {
                const rem = COOLDOWN_MS - (Date.now() - targetUser.lastGrow);
                const h = Math.floor(rem / (1000 * 60 * 60));
                const m = Math.floor((rem % (1000 * 60 * 60)) / (1000 * 60));
                nextText = `${h}h ${m}m`;
            }

            return message.reply(
                `🍆 ═══ DIH PASSPORT & STATS ═══ 🍆\n\n` +
                `👤 Player: ${targetName}\n` +
                `📏 Length: ${targetUser.length} cm\n` +
                `🏆 Chat Rank: #${rank} of ${rankings.length}\n` +
                `🔥 Daily Streak: ${targetUser.streak || 0} day(s)\n` +
                `🌱 Total Daily Rolls: ${targetUser.totalGrows || 0}\n` +
                `⚔️ Fight Record: ${targetUser.fightsWon || 0}W / ${targetUser.fightsLost || 0}L (${winRate}% winrate)\n` +
                `👑 Dih of the Day Titles: ${targetUser.dotdCount || 0}\n` +
                (targetUser.debt > 0 ? `💳 Outstanding Loan Debt: ${targetUser.debt} cm\n` : "") +
                `⏰ Next Daily Growth: ${nextText}\n` +
                `═══════════════════════════════`
            );
        }

        // ──────────────── 6. IMPORT / ADMIN ADJUST ────────────────
        if (subCmd === "import" || subCmd === "set") {
            const adminBot = global.GoatBot?.config?.adminBot || [];
            const isAdmin = adminBot.includes(senderID) || (global.db?.allUserData?.find(u => u.userID === senderID)?.role >= 1);
            if (!isAdmin) {
                return message.reply("⛔ Only group administrators or bot admins can import or adjust dih lengths!");
            }

            let targetID = null;
            if (event.messageReply && event.messageReply.senderID) {
                targetID = String(event.messageReply.senderID);
            } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                targetID = Object.keys(event.mentions)[0];
            } else if (args[2] && /^\d+$/.test(args[2])) {
                targetID = args[2];
            } else {
                targetID = senderID;
            }

            const cm = parseInt(args[1]);
            if (isNaN(cm)) {
                return message.reply("Usage: !dih import <cm> [@user / reply]");
            }

            const targetName = (await usersData.getName(targetID).catch(() => null)) || `User ${targetID}`;
            const targetUser = getUserDih(threadDih, targetID, targetName);
            targetUser.length = (targetUser.length || 0) + cm;
            targetUser.totalGrows = Math.max(1, targetUser.totalGrows || 1);
            saveDihData(dihData);

            return message.reply(`✅ Successfully imported +${cm} cm for ${targetName}! Their new length is ${targetUser.length} cm.`);
        }

        // ──────────────── 7. HELP GUIDE ────────────────
        if (subCmd === "help") {
            return message.reply(
                `🍆 ═══ DIH GROWER GAME GUIDE ═══ 🍆\n\n` +
                `A complete port of Telegram's DickGrowerBot — grow, duel, and conquer group chats!\n\n` +
                `📜 COMMANDS:\n` +
                `• !dih (or !dih grow) — Measure & grow your dih once every 24h (-10 to +30 cm)\n` +
                `• !dih top [global] — View chat leaderboard or global top dihs\n` +
                `• !dih fight <cm> [@user / reply] — Duel a friend for centimeters\n` +
                `• !dih ofday — Elect or view today's crowned Dih of the Day (+10 cm bonus)\n` +
                `• !dih loan — Reset negative length to 0 cm on credit\n` +
                `• !dih stats [@user / reply] — View player passport & stats\n` +
                `• !dih import <cm> [@user] — Admin import of lengths\n\n` +
                `🔥 STREAK SYSTEM:\n` +
                `Playing on days in a row pays off! Every consecutive day adds +5 to whatever you roll (up to 20 days max streak).\n\n` +
                `═══════════════════════════════`
            );
        }

        // ──────────────── 8. DEFAULT ACTION: GROW ────────────────
        const now = Date.now();

        // Check if user is on cooldown (< 24h since last grow)
        if (user.lastGrow && (now - user.lastGrow) < COOLDOWN_MS) {
            const remainingMs = COOLDOWN_MS - (now - user.lastGrow);
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            const rankings = getRankings(threadDih);
            const rank = rankings.findIndex(r => r.id === senderID) + 1;

            return message.reply(
                `⏳ You already measured your dih today!\n` +
                `🍆 Your dih is currently ${user.length} cm long.\n` +
                `🏆 Your position in the top is ${rank || 1}.\n\n` +
                `Next attempt in ${hours}h ${minutes}m.`
            );
        }

        // Calculate consecutive streak
        if (!user.lastGrow || user.lastGrow === 0) {
            user.streak = 1;
        } else if ((now - user.lastGrow) <= STREAK_EXPIRY_MS) {
            user.streak = Math.min(20, (user.streak || 0) + 1);
        } else {
            user.streak = 1;
        }

        // Base roll: between -10 and +30 cm
        const baseRoll = Math.floor(Math.random() * 41) - 10;
        let delta = baseRoll;

        // Apply streak bonus or penalty
        if (user.streak > 1) {
            const streakFactor = user.streak - 1;
            if (baseRoll > 0) {
                delta += (streakFactor * 5);
            } else if (baseRoll < 0) {
                delta -= Math.round(streakFactor * 2.5);
            }
        }

        // Loan / debt repayment logic
        let loanMsg = "";
        if (delta > 0 && user.debt && user.debt > 0) {
            const payDebt = Math.min(user.debt, Math.ceil(delta / 2));
            user.debt -= payDebt;
            const netDelta = delta - payDebt;
            user.length = (user.length || 0) + netDelta;
            loanMsg = `\n💳 Loan Repaid: ${payDebt} cm paid toward debt (${user.debt} cm remaining debt).`;
            if (user.debt === 0) {
                loanMsg += `\n🎉 Congratulations! Your dih loan has been completely paid off!`;
            }
        } else {
            user.length = (user.length || 0) + delta;
        }

        user.lastGrow = now;
        user.lastGrowDelta = delta;
        user.totalGrows = (user.totalGrows || 0) + 1;

        saveDihData(dihData);

        const rankings = getRankings(threadDih);
        const rank = rankings.findIndex(r => r.id === senderID) + 1;

        if (delta > 0) {
            let replyText =
                `Your dih has grown by ${delta} cm and now it is ${user.length} cm long.\n` +
                `Your position in the top is ${rank}.\n\n` +
                `Next attempt in 24h 00m.`;
            if (user.streak > 1) {
                replyText += `\n🔥 Consecutive streak: ${user.streak} day(s) (+${(user.streak - 1) * 5} cm streak bonus!)`;
            }
            if (loanMsg) replyText += loanMsg;
            return message.reply(replyText);
        } else if (delta < 0) {
            let replyText =
                `🥶 Your dih has shrunk by ${Math.abs(delta)} cm and now it is ${user.length} cm long.\n` +
                `Your position in the top is ${rank}.\n\n` +
                `Next attempt in 24h 00m.`;
            if (user.streak > 1) {
                replyText += `\n🔥 Consecutive streak: ${user.streak} day(s)`;
            }
            return message.reply(replyText);
        } else {
            return message.reply(
                `😐 Your dih didn't change size today and remains at ${user.length} cm long.\n` +
                `Your position in the top is ${rank}.\n\n` +
                `Next attempt in 24h 00m.`
            );
        }
    },

    onReply: async function ({ api, event, Reply, message, usersData }) {
        if (!Reply || Reply.commandName !== "dih" || Reply.type !== "dihFight") return;

        // Check 60s expiration
        if (Date.now() - Reply.timestamp > 60000) {
            if (global.GoatBot?.onReply) global.GoatBot.onReply.delete(event.messageReply?.messageID || Reply.messageID);
            return message.reply("⏳ This dih fight challenge has expired!");
        }

        // Only challenged opponent can reply
        if (String(event.senderID) !== String(Reply.opponentID)) {
            return message.reply(`⛔ Only ${Reply.opponentName} can accept or decline this challenge!`);
        }

        const replyText = (event.body || "").trim().toLowerCase();

        // Decline
        if (
            replyText.includes("decline") ||
            replyText.includes("no") ||
            replyText.includes("cancel") ||
            replyText.includes("forfeit") ||
            replyText.includes("run")
        ) {
            if (global.GoatBot?.onReply) global.GoatBot.onReply.delete(event.messageReply?.messageID || Reply.messageID);
            return message.reply(`🏳️ ${Reply.opponentName} declined the fight! ${Reply.challengerName}'s dih stands victorious without a scratch.`);
        }

        // Accept
        if (
            replyText.includes("accept") ||
            replyText.includes("yes") ||
            replyText.includes("fight") ||
            replyText.includes("duel") ||
            replyText.includes("ok") ||
            replyText === "y"
        ) {
            if (global.GoatBot?.onReply) global.GoatBot.onReply.delete(event.messageReply?.messageID || Reply.messageID);

            const dihData = getDihData();
            const threadDih = getThreadDih(dihData, Reply.threadID);
            const cUser = getUserDih(threadDih, Reply.challengerID, Reply.challengerName);
            const oUser = getUserDih(threadDih, Reply.opponentID, Reply.opponentName);
            const bet = Reply.bet;

            // Re-verify both players still have enough cm
            if (cUser.length < bet) {
                return message.reply(`❌ ${cUser.name} no longer has enough centimeters (${cUser.length} cm) for the ${bet} cm bet!`);
            }
            if (oUser.length < bet) {
                return message.reply(`❌ ${oUser.name} does not have enough centimeters (${oUser.length} cm) for the ${bet} cm bet!`);
            }

            const cLen = cUser.length;
            const oLen = oUser.length;

            // Battle odds: 50% baseline + size difference adjustment capped 25% - 75%
            let cWinChance = 0.50 + ((cLen - oLen) * 0.005);
            cWinChance = Math.max(0.25, Math.min(0.75, cWinChance));

            const challengerWins = Math.random() < cWinChance;
            const winner = challengerWins ? cUser : oUser;
            const loser = challengerWins ? oUser : cUser;

            winner.length += bet;
            loser.length -= bet;
            winner.fightsWon = (winner.fightsWon || 0) + 1;
            loser.fightsLost = (loser.fightsLost || 0) + 1;

            saveDihData(dihData);

            return message.reply(
                `⚔️ ═══ THE DIH CLASH RESULTS ═══ ⚔️\n\n` +
                `💥 ${cUser.name} [${cLen} cm] VS ${oUser.name} [${oLen} cm]\n` +
                `⚡ Both dihs collide in a thunderous shockwave!\n\n` +
                `🏆 WINNER: ${winner.name}!\n` +
                `🎉 ${winner.name} seized +${bet} cm! (Now ${winner.length} cm)\n` +
                `💀 ${loser.name} lost -${bet} cm! (Now ${loser.length} cm)\n` +
                `═════════════════════════════`
            );
        }
    }
};
