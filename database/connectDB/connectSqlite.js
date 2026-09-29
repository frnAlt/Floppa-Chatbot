module.exports = async function () {
	const { Sequelize } = require("sequelize");
	const fs = require("fs-extra");
	const path = require("path");
	let storagePath = path.join(__dirname, "../data/data.sqlite");

	if (process.env.VERCEL) {
		const tmpPath = "/tmp/data.sqlite";
		try {
			if (!fs.existsSync(tmpPath) && fs.existsSync(storagePath)) {
				fs.copyFileSync(storagePath, tmpPath);
			}
			storagePath = tmpPath;
		} catch (_) {
			storagePath = ":memory:";
		}
	}

	const sequelize = new Sequelize({
		dialect: "sqlite",
		storage: storagePath,
		logging: false
	});

	const threadModel = require("../models/sqlite/thread.js")(sequelize);
	const userModel = require("../models/sqlite/user.js")(sequelize);
	const dashBoardModel = require("../models/sqlite/userDashBoard.js")(sequelize);
	const globalModel = require("../models/sqlite/global.js")(sequelize);

	await sequelize.sync({ force: false });

	return {
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		sequelize
	};
};