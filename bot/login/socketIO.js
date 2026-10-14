// This module will be called if enabled in the config (severUptime.socket.enable = true)
/**
 * @example for connect to socket.io
 * view file ./connectSocketIO.example.js
 */
const { Server } = require("socket.io");

module.exports = async (server) => {
	const utils = global.utils || {};
	const log = utils.log || console;
	const getText = utils.getText || ((sec, key) => key);
	const activeConfig = global.GoatBot?.config || global.FloppaBot?.config || {};
	const socketConfig = activeConfig.serverUptime?.socket;

	if (!socketConfig || socketConfig.enable !== true) {
		return;
	}

	const { channelName, verifyToken } = socketConfig;
	let io;

	try {
		if (!channelName)
			throw new Error('"channelName" is not defined in config');
		if (!verifyToken)
			throw new Error('"verifyToken" is not defined in config');
		if (server._socketIoAttached) {
			return; // Avoid attaching multiple Socket.IO instances to the same HTTP server
		}
		io = new Server(server, {
			cors: {
				origin: "*",
				methods: ["GET", "POST"]
			}
		});
		server._socketIoAttached = true;
		if (log.info) log.info("SOCKET IO", getText("socketIO", "connected") || "Connected to socket.io server");
	}
	catch (err) {
		if (log.err) return log.err("SOCKET IO", getText("socketIO", "error") || "Socket.IO error", err);
		return console.error("[SOCKET IO] Error:", err);
	}

	io.on("connection", (socket) => {
		if (socket.handshake.query.verifyToken != verifyToken) {
			io.to(socket.id).emit(channelName, {
				status: "error",
				message: "Token is invalid"
			});
			socket.disconnect();
			return;
		}
		if (log.info) log.info("SOCKET IO", `New client connected to socket: ${socket.id}`);
		io.to(socket.id).emit(channelName, {
			status: "success",
			message: "Connected to server successfully"
		});
		socket.on("disconnect", () => {
			if (log.info) log.info("SOCKET IO", `Client disconnected from socket: ${socket.id}`);
		});
	});
};

