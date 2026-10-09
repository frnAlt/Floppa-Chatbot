const { db, utils, GoatBot } = global;
const { config } = GoatBot;
const { log, getText } = utils;
const { creatingThreadData, creatingUserData } = global.client.database;

module.exports = async function (usersData, threadsData, event) {
        if (!event || ["typ", "presence", "read_receipt"].includes(event.type)) {
                return;
        }

        const { threadID } = event;
        const senderID = event.senderID || event.author || event.userID;

        // ———————————— CHECK THREAD DATA ———————————— //
        if (threadID) {
                try {
                        if (!global.temp) global.temp = {};
                        if (!global.temp.createThreadDataError) global.temp.createThreadDataError = [];

                        const errList = global.temp.createThreadDataError;
                        const isErr = Array.isArray(errList)
                                ? errList.includes(threadID)
                                : (typeof errList.has === "function" && errList.has(threadID));

                        if (!isErr) {
                                const findInCreatingThreadData = creatingThreadData.find(t => t.threadID == threadID);
                                if (!findInCreatingThreadData) {
                                        if (!global.db.allThreadData.some(t => t.threadID == threadID)) {
                                                const isGroupHint = typeof event.isGroup === "boolean" ? event.isGroup : (threadID && senderID ? String(threadID) !== String(senderID) : undefined);
                                                const threadData = await threadsData.create(threadID, null, isGroupHint);
                                                if (global.db) {
                                                        if (!global.db.receivedTheFirstMessage) global.db.receivedTheFirstMessage = {};
                                                        global.db.receivedTheFirstMessage[threadID] = true;
                                                }
                                                log.info("DATABASE", `New Thread: ${threadID} | ${threadData.threadName} | ${config.database.type}`);
                                        }
                                }
                                else {
                                        await findInCreatingThreadData.promise;
                                }
                        }
                }
                catch (err) {
                        if (err.name != "DATA_ALREADY_EXISTS") {
                                if (Array.isArray(global.temp.createThreadDataError)) {
                                        if (!global.temp.createThreadDataError.includes(threadID))
                                                global.temp.createThreadDataError.push(threadID);
                                } else if (typeof global.temp.createThreadDataError.add === "function") {
                                        global.temp.createThreadDataError.add(threadID);
                                }
                                log.err("DATABASE", getText("handlerCheckData", "cantCreateThread", threadID), err);
                        }
                }
        }


        // ————————————— CHECK USER DATA ————————————— //
        if (senderID) {
                try {
                        const findInCreatingUserData = creatingUserData.find(u => u.userID == senderID);
                        if (!findInCreatingUserData) {
                                if (db.allUserData.some(u => u.userID == senderID))
                                        return;

                                const userData = await usersData.create(senderID);
                                log.info("DATABASE", `New User: ${senderID} | ${userData.name} | ${config.database.type}`);
                        }
                        else {
                                await findInCreatingUserData.promise;
                        }
                }
                catch (err) {
                        if (err.name != "DATA_ALREADY_EXISTS")
                                log.err("DATABASE", getText("handlerCheckData", "cantCreateUser", senderID), err);
                }
        }
};