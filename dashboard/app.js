const express = require("express");
const app = express();
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const fs = require("fs-extra");
const path = require("path");
const session = require("express-session");
const eta = require("eta");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const Passport = require("passport");
let bcrypt;
try {
    bcrypt = require("bcrypt");
} catch (_) {
    try {
        bcrypt = require("bcryptjs");
    } catch (_) {
        const crypto = require("crypto");
        bcrypt = {
            hashSync: (pwd, salt) => crypto.createHash("sha256").update(pwd + (salt || "")).digest("hex"),
            compareSync: (pwd, hash) => crypto.createHash("sha256").update(pwd).digest("hex") === hash || pwd === hash,
            compare: async (pwd, hash) => crypto.createHash("sha256").update(pwd).digest("hex") === hash || pwd === hash,
            genSaltSync: () => ""
        };
    }
}
const axios = require("axios");
const mimeDB = require("mime-db");
const http = require("http");
const os = require("os");
const server = http.createServer(app);

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();
let currentCpuUsagePercent = "0.0";

const cpuInterval = setInterval(() => {
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();
    const userDiff = currentCpuUsage.user - lastCpuUsage.user;
    const systemDiff = currentCpuUsage.system - lastCpuUsage.system;
    const timeDiff = (currentTime - lastCpuTime) * 1000; 
    if (timeDiff > 0) {
        currentCpuUsagePercent = ((userDiff + systemDiff) / timeDiff * 100).toFixed(1);
    }
    lastCpuUsage = currentCpuUsage;
    lastCpuTime = currentTime;
}, 2000);
if (cpuInterval && typeof cpuInterval.unref === "function") cpuInterval.unref();

const MAX_LOGS = 200;
global.dashboardLogs = global.dashboardLogs || [];
if (!global.stdoutHooked) {
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    
    function capture(chunk) {
        if (typeof chunk === 'string') {
            const cleanText = chunk.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (cleanText) {
                global.dashboardLogs.push({ time: new Date().toLocaleTimeString(), text: cleanText });
                if (global.dashboardLogs.length > MAX_LOGS) {
                    global.dashboardLogs.shift();
                }
            }
        }
    }
    
    process.stdout.write = (chunk, encoding, cb) => { capture(chunk); return origStdout(chunk, encoding, cb); };
    process.stderr.write = (chunk, encoding, cb) => { capture(chunk); return origStderr(chunk, encoding, cb); };
    global.stdoutHooked = true;
}

const imageExt = ["png", "gif", "webp", "jpeg", "jpg"];
const videoExt = ["webm", "mkv", "flv", "vob", "ogv", "ogg", "rrc", "gifv",
        "mng", "mov", "avi", "qt", "wmv", "yuv", "rm", "asf", "amv", "mp4",
        "m4p", "m4v", "mpg", "mp2", "mpeg", "mpe", "mpv", "m4v", "svi", "3gp",
        "3g2", "mxf", "roq", "nsv", "flv", "f4v", "f4p", "f4a", "f4b", "mod"
];
const audioExt = ["3gp", "aa", "aac", "aax", "act", "aiff", "alac", "amr",
        "ape", "au", "awb", "dss", "dvf", "flac", "gsm", "iklax", "ivs",
        "m4a", "m4b", "m4p", "mmf", "mp3", "mpc", "msv", "nmf",
        "ogg", "oga", "mogg", "opus", "ra", "rm", "raw", "rf64", "sln", "tta",
        "voc", "vox", "wav", "wma", "wv", "webm", "8svx", "cd"
];


module.exports = async (api) => {
        if (!api)
                await require("./connectDB.js")();

        const { utils } = global;
        const { config } = global.GoatBot;
        const { expireVerifyCode } = config.dashBoard;

        const getText = global.utils.getText;


        const {
                threadModel,
                userModel,
                dashBoardModel,
                threadsData,
                usersData,
                dashBoardData
        } = global.db;


        // const verifyCodes = {
        //     fbid: [],
        //     register: [],
        //     forgetPass: []
        // };

        eta.configure({
                useWith: true
        });

        app.set("views", `${__dirname}/views`);
        app.engine("eta", eta.renderFile);
        app.set("view engine", "eta");

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());
        const sessionSecretFile = `${process.cwd()}/.session_secret`;
        const sessionSecret = fs.existsSync(sessionSecretFile)
                ? fs.readFileSync(sessionSecretFile, "utf8").trim()
                : (() => {
                        const secret = utils.randomString(64);
                        fs.writeFileSync(sessionSecretFile, secret);
                        return secret;
                })();
        class FloppaSessionStore extends session.Store {
                constructor() {
                        super();
                        this.sessions = new Map();
                        // Periodic cleanup of expired sessions to prevent memory leaks
                        setInterval(() => {
                                const now = Date.now();
                                for (const [sid, sess] of this.sessions.entries()) {
                                        const expires = sess?.cookie?.expires;
                                        if (expires && new Date(expires).getTime() < now) {
                                                this.sessions.delete(sid);
                                        }
                                }
                        }, 60 * 60 * 1000);
                }
                get(sid, cb) {
                        const sess = this.sessions.get(sid);
                        if (!sess) return cb(null, null);
                        const expires = sess?.cookie?.expires;
                        if (expires && new Date(expires).getTime() < Date.now()) {
                                this.sessions.delete(sid);
                                return cb(null, null);
                        }
                        cb(null, sess);
                }
                set(sid, sess, cb) {
                        this.sessions.set(sid, sess);
                        if (cb) cb(null);
                }
                destroy(sid, cb) {
                        this.sessions.delete(sid);
                        if (cb) cb(null);
                }
                touch(sid, sess, cb) {
                        const current = this.sessions.get(sid);
                        if (current) {
                                current.cookie = sess.cookie;
                                this.sessions.set(sid, current);
                        }
                        if (cb) cb(null);
                }
                all(cb) {
                        const arr = {};
                        for (const [sid, sess] of this.sessions.entries()) {
                                arr[sid] = sess;
                        }
                        cb(null, arr);
                }
                length(cb) {
                        cb(null, this.sessions.size);
                }
                clear(cb) {
                        this.sessions.clear();
                        if (cb) cb(null);
                }
        }
        let sessionStore;
        try {
                const FileStore = require("./scripts/sessionStore.js");
                sessionStore = new FileStore();
        } catch (_) {
                sessionStore = new FloppaSessionStore();
        }

        app.use(session({
                secret: sessionSecret,
                resave: false,
                saveUninitialized: false,
                store: sessionStore,
                cookie: {
                        secure: false,
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
                }
        }));


        // public folder 
        app.use("/css", express.static(`${__dirname}/css`));
        app.use("/js", express.static(`${__dirname}/js`));
        app.use("/images", express.static(`${__dirname}/images`));

        require("./passport-config.js")(Passport, dashBoardData, bcrypt);
        app.use(Passport.initialize());
        app.use(Passport.session());
        app.use(fileUpload());

        app.use(flash());
        app.use(function (req, res, next) {
                res.locals.__dirname = __dirname;
                res.locals.success = req.flash("success") || [];
                res.locals.errors = req.flash("errors") || [];
                res.locals.warnings = req.flash("warnings") || [];
                res.locals.user = req.user || null;
                next();
        });

        const generateEmailVerificationCode = require("./scripts/generate-Email-Verification.js");

        // ————————————————— MIDDLEWARE ————————————————— //
        const createLimiter = (ms, max) => rateLimit({
                windowMs: ms, // 5 minutes
                max,
                handler: (req, res) => {
                        res.status(429).send({
                                status: "error",
                                message: getText("app", "tooManyRequests")
                        });
                }
        });

        const middleWare = require("./middleware/index.js")(checkAuthConfigDashboardOfThread);

        // ————————————————————————————————————————————— //

        async function checkAuthConfigDashboardOfThread(threadData, userID) {
                if ((global.GoatBot?.config?.adminBot || []).includes(userID)) return true;
                if (!isNaN(threadData))
                        threadData = await threadsData.get(threadData);
                return threadData?.adminIDs?.includes(userID) || threadData?.members?.some(m => m.userID == userID && m.permissionConfigDashboard == true) || false;
        }

        const isVideoFile = (mimeType) => videoExt.includes(mimeDB[mimeType]?.extensions?.[0]);

        // ROUTES & MIDDLWARE
        const {
                unAuthenticated,
                isWaitVerifyAccount,
                isAuthenticated,
                isAdmin,
                isVeryfiUserIDFacebook,
                checkHasAndInThread,
                middlewareCheckAuthConfigDashboardOfThread
        } = middleWare;

        const validateEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isVerifyRecaptcha = async () => true;
        const randomNumberApikey = (len = 16) => utils.randomString(len);
        const transporter = null;
        const convertSize = utils.convertBytes || ((bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`);
        const drive = null;

        const paramsForRoutes = {
                unAuthenticated, isWaitVerifyAccount, isAdmin, isAuthenticated,
                isVeryfiUserIDFacebook, checkHasAndInThread, middlewareCheckAuthConfigDashboardOfThread,

                generateEmailVerificationCode, dashBoardData, expireVerifyCode, Passport, isVideoFile,

                threadsData, api, createLimiter, config, checkAuthConfigDashboardOfThread,
                imageExt, videoExt, audioExt, usersData,

                validateEmail, isVerifyRecaptcha, randomNumberApikey, transporter, convertSize, drive
        };

        const registerRoute = require("./routes/register.js")(paramsForRoutes);
        const loginRoute = require("./routes/login.js")(paramsForRoutes);
        const forgotPasswordRoute = require("./routes/forgotPassword.js")(paramsForRoutes);
        const changePasswordRoute = require("./routes/changePassword.js")(paramsForRoutes);
        const dashBoardRoute = require("./routes/dashBoard.js")(paramsForRoutes);
        const verifyFbidRoute = require("./routes/verifyfbid.js")(paramsForRoutes);
        const apiRouter = require("./routes/api.js")(paramsForRoutes);

        app.get(["/", "/home"], (req, res) => {
                res.render("home");
        });

        app.get("/stats", async (req, res) => {
                let fcaVersion;
                try {
                    fcaVersion = require(path.join(process.cwd(), "fca/package.json")).version;
                } catch (_) {
                    fcaVersion = "5.0.0";
                }

                const totalThread = (await threadsData.getAll()).filter(t => t.threadID.toString().length > 15).length;
                const totalUser = (await usersData.getAll()).length;
                const prefix = config.prefix;
                const uptime = utils.convertTime(process.uptime() * 1000);

                res.render("stats", {
                        fcaVersion,
                        totalThread,
                        totalUser,
                        prefix,
                        uptime,
                        uptimeSecond: process.uptime()
                });
        });

        app.get("/profile", isAuthenticated, async (req, res) => {
                res.render("profile", {
                        userData: await usersData.get(req.user.facebookUserID) || {}
                });
        });

        app.get("/donate", (req, res) => res.render("donate"));

        app.get("/logout", (req, res, next) => {
                req.logout(function (err) {
                        if (err)
                                return next(err);
                        res.redirect("/");
                });
        });

        app.post("/changefbstate", isAuthenticated, isVeryfiUserIDFacebook, (req, res) => {
                if (!global.GoatBot.config.adminBot.includes(req.user.facebookUserID))
                        return res.send({
                                status: "error",
                                message: getText("app", "notPermissionChangeFbstate")
                        });
                const { fbstate } = req.body;
                if (!fbstate)
                        return res.send({
                                status: "error",
                                message: getText("app", "notFoundFbstate")
                        });

                const accountJson = path.join(process.cwd(), "account.json");
                const accountTxt = path.join(process.cwd(), "account.txt");
                fs.writeFile(accountJson, fbstate, err => {
                        if (err) console.error('[DASHBOARD] Failed to write account.json:', err.message);
                });
                fs.writeFile(accountTxt, fbstate, err => {
                        if (err) console.error('[DASHBOARD] Failed to write account.txt:', err.message);
                });
                res.send({
                        status: "success",
                        message: getText("app", "changedFbstateSuccess")
                });

                res.on("finish", () => {
                        process.exit(2);
                });
        });
        app.get("/uptime", (req, res, next) => {
                if (typeof global.responseUptimeCurrent === "function") {
                        return global.responseUptimeCurrent(req, res, next);
                }
                return res.status(200).send({
                        status: "ok",
                        uptime: process.uptime(),
                        service: "Floppa-Chatbot Web Analytics & Console"
                });
        });

        // Health check endpoint for Render/Vercel/Railway/Docker liveness probes
        app.get(["/health", "/ping"], (req, res) => {
                const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_URL);
                const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
                res.status(200).json({
                        status: "ok",
                        service: "Floppa-Chatbot Web Analytics & Console",
                        environment: isVercel ? "Vercel Cloud" : (isRender ? "Render Cloud" : (process.env.NODE_ENV === "production" ? "Production Cloud" : "Local Engine")),
                        uptime: process.uptime(),
                        timestamp: new Date().toISOString()
                });
        });

        app.get("/changefbstate", isAuthenticated, isVeryfiUserIDFacebook, isAdmin, (req, res) => {
                const accountJson = path.join(process.cwd(), "account.json");
                const accountTxt = path.join(process.cwd(), "account.txt");
                let currentFbstate = "";
                if (fs.existsSync(accountJson)) {
                        currentFbstate = fs.readFileSync(accountJson, "utf8");
                } else if (fs.existsSync(accountTxt)) {
                        currentFbstate = fs.readFileSync(accountTxt, "utf8");
                }
                res.render("changeFbstate", {
                        currentFbstate
                });
        });

        app.use('/images', express.static(path.join(__dirname, 'images')));

        // ————————————————— CALYX / GOATBOT ADMIN PANEL ————————————————— //
        app.get(["/admin", "/admin_panel", "/panel"], (req, res) => {
            try {
                const templatePath = path.join(__dirname, "views", "admin_panel.html");
                if (fs.existsSync(templatePath)) {
                    const html = fs.readFileSync(templatePath, "utf-8");
                    return res.send(html);
                }
                res.redirect("/dashboard");
            } catch (error) {
                res.status(500).send("Error loading admin panel: " + error.message);
            }
        });

        app.get("/api/stats", async (req, res) => {
            try {
                const allUsers = (await usersData.getAll()) || [];
                const allThreads = (await threadsData.getAll()) || [];
                const totalUsers = allUsers.length;
                const totalThreads = allThreads.length;
                const totalCommands = global.GoatBot?.commands ? global.GoatBot.commands.size : 0;
                const uptimeSeconds = process.uptime();
                
                const mem = process.memoryUsage();
                const memoryUsed = (mem.rss / 1024 / 1024).toFixed(2);
                const memoryMax = (mem.heapTotal / 1024 / 1024).toFixed(2);
                
                let totalMembers = 0;
                allThreads.forEach(t => {
                    if (t.members) totalMembers += t.members.length;
                });

                let botVersion = "1.5.35";
                try {
                    botVersion = require(path.join(process.cwd(), "package.json")).version;
                } catch(e) {}

                const cpuUsage = currentCpuUsagePercent;
                const osInfo = os.type() + " " + os.release();
                
                let totalPackages = 0;
                try {
                    const pkg = require(path.join(process.cwd(), "package.json"));
                    if(pkg.dependencies) totalPackages += Object.keys(pkg.dependencies).length;
                    if(pkg.devDependencies) totalPackages += Object.keys(pkg.devDependencies).length;
                } catch(e) {}

                let storageInfo = "Unknown";
                try {
                    if (fs.statfsSync) {
                        const stat = fs.statfsSync(process.cwd());
                        const totalGb = (stat.blocks * stat.bsize) / (1024 ** 3);
                        const freeGb = (stat.bfree * stat.bsize) / (1024 ** 3);
                        const usedGb = totalGb - freeGb;
                        storageInfo = `${usedGb.toFixed(1)}GB / ${totalGb.toFixed(1)}GB`;
                    }
                } catch(e) {}

                res.json({
                    success: true,
                    uptimeSeconds,
                    memoryUsed,
                    memoryMax,
                    totalThreads,
                    totalUsers,
                    totalCommands,
                    totalMembers,
                    botVersion,
                    cpuUsage,
                    nodeVersion: process.version,
                    osInfo,
                    totalPackages,
                    storageInfo
                });
            } catch (err) {
                res.status(500).json({ success: false, error: err.message });
            }
        });

        app.get("/api/config", (req, res) => {
            try {
                const configPath = path.join(process.cwd(), "config.json");
                const data = fs.readFileSync(configPath, "utf-8");
                res.json({ success: true, data });
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/config", (req, res) => {
            try {
                const { configData } = req.body;
                JSON.parse(configData); 
                const configPath = path.join(process.cwd(), "config.json");
                fs.writeFileSync(configPath, configData, "utf-8");
                res.json({ success: true, message: "Config updated! Restart bot to apply." });
            } catch (e) {
                res.json({ success: false, message: "Invalid JSON or error saving: " + e.message });
            }
        });

        app.get("/api/threads", async (req, res) => {
            try {
                const threads = (await threadsData.getAll()) || [];
                const data = threads.map(t => ({ id: t.threadID, name: t.threadName || "Unknown", members: t.members ? t.members.length : 0 }));
                res.json({ success: true, data });
            } catch (e) {
                res.json({ success: false, data: [] });
            }
        });

        app.get("/api/users", async (req, res) => {
            try {
                const users = (await usersData.getAll()) || [];
                const data = users.map(u => ({ id: u.userID, name: u.name || "Unknown" }));
                res.json({ success: true, data });
            } catch (e) {
                res.json({ success: false, data: [] });
            }
        });

        app.get("/api/commands", (req, res) => {
            let cmds = [];
            if (global.GoatBot && global.GoatBot.commands) {
                for (const [name, cmdObj] of global.GoatBot.commands.entries()) {
                    cmds.push({
                        name: name,
                        category: (cmdObj.config && cmdObj.config.category) ? cmdObj.config.category : "uncategorized"
                    });
                }
            }
            
            let events = [];
            if (global.GoatBot && global.GoatBot.events && global.GoatBot.events.size > 0) {
                for (const [name, eventObj] of global.GoatBot.events.entries()) {
                    events.push({ name: name, category: "events" });
                }
            } else {
                try {
                    const eventsPath = path.join(process.cwd(), "scripts", "events");
                    if (fs.existsSync(eventsPath)) {
                        const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
                        for (const f of files) {
                            events.push({ name: f.replace(".js", ""), category: "events" });
                        }
                    }
                } catch (e) {}
            }

            res.json({ success: true, data: cmds, events: events });
        });

        app.get("/api/command/:name", (req, res) => {
            try {
                const cmdPath = path.join(process.cwd(), "scripts", "cmds", req.params.name + ".js");
                if (fs.existsSync(cmdPath)) {
                    const data = fs.readFileSync(cmdPath, "utf-8");
                    res.json({ success: true, data });
                } else {
                    res.json({ success: false, message: "File not found" });
                }
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/command/:name", (req, res) => {
            try {
                const cmdPath = path.join(process.cwd(), "scripts", "cmds", req.params.name + ".js");
                const { code } = req.body;
                if (!code) return res.json({ success: false, message: "No code provided" });
                fs.writeFileSync(cmdPath, code, "utf-8");
                res.json({ success: true, message: "Command saved successfully! Reload command to apply." });
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/fs/list", (req, res) => {
            try {
                const targetPath = path.join(process.cwd(), req.body.path || "");
                if (!targetPath.startsWith(process.cwd())) return res.json({ success: false, message: "Access denied" });
                
                const stat = fs.statSync(targetPath);
                if (stat.isDirectory()) {
                    const items = fs.readdirSync(targetPath).map(file => {
                        const itemPath = path.join(targetPath, file);
                        const isDir = fs.statSync(itemPath).isDirectory();
                        return { name: file, isDir, path: path.relative(process.cwd(), itemPath) };
                    });
                    items.sort((a, b) => {
                        if (a.isDir && !b.isDir) return -1;
                        if (!a.isDir && b.isDir) return 1;
                        return a.name.localeCompare(b.name);
                    });
                    res.json({ success: true, type: "dir", data: items, currentPath: path.relative(process.cwd(), targetPath) });
                } else {
                    const data = fs.readFileSync(targetPath, "utf-8");
                    res.json({ success: true, type: "file", data, currentPath: path.relative(process.cwd(), targetPath) });
                }
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/fs/save", (req, res) => {
            try {
                const targetPath = path.join(process.cwd(), req.body.path);
                if (!targetPath.startsWith(process.cwd())) return res.json({ success: false, message: "Access denied" });
                fs.writeFileSync(targetPath, req.body.content, "utf-8");
                res.json({ success: true, message: "Saved successfully!" });
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/fs/rename", (req, res) => {
            try {
                const oldPath = path.join(process.cwd(), req.body.oldPath);
                const newPath = path.join(process.cwd(), req.body.newPath);
                if (!oldPath.startsWith(process.cwd())) return res.json({ success: false, message: "Access denied" });
                fs.renameSync(oldPath, newPath);
                res.json({ success: true, message: "Renamed successfully!" });
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/fs/delete", (req, res) => {
            try {
                const targetPath = path.join(process.cwd(), req.body.path);
                if (!targetPath.startsWith(process.cwd())) return res.json({ success: false, message: "Access denied" });
                const stat = fs.statSync(targetPath);
                if (stat.isDirectory()) fs.rmSync(targetPath, { recursive: true, force: true });
                else fs.unlinkSync(targetPath);
                res.json({ success: true, message: "Deleted successfully!" });
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.post("/api/fs/create", (req, res) => {
            try {
                const targetPath = path.join(process.cwd(), req.body.path);
                if (!targetPath.startsWith(process.cwd())) return res.json({ success: false, message: "Access denied" });
                if (req.body.isDir) {
                    fs.mkdirSync(targetPath, { recursive: true });
                } else {
                    fs.writeFileSync(targetPath, "", "utf-8");
                }
                res.json({ success: true, message: "Created successfully!" });
            } catch (e) {
                res.json({ success: false, message: e.message });
            }
        });

        app.get("/api/logs", (req, res) => {
            res.json({ success: true, data: global.dashboardLogs || [] });
        });

        app.post("/api/update-cookie", (req, res) => {
            try {
                const { cookie } = req.body;
                if (!cookie) return res.json({ success: false, message: "Cookie is empty!" });
                
                const accountPath = path.join(process.cwd(), "account.txt");
                const accountJson = path.join(process.cwd(), "account.json");
                fs.writeFileSync(accountPath, cookie);
                fs.writeFileSync(accountJson, cookie);
                
                res.json({ success: true, message: "Cookie updated successfully! Restart the bot to apply." });
            } catch (err) {
                res.json({ success: false, message: err.message });
            }
        });

        app.post("/api/restart", (req, res) => {
            res.json({ success: true, message: "Restarting..." });
            setTimeout(() => {
                process.exit(2);
            }, 1000);
        });

        app.post("/api/stop", (req, res) => {
            res.json({ success: true, message: "Stopping bot..." });
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        });

        app.post("/api/clear-cache", (req, res) => {
            try {
                if (global.client && global.client.cache) {
                    global.client.cache = {};
                }

                const cacheDir = path.join(process.cwd(), "scripts", "cmds", "cache");
                if (fs.existsSync(cacheDir)) {
                    const files = fs.readdirSync(cacheDir);
                    for (const file of files) {
                        const filePath = path.join(cacheDir, file);
                        if (fs.statSync(filePath).isFile()) {
                            fs.unlinkSync(filePath);
                        } else if (fs.statSync(filePath).isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        }
                    }
                }

                res.json({ success: true, message: "Cache cleared successfully!" });
            } catch (error) {
                res.json({ success: false, message: "Error clearing cache: " + error.message });
            }
        });

        app.use("/register", registerRoute);
        app.use("/login", loginRoute);
        app.use("/forgot-password", forgotPasswordRoute);
        app.use("/change-password", changePasswordRoute);
        app.use("/dashboard", dashBoardRoute);
        app.use("/verifyfbid", verifyFbidRoute);
        app.use("/api", apiRouter);

        app.get("*", (req, res) => {
                res.status(404).render("404");
        });

        // catch global error   
        app.use((err, req, res, next) => {
                if (err.message == "Login sessions require session support. Did you forget to use `express-session` middleware?")
                        return res.status(500).send(getText("app", "serverError"));
        });

        const PORT = process.env.PORT || config.dashBoard?.port || config.serverUptime?.port || 5000;
        const HOST = process.env.HOST || "0.0.0.0";
        const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_URL);
        const vercelUrl = process.env.VERCEL_URL ? (process.env.VERCEL_URL.startsWith("http") ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`) : (process.env.VERCEL ? "https://floppa-chatbot.vercel.app" : null);
        const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
        const renderUrl = process.env.RENDER_EXTERNAL_URL || vercelUrl;
        const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
        const dashBoardUrl = renderUrl || (
                replitDomain
                        ? `https://${replitDomain}`
                        : process.env.API_SERVER_EXTERNAL == "https://api.glitch.com"
                                ? `https://${process.env.PROJECT_DOMAIN}.glitch.me`
                                : `http://localhost:${PORT}`
        );

        function startServer(targetPort, targetHost = HOST) {
                return new Promise((resolve, reject) => {
                        const errorHandler = (err) => {
                                server.removeListener('listening', listenHandler);
                                reject(err);
                        };
                        const listenHandler = () => {
                                server.removeListener('error', errorHandler);
                                resolve(targetPort);
                        };
                        server.once('error', errorHandler);
                        server.once('listening', listenHandler);
                        server.listen(targetPort, targetHost);
                });
        }

        if (!isVercel && !process.env.NO_SERVER_LISTEN) {
                let actualPort = PORT;
                try {
                        actualPort = await startServer(PORT, HOST);
                } catch (err) {
                        if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
                                utils.log.warn("DASHBOARD", `Cannot bind to port ${PORT} (${err.code}). Trying fallback port 5000...`);
                                try {
                                        actualPort = await startServer(5000, HOST);
                                } catch (fallbackErr) {
                                        utils.log.warn("DASHBOARD", `Fallback port 5000 unavailable (${fallbackErr.code}). Trying random port...`);
                                        try {
                                                actualPort = await startServer(0, HOST);
                                                actualPort = server.address().port;
                                        } catch (finalErr) {
                                                utils.log.warn("DASHBOARD", `Could not start dashboard server: ${finalErr.message}`);
                                        }
                                }
                        } else {
                                utils.log.warn("DASHBOARD", `Dashboard server error: ${err.message}`);
                        }
                }
                const activeDashboardUrl = renderUrl || dashBoardUrl.replace(new RegExp(`:${PORT}$`), `:${actualPort}`);
                utils.log.info("DASHBOARD", `Dashboard is running on [${HOST}:${actualPort}] (${isRender ? "Render Cloud" : "Local/Container"}): ${activeDashboardUrl}`);
                if (config.serverUptime?.socket?.enable === true)
                        require("../bot/login/socketIO.js")(server);
        } else {
                utils.log.info("DASHBOARD", `Dashboard running in Serverless Mode (${vercelUrl || "floppa-chatbot.vercel.app"})`);
        }

        return app;
};



