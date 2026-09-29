const express = require("express");
const router = express.Router();

module.exports = function ({ isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, threadsData, checkAuthConfigDashboardOfThread, imageExt, videoExt, audioExt, convertSize, drive, isVideoFile }) {
	router
		.get("/", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			let allThread = await threadsData.getAll();
			const isBotAdmin = req.user?.admin || (global.GoatBot?.config?.adminBot || []).includes(req.user.facebookUserID);
			if (!isBotAdmin) {
				allThread = allThread.filter(t => t.members.some(m => m.userID == req.user.facebookUserID && m.inGroup));
			}
			res.render("dashboard", { threads: allThread, isBotAdmin });
		})
		.get("/:threadID", [isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread], async (req, res) => {
			const { threadData } = req;
			let authConfigDashboard = true;
			const warnings = [];
			const isBotAdmin = req.user?.admin || (global.GoatBot?.config?.adminBot || []).includes(req.user.facebookUserID);
			if (!isBotAdmin && !(await checkAuthConfigDashboardOfThread(threadData, req.user.facebookUserID))) {
				warnings.push({ msg: "[!] Only group chat administrators or authorized members can modify dashboard settings." });
				authConfigDashboard = false;
			}
			delete req.threadData;
			res.render("dashboard-thread", {
				threadData,
				threadDataJSON: encodeURIComponent(JSON.stringify(threadData)),
				authConfigDashboard,
				warnings,
				isBotAdmin
			});
		})
		.get("/:threadID/:command", [isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread], async (req, res) => {
			const command = req.params.command;
			const threadData = req.threadData;
			const threadDataJSON = encodeURIComponent(JSON.stringify(threadData)); // prevent xss attack
			const variables = {
				threadID: req.params.threadID,
				threadData,
				threadDataJSON,
				command,
				imageExt,
				videoExt,
				audioExt,
				convertSize,
				isVideoFile
			};
			let renderFile;

			switch (command) {
				case "welcome": {
					renderFile = "dashboard-welcome";
					let pending = [];
					(threadData.data.welcomeAttachment || []).forEach(fileId => {
						pending.push(drive.default.files.get({
							fileId,
							fields: "name,mimeType,size,id,createdTime,webContentLink,fileExtension"
						}));
					});

					pending = (await Promise.allSettled(pending))
						.filter(item => item.status == "fulfilled")
						.map(({ value }) => {
							return {
								...value.data,
								urlDownload: value.data.webContentLink
							};
						});
					variables.defaultWelcomeMessage = global.GoatBot.configCommands.envEvents.welcome.defaultWelcomeMessage;
					variables.welcomeAttachments = pending;
					break;
				}
				case "leave": {
					renderFile = "dashboard-leave";
					let pending = [];
					(threadData.data.leaveAttachment || []).forEach(fileId => {
						pending.push(drive.default.files.get({
							fileId,
							fields: "name,mimeType,size,id,createdTime,webContentLink,fileExtension"
						}));
					});
					pending = (await Promise.allSettled(pending))
						.filter(item => item.status == "fulfilled")
						.map(({ value }) => {
							return {
								...value.data,
								urlDownload: value.data.webContentLink
							};
						});
					variables.defaultLeaveMessage = global.GoatBot.configCommands.envEvents.leave.defaultLeaveMessage;
					variables.leaveAttachments = pending;
					break;
				}
				case "rankup": {
					renderFile = "dashboard-rankup";
					break;
				}
				case "custom-cmd": {
					renderFile = "dashboard-custom-cmd";
					break;
				}
				default: {
					req.flash("errors", { msg: "Command not found" });
					return res.redirect("/dashboard");
				}
			}

			res.render(renderFile, variables);
		});

	return router;
};