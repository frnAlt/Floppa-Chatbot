"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.langs = exports.style = exports.meta = void 0;
exports.entry = entry;
const axios_1 = __importStar(require("axios"));
const redux_home_1 = require("@cassidy/redux-home");
const unispectra_1 = require("@cassidy/unispectra");
const generateInterface_1 = require("@cass-modules/generateInterface");
const spectral_home_1 = require("@cassidy/spectral-home");
exports.meta = {
    name: "api",
    description: "Cassidy's Developer API!",
    author: "frnAlt",
    version: "1.1.4",
    usage: "{prefix}inventory <action> [args]",
    category: "System",
    role: 0,
    noPrefix: false,
    waitingTime: 1,
    otherNames: ["devapi", "cassapi"],
    requirement: "3.0.0",
    icon: "💻",
    cmdType: "etc_xcmd",
};
exports.style = {
    title: "CassAPI 💻",
    titleFont: "bold",
    contentFont: "none",
};
exports.langs = {
    en: {
        welcomeMessage: "✦ Welcome to **Cassidy's Developer API!** Here you are able to **access** and **test out** most of developer related api's, including but not limited to:\n\n%1",
        invjsonNoItem: "⚠️ | Enter an **item key** to check. Make sure it exists in your inventory.",
        invjsonResult: "📄 | Here is the **JSON** of the item you requested:\n\n%1",
        styleExample: "This is an example content.",
        petjsonNoPet: "⚠️ | Enter a **pet name** to check. Make sure it exists in your pet list.",
        petjsonResult: "📄 | Here is the **JSON** of the pet you requested:\n\n%1",
        cmdmetajsonNoCommand: "⚠️ | Enter a valid **command name** to check.",
        cmdmetajsonResult: "📄 | Here is the **JSON** of the command meta you requested:\n\n%1",
        allpetsjsonNoUser: "⚠️ | Enter a **gameid** or **self** to start.",
        allpetsjsonResult: "📄 | Here is the **JSON** of the pets you requested:\n\n%1",
        eventjsonResult: "📄 | The **JSON** below contains the **most important** data that the **cassidy system** processes:\n\n%1",
        reqitemNoJson: "📄 | Please **provide** a **JSON** string to request an item to the **developer**.",
        reqitemInvalidJson: "⚠️ | Invalid JSON format. Please provide a valid JSON string.",
        reqitemMissingFields: '⚠️ | Missing important required fields. Ensure your JSON includes "key", "icon", "flavorText", "type", "sellPrice" and "name".',
        reqitemSuccess: "📄✅ | Thank you for your **request**! The item you created has been successfully sent to the **developer** for review, it might be added to the bot soon if it is able to meet the requirements.\n\n**JSON Recap**:\n\n%1",
        reqitemlistResult: "📄 | **Requested Items:** (newest first.)\n\n%1\n\nType **api reqitemlist <page>*** to navigate through the pages. You can also use tag **--json** to view json.",
        petTestGuide: "**Guide**: <your-pet-name> <enemy-atk> <enemy-def> <enemy-hp>",
        petTestNoPet: "⚠️ | Please enter a pet name that **exists** in your pet list.",
        petTestUI: "%1\nATK %2 DEF %3 \n\n%4\nATK %5 DEF %6 MAGIC %7\n\nOptions:\n**attack**\n**take single**\n**take thirds**\n**take half**",
        petTestAttack: "%1 **%2** dealth **%3** damage.\n\n%4",
        petTestTakeDamage: "%1 **%2** has taken **%3** damage.\n\n%4",
        petTestInvalidOption: "⚠️ | Please go back and reply a valid option.",
        reduxOption1: "This is option 1!",
        reduxOption2: "This is option 2!",
        reduxOption3: "This is option 3!",
        fileWelcome: "Welcome to the **file** manager! This does not work for now.",
        fileOptionFile: "Bruh File",
        fileOptionEdit: "What are you gonna edit lmao",
        fileOptionNoHandler: "Invalid option!",
        testNoUrl: "Enter a URL.",
        testAdminOnlyAttachment: "❌ Only admins and ws users can send attachment.",
        testMediaContent: "✅ Media Content:",
        testApiResponse: "%1",
        testUnrecognizedContent: "❌ Unrecognized content type",
    },
    tl: {
        welcomeMessage: "✦ Welcome sa **Cassidy's Developer API**, besh! Dito you can **access** and **test out** most of the developer APIs, kasama na pero not limited to:\n\n%1",
        invjsonNoItem: "⚠️ | Mag-enter ka ng **item key** to check, girl! Sure ka na nasa inventory mo yan ha.",
        invjsonResult: "📄 | Eto na yung **JSON** ng item na hiniling mo:\n\n%1",
        styleExample: "This is an example content, so fab!",
        petjsonNoPet: "⚠️ | Maglagay ka ng **pet name** to check, besh! Sure ka na nasa pet list mo yan.",
        petjsonResult: "📄 | Eto yung **JSON** ng pet na hiniling mo:\n\n%1",
        cmdmetajsonNoCommand: "⚠️ | Mag-enter ka ng valid **command name** para i-check, ha!",
        cmdmetajsonResult: "📄 | Eto yung **JSON** ng command meta na hiniling mo:\n\n%1",
        allpetsjsonNoUser: "⚠️ | Maglagay ka ng **gameid** or **self** para mag-start, girl!",
        allpetsjsonResult: "📄 | Eto yung **JSON** ng mga pets na hiniling mo:\n\n%1",
        eventjsonResult: "📄 | Yung **JSON** sa baba contains yung **most important** data na pinoproseso ng **cassidy system**:\n\n%1",
        reqitemNoJson: "📄 | Please **magbigay** ka ng **JSON** string para mag-request ng item sa **developer**, besh!",
        reqitemInvalidJson: "⚠️ | Mali yung JSON format, girl! Valid JSON string please.",
        reqitemMissingFields: '⚠️ | Kulang yung important fields, ha! Sure ka na kasama yung "key", "icon", "flavorText", "type", "sellPrice" at "name" sa JSON mo.',
        reqitemSuccess: "📄✅ | Thank you sa **request** mo, so fab! Yung item na ginawa mo nasend na sa **developer** for review, baka ma-add sa bot soon kung pasado sa requirements.\n\n**JSON Recap**:\n\n%1",
        reqitemlistResult: "📄 | **Requested Items:** (newest first, besh!)\n\n%1\n\nType mo **api reqitemlist <page>*** para mag-navigate sa pages. Pwede rin gamitin yung **--json** tag para makita yung json, ha!",
        petTestGuide: "**Guide**: <your-pet-name> <enemy-atk> <enemy-def> <enemy-hp>, so easy lang!",
        petTestNoPet: "⚠️ | Mag-enter ka ng pet name na **nasa pet list** mo talaga, girl!",
        petTestUI: "%1\nATK %2 DEF %3 \n\n%4\nATK %5 DEF %6 MAGIC %7\n\nOptions, besh:\n**attack**\n**take single**\n**take thirds**\n**take half**",
        petTestAttack: "%1 **%2** nag-deal ng **%3** damage, so cool!\n\n%4",
        petTestTakeDamage: "%1 **%2** natamaan ng **%3** damage, ouch ha!\n\n%4",
        petTestInvalidOption: "⚠️ | Balik ka at mag-reply ng valid option, besh!",
        reduxOption1: "This is option 1, so fab!",
        reduxOption2: "This is option 2, love it!",
        reduxOption3: "This is option 3, so cute!",
        fileWelcome: "Welcome sa **file** manager, besh! Hindi pa to gumagana for now, ha.",
        fileOptionFile: "Bruh File, so funny!",
        fileOptionEdit: "Ano ba yung ie-edit mo lmao, girl!",
        fileOptionNoHandler: "Invalid option, besh!",
        testNoUrl: "Mag-enter ka ng URL, ha!",
        testAdminOnlyAttachment: "❌ Admins and ws users lang pwede mag-send ng attachment, sorry besh!",
        testMediaContent: "✅ Media Content, so fab!",
        testApiResponse: "✅ API Response, love it:\n\n%1",
        testUnrecognizedContent: "❌ Unrecognized content type, sayur naman!",
    },
};
const handlers = {
    async redux_demo({ langParser, ctx }) {
        const getLang = langParser.createGetLang(exports.langs);
        const home = new redux_home_1.ReduxCMDHome({
            isHypen: false,
            argIndex: 1,
        }, [
            {
                key: "option1",
                async handler({ output }) {
                    output.reply(getLang("reduxOption1"));
                },
            },
            {
                key: "option2",
                description: "This is the second option.",
                async handler({ output }) {
                    output.reply(getLang("reduxOption2"));
                },
            },
            {
                key: "option3",
                description: "This is the third option.",
                args: ["<arg1>", "[arg2]"],
                async handler({ output }) {
                    output.reply(getLang("reduxOption3"));
                },
            },
        ]);
        home.runInContext({ ...ctx, langParser });
    },
    async file({ output, NeaxUI, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const neax = new NeaxUI({ output, langParser });
        neax.menuBarOpts.add("File", "Edit", "View", "Help");
        neax.onMenuBar("File", ({ cassIO }) => {
            cassIO.out(getLang("fileOptionFile"));
        });
        neax.onMenuBar("Edit", ({ cassIO }) => {
            cassIO.out(getLang("fileOptionEdit"));
        });
        neax.onMenuBar(":nohandler", ({ cassIO }) => {
            cassIO.out(getLang("fileOptionNoHandler"));
        });
        neax.replyListen({
            content: getLang("fileWelcome"),
        }, () => true);
    },
    async invjson({ input, money, output, args, Inventory, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const userData = await money.getItem(input.senderID);
        const inventory = new Inventory(userData.inventory);
        const targetItem = inventory.getOne(args[0]);
        if (!targetItem) {
            return output.reply(getLang("invjsonNoItem"));
        }
        const jsonStr = JSON.stringify(targetItem, null, 2);
        return output.reply(getLang("invjsonResult", jsonStr));
    },
    async style({ output, args, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const jsonData = JSON.parse(args.join(" "));
        const styled = new output.Styled({
            ...jsonData,
        });
        await styled.reply(getLang("styleExample"));
    },
    async petjson({ input, money, output, args, Inventory, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const userData = await money.getItem(input.senderID);
        const petsData = new Inventory(userData.petsData);
        const targetPet = petsData
            .getAll()
            .find((i) => String(i?.name).toLowerCase().trim() ===
            String(args[0]).toLowerCase().trim());
        if (!targetPet) {
            return output.reply(getLang("petjsonNoPet"));
        }
        const jsonStr = JSON.stringify(targetPet, null, 2);
        return output.reply(getLang("petjsonResult", jsonStr));
    },
    async cmdmetajson({ output, multiCommands, args, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const command = multiCommands.getOne(args[0]) ??
            multiCommands.getOne(String(args[0]).toLowerCase());
        if (!command) {
            return output.reply(getLang("cmdmetajsonNoCommand"));
        }
        const jsonStr = JSON.stringify(command.meta, null, 2);
        return output.reply(getLang("cmdmetajsonResult", jsonStr));
    },
    async allpetsjson({ input, money, output, args, Inventory, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const userID = (args[0] === "self" ? input.senderID : args[0]) ||
            input.replier?.senderID;
        if (!args[0]) {
            return output.reply(getLang("allpetsjsonNoUser"));
        }
        const userData = await money.getItem(userID);
        const petsData = new Inventory(userData.petsData);
        const jsonStr = JSON.stringify(petsData, null, 2);
        return output.reply(getLang("allpetsjsonResult", jsonStr));
    },
    async eventjson({ input: { ...input }, output, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        "password" in input ? delete input.password : 0;
        return output.reply(getLang("eventjsonResult", JSON.stringify(input, null, 2)));
    },
    async reqitem({ input, output, args, money, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const adminData = await money.getItem("wss:admin");
        if (args.length === 0) {
            return output.reply(getLang("reqitemNoJson"));
        }
        let itemData;
        try {
            itemData = JSON.parse(args.join(" "));
        }
        catch (e) {
            return output.reply(getLang("reqitemInvalidJson"));
        }
        const { key, icon, flavorText, name, type, sellPrice } = itemData;
        if (!key || !icon || !flavorText || !name || !type || !sellPrice) {
            return output.reply(getLang("reqitemMissingFields"));
        }
        adminData.requestItems ??= [];
        adminData.requestNum ??= 0;
        adminData.requestNum++;
        adminData.requestItems.push({
            author: input.senderID,
            itemData,
            creationTime: Date.now(),
            requestNum: adminData.requestNum,
        });
        const jsonStr = JSON.stringify(itemData, null, 2);
        await money.set("wss:admin", {
            requestItems: adminData.requestItems,
            requestNum: adminData.requestNum,
        });
        return output.reply(getLang("reqitemSuccess", jsonStr));
    },
    async reqitemlist({ output, money, Slicer, args, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const adminData = await money.getItem("wss:admin");
        const allData = await money.getAll();
        const items = Array.from(adminData.requestItems ?? []);
        let result = "";
        const slicer = new Slicer(items.reverse(), 5);
        for (const itemReq of slicer.getPage(args[0])) {
            if (!itemReq.author || !itemReq.itemData) {
                continue;
            }
            const item = itemReq.itemData;
            /**
             * @type {UserData}
             */
            const userData = allData[itemReq.author] ?? money.defaults;
            if (args.includes("--json")) {
                result += `${item.icon} **${item.name}** (${item.key}) #${itemReq.requestNum ?? "??"}
By **${userData.name ?? "Unregistered"}**

${JSON.stringify(item, null, 2)}\n\n`;
            }
            else {
                result += `${item.icon} **${item.name}** (${item.key}) #${itemReq.requestNum ?? "??"}
By **${userData.name ?? "Unregistered"}**
***Info:***
${item.flavorText ?? "Not Configured"}
***Type:*** ${item.type ?? "Not Configured"}
***Sell Price:*** ${item.sellPrice ?? "Not Configured"}
***ATK***: ${item.atk ?? "Not Configured"}
***DEF***: ${item.def ?? "Not Configured"}
***MAGIC***: ${item.magic ?? "Not Configured"}
***Saturation***: ${item.saturation ?? "Not Configured"}
***Author ID*** ${itemReq.author}\n\n`;
            }
        }
        return output.reply(getLang("reqitemlistResult", result.trim()));
    },
    async pet_test({ input, output, args, money, Inventory, GearsManage, PetPlayer, WildPlayer, langParser, }) {
        const getLang = langParser.createGetLang(exports.langs);
        const userData = await money.getItem(input.senderID);
        /**
         *
         * @param {UserData} data
         * @returns
         */
        function getInfos(data) {
            const gearsManage = new GearsManage(data.gearsData);
            const petsData = new Inventory(data.petsData);
            const playersMap = new Map();
            for (const pet of petsData) {
                const gear = gearsManage.getGearData(pet.key);
                const player = new PetPlayer(pet, gear);
                playersMap.set(pet.key, player);
            }
            return {
                gearsManage,
                petsData,
                playersMap,
            };
        }
        const { gearsManage, petsData, playersMap } = getInfos(userData);
        /**
         * @type {Array<string | number>}
         */
        let [targetName, enemyAtk, enemyDef, enemyHP] = args;
        enemyAtk = parseInt(enemyAtk);
        enemyDef = parseInt(enemyDef);
        enemyHP = parseInt(enemyHP);
        if (!targetName || isNaN(enemyAtk) || isNaN(enemyDef) || isNaN(enemyHP)) {
            return output.reply(getLang("petTestGuide"));
        }
        const petKey = petsData.findKey((i) => String(i?.name).toLowerCase() === String(targetName).toLowerCase());
        const player = playersMap.get(petKey);
        if (!player) {
            return output.reply(getLang("petTestNoPet"));
        }
        // @ts-ignore
        const opponent = new WildPlayer({
            wildName: "Test Opponent",
            wildIcon: "🤖",
            wildType: "robot",
            HP: enemyHP,
            ATK: enemyAtk,
            DF: enemyDef,
        });
        function makeUI() {
            return getLang("petTestUI", opponent.getPlayerUI(), 
            // @ts-ignore
            opponent.ATK, 
            // @ts-ignore
            opponent.DF, player.getPlayerUI(), String(player.ATK), String(player.DF), String(player.MAGIC));
        }
        const author = input.senderID;
        async function handleInput({ output, input, langParser }) {
            const getLang = langParser.createGetLang(exports.langs);
            if (input.senderID !== author)
                return;
            const args = input.words;
            // @ts-ignore
            function detect(...actions) {
                return actions.every((a, ind) => a === args[ind]);
            }
            function handleEnd(id, { ...extras } = {}) {
                input.setReply(id, {
                    key: "api",
                    callback: handleInput,
                    ...extras,
                });
            }
            const option = String(args[0]).toLowerCase();
            const subOption = String(args[1]).toLowerCase();
            if (option === "attack") {
                // @ts-ignore
                const damage = player.calculateAttack(opponent.DF);
                // @ts-ignore
                opponent.HP -= damage;
                const i = await output.replyStyled(getLang("petTestAttack", 
                // @ts-ignore
                player.petIcon, 
                // @ts-ignore
                player.petName, damage, makeUI()), exports.style);
                handleEnd(i.messageID);
            }
            else if (option === "take") {
                // @ts-ignore
                let damage = player.calculateTakenDamage(opponent.ATK);
                if (subOption === "thirds") {
                    damage /= 3;
                }
                if (subOption === "half") {
                    damage /= 2;
                }
                damage = Math.floor(damage);
                player.HP -= damage;
                const i = await output.replyStyled(getLang("petTestTakeDamage", 
                // @ts-ignore
                player.petIcon, 
                // @ts-ignore
                player.petName, damage, makeUI()), exports.style);
                handleEnd(i.messageID);
            }
            else {
                return output.replyStyled(getLang("petTestInvalidOption"), exports.style);
            }
        }
        const i = await output.replyStyled(makeUI(), exports.style);
        input.setReply(i.messageID, {
            key: "api",
            callback: handleInput,
        });
    },
    async test({ input, output, api, args, langParser }) {
        const getLang = langParser.createGetLang(exports.langs);
        const [url, ...pArgs] = args;
        const [method = "GET"] = input.propertyArray;
        const paramsJSON = pArgs.join(" ");
        let params = null;
        if (pArgs.length > 0) {
            try {
                params = JSON.parse(paramsJSON);
            }
            catch (error) {
                return output.error(error);
            }
        }
        if (!url) {
            return output.reply(getLang("testNoUrl"));
        }
        /**
         * @type {import("axios").AxiosResponse | undefined}
         */
        let res;
        /**
         * @type {AxiosError | undefined}
         */
        let err;
        const timeA = performance.now();
        try {
            res = await (0, axios_1.default)({
                method: String(method).toLowerCase(),
                url,
                responseType: "stream",
                params,
            });
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError) {
                res = error.response;
                err = error;
            }
            if (!res) {
                return output.error(error);
            }
        }
        const contentType = res.headers["content-type"]?.toLowerCase();
        const stream = res.data;
        if (contentType?.startsWith("image/") ||
            contentType?.startsWith("video/") ||
            contentType?.startsWith("audio/")) {
            if (!input.isAdmin && !input.isWss) {
                return output.reply(getLang("testAdminOnlyAttachment"));
            }
            return output.reply({
                body: getLang("testMediaContent"),
                attachment: stream,
            });
        }
        let dataBuffer = "";
        stream.on("data", (chunk) => {
            dataBuffer += chunk.toString();
        });
        stream.on("end", () => {
            if (contentType?.includes("application/json") ||
                contentType?.includes("text/plain") ||
                contentType?.includes("text/html")) {
                const statusSymbol = res.status >= 500
                    ? "❌"
                    : res.status >= 400
                        ? "❌"
                        : res.status >= 300
                            ? "🔁"
                            : res.status >= 200
                                ? "✅"
                                : "❓";
                let status = `${statusSymbol} **${res.status} (${res.statusText})**\n***Ping*** ${unispectra_1.UNISpectra.arrow} ${(performance.now() - timeA).toFixed(2)}ms\n\n`;
                if (contentType?.includes("application/json")) {
                    try {
                        const jsonData = JSON.parse(dataBuffer);
                        const types = (0, generateInterface_1.generateInterface)("ResponseType", jsonData);
                        output.reply({
                            body: getLang("testApiResponse", status +
                                JSON.stringify(jsonData, null, 2).slice(0, 1500) +
                                `\n\n${types}`).slice(0, 1500),
                        });
                    }
                    catch (error) {
                        output.error(error);
                    }
                }
                else {
                    output.reply({
                        body: getLang("testApiResponse", status + dataBuffer.slice(0, 1500)),
                    });
                }
            }
            else {
                output.reply({
                    body: getLang("testUnrecognizedContent"),
                });
            }
        });
        stream.on("error", (error) => {
            output.error(error);
        });
    },
    types({ input, output }) {
        const jsonStr = JSON.parse(input.arguments.join(" "));
        return output.reply((0, generateInterface_1.generateInterface)("GeneratedType", jsonStr));
    },
};
const home = new spectral_home_1.SpectralCMDHome({
    isHypen: true,
    home({ output, getLang }, { itemList }) {
        return output.reply(getLang("welcomeMessage", itemList));
    },
}, Object.entries(handlers).map(([key, handler]) => {
    return {
        key,
        handler,
        aliases: [`${key.at(0)}${key.at(1)}${key.at(-1)}`],
    };
}));
async function entry({ ctx }) {
    return home.runInContext(ctx);
}
