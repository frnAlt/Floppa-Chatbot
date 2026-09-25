/**
 * @author Gtajisan (Farhan Muh Tasim)
 * ! Floppa-Chatbot Core Starter
 * ! Official repository: https://github.com/frnAlt/Floppa-Chatbot
 */

const { spawn } = require("child_process");
const os = require("os");
const log = require("./logger/log.js");
const pkg = require("./package.json");

function printDeployBanner() {
	const border = "─".repeat(Math.min(process.stdout.columns || 64, 64));
	console.log("\x1b[38;2;245;175;25m" + border + "\x1b[0m");
	console.log("\x1b[1m\x1b[38;2;250;139;255m  🐱 FLOPPA-CHATBOT \x1b[0m\x1b[38;2;43;210;255mv" + pkg.version + "\x1b[0m \x1b[90m— Intelligent Facebook Messenger Bot\x1b[0m");
	console.log("\x1b[38;2;245;175;25m" + border + "\x1b[0m");
	console.log(`  \x1b[36m•\x1b[0m \x1b[1mEnvironment:\x1b[0m   ${process.env.NODE_ENV || "production"}`);
	console.log(`  \x1b[36m•\x1b[0m \x1b[1mRuntime:\x1b[0m       Node ${process.version} on ${os.platform()} (${os.arch()})`);
	console.log(`  \x1b[36m•\x1b[0m \x1b[1mMemory Cap:\x1b[0m    400 MB old-space (V8 GC exposed)`);
	console.log(`  \x1b[36m•\x1b[0m \x1b[1mSupervisor PID:\x1b[0m${process.pid}`);
	console.log(`  \x1b[36m•\x1b[0m \x1b[1mRepository:\x1b[0m    https://github.com/frnAlt/Floppa-Chatbot`);
	console.log("\x1b[38;2;245;175;25m" + border + "\x1b[0m\n");
}

let isFirstStart = true;
function startProject() {
	if (isFirstStart) {
		printDeployBanner();
		isFirstStart = false;
	}
	// --expose-gc  : lets MemoryManager call global.gc() to force V8 GC when heap is high
	// --max-old-space-size=400 : caps V8 old-gen heap at 400 MB
	const child = spawn("node", ["--expose-gc", "--max-old-space-size=400", "Floppa.js"], {
		cwd: __dirname,
		stdio: "inherit",
		shell: false
	});

	child.on("close", (code) => {
		log.info("Floppa-Chatbot", `Project stopped with code: ${code}`);
		if (code === 0) {
			log.info("Floppa-Chatbot", "Stopped cleanly. Not restarting.");
			return;
		}
		if ((process.env.CI || process.env.GITHUB_ACTIONS) && code !== 2) {
			log.err("Floppa-Chatbot", `Process exited with code ${code} in CI/GitHub Actions. Not restarting.`);
			process.exit(code || 1);
		}
		const delay = code === 2 ? 0 : 3000;
		log.info("Floppa-Chatbot", `Restarting in ${delay / 1000}s...`);
		setTimeout(() => startProject(), delay);
	});
}

startProject();
