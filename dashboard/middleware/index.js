function getThreadsData() {
	return global.db?.threadsData || null;
}

function isPostMethod(req) {
	return req.method == "POST";
}

module.exports = function (checkAuthConfigDashboardOfThread) {
	return {
		isAuthenticated(req, res, next) {
			if (req.isAuthenticated())
				return next();

			if (isPostMethod(req))
				return res.status(401).send({
					status: "error",
					error: "PERMISSION_DENIED",
					message: "You are not logged in"
				});

			req.flash("errors", { msg: "You must be logged in" });
			res.redirect(`/login?redirect=${req.originalUrl}`);
		},

		unAuthenticated(req, res, next) {
			if (!req.isAuthenticated())
				return next();

			if (isPostMethod(req))
				return res.status(401).send({
					status: "error",
					error: "PERMISSION_DENIED",
					message: "An error occurred"
				});

			res.redirect("/");
		},

		isVeryfiUserIDFacebook(req, res, next) {
			if (req.user.facebookUserID)
				return next();

			if (isPostMethod(req))
				return res.status(401).send({
					status: "error",
					error: "PERMISSION_DENIED",
					message: "You have not verified your Facebook ID"
				});

			req.flash("errors", { msg: "You must verify your Facebook ID before performing this action" });
			res.redirect(`/verifyfbid?redirect=${req.originalUrl}`);
		},

		isWaitVerifyAccount(req, res, next) {
			if (req.session.waitVerifyAccount)
				return next();

			if (isPostMethod(req))
				return res.status(401).send({
					status: "error",
					error: "PERMISSION_DENIED",
					message: "An error occurred, please try again"
				});

			res.redirect("/register");
		},

		async checkHasAndInThread(req, res, next) {
			const userID = req.user.facebookUserID;
			const threadID = isPostMethod(req) ? req.body.threadID : req.params.threadID;
			const tData = getThreadsData();
			const threadData = tData ? await tData.get(threadID) : null;

			if (!threadData) {
				if (isPostMethod(req))
					return res.status(401).send({
						status: "error",
						error: "PERMISSION_DENIED",
						message: "Thread not found"
					});

				req.flash("errors", { msg: "Thread not found" });
				return res.redirect("/dashboard");
			}

			const isBotAdmin = req.user?.admin || (global.GoatBot?.config?.adminBot || []).includes(userID);
			const findMember = threadData.members.find(m => m.userID == userID && m.inGroup == true);
			if (!findMember && !isBotAdmin) {
				if (isPostMethod(req))
					return res.status(401).send({
						status: "error",
						error: "PERMISSION_DENIED",
						message: "You are not a member of this chat group"
					});

				req.flash("errors", { msg: "You are not a member of this chat group" });
				return res.redirect("/dashboard");
			}
			req.threadData = threadData;
			next();
		},

		async middlewareCheckAuthConfigDashboardOfThread(req, res, next) {
			const threadID = isPostMethod(req) ? req.body.threadID : req.params.threadID;
			const isBotAdmin = req.user?.admin || (global.GoatBot?.config?.adminBot || []).includes(req.user.facebookUserID);
			if (isBotAdmin || (await checkAuthConfigDashboardOfThread(threadID, req.user.facebookUserID)))
				return next();

			if (isPostMethod(req))
				return res.status(401).send({
					status: "error",
					error: "PERMISSION_DENIED",
					message: "You do not have permission to modify this thread"
				});

			req.flash("errors", {
				msg: "[!] Only group chat administrators or authorized members can modify dashboard settings."
			});
			return res.redirect("/dashboard");
		},

		async isAdmin(req, res, next) {
			const userID = req.user.facebookUserID;
			const isBotAdmin = req.user?.admin || (global.GoatBot?.config?.adminBot || []).includes(userID);
			if (!isBotAdmin) {
				if (isPostMethod(req))
					return res.status(401).send({
						status: "error",
						error: "PERMISSION_DENIED",
						message: "You are not an administrator of this bot"
					});

				req.flash("errors", { msg: "You are not an administrator of this bot" });
				return res.redirect("/dashboard");
			}
			next();
		}
	};
};