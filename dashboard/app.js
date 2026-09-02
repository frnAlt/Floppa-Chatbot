const express = require("express");
const app = express();
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const fs = require("fs-extra");
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
const server = http.createServer(app);

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
        const sessionStore = new FloppaSessionStore();

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
                if (!isNaN(threadData))
                        threadData = await threadsData.get(threadData);
                return threadData.adminIDs?.includes(userID) || threadData.members?.some(m => m.userID == userID && m.permissionConfigDashboard == true) || false;
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

        app.get(["/", "/home", "/dashboard"], (req, res) => {
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

                fs.writeFile(process.cwd() + "/account.txt", fbstate, err => {
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
                return res.status(200).send({ status: "ok", uptime: process.uptime() });
        });

        // Health check endpoint for Render/Railway
        app.get("/health", (req, res) => {
                res.status(200).json({ status: "ok", uptime: process.uptime() });
        });

        app.get("/changefbstate", isAuthenticated, isVeryfiUserIDFacebook, isAdmin, (req, res) => {
                res.render("changeFbstate", {
                        currentFbstate: fs.readFileSync(process.cwd() + "/account.txt", "utf8")
                });
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

        const PORT = process.env.PORT || config.dashBoard.port || config.serverUptime.port || 3001;
        const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
        const dashBoardUrl = replitDomain
                ? `https://${replitDomain}`
                : process.env.API_SERVER_EXTERNAL == "https://api.glitch.com"
                        ? `https://${process.env.PROJECT_DOMAIN}.glitch.me`
                        : `http://localhost:${PORT}`;

        function startServer(targetPort) {
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
                        server.listen(targetPort);
                });
        }

        let actualPort = PORT;
        try {
                actualPort = await startServer(PORT);
        } catch (err) {
                if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
                        utils.log.warn("DASHBOARD", `Cannot bind to port ${PORT} (${err.code}). Trying fallback port 5000...`);
                        try {
                                actualPort = await startServer(5000);
                        } catch (fallbackErr) {
                                utils.log.warn("DASHBOARD", `Fallback port 5000 unavailable (${fallbackErr.code}). Trying random port...`);
                                try {
                                        actualPort = await startServer(0);
                                        actualPort = server.address().port;
                                } catch (finalErr) {
                                        utils.log.warn("DASHBOARD", `Could not start dashboard server: ${finalErr.message}`);
                                }
                        }
                } else {
                        utils.log.warn("DASHBOARD", `Dashboard server error: ${err.message}`);
                }
        }
        const activeDashboardUrl = dashBoardUrl.replace(new RegExp(`:${PORT}$`), `:${actualPort}`);
        utils.log.info("DASHBOARD", `Dashboard is running: ${activeDashboardUrl}`);
        if (config.serverUptime.socket.enable == true)
                require("../bot/login/socketIO.js")(server);
};



