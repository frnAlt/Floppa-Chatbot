const express = require("express");
const router = express.Router();

module.exports = function ({ isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, threadsData, checkAuthConfigDashboardOfThread, imageExt, videoExt, audioExt, convertSize, drive, isVideoFile }) {
	router
		.get("/", async (req, res) => {
			let allThread = await threadsData.getAll();
			res.render("dashboard", { threads: allThread, isBotAdmin: true, user: req.user || null });
		})
		.get("/:threadID", async (req, res) => {
			const threadID = req.params.threadID;
			const threadData = await threadsData.get(threadID);
			if (!threadData) {
				req.flash("errors", { msg: "Thread not found" });
				return res.redirect("/dashboard");
			}
			res.render("dashboard-thread", {
				threadData,
				threadDataJSON: encodeURIComponent(JSON.stringify(threadData)),
				authConfigDashboard: true,
				warnings: [],
				isBotAdmin: true,
				user: req.user || null
			});
		})
		.get("/:threadID/:command", async (req, res) => {
			const command = req.params.command;
			const threadID = req.params.threadID;
			const threadData = await threadsData.get(threadID);
			if (!threadData) {
				req.flash("errors", { msg: "Thread not found" });
				return res.redirect("/dashboard");
			}
			const threadDataJSON = encodeURIComponent(JSON.stringify(threadData));
			const variables = {
				threadID,
				threadData,
				threadDataJSON,
				command,
				imageExt,
				videoExt,
				audioExt,
				convertSize,
				isVideoFile,
				user: req.user || null,
				authConfigDashboard: true
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