/**
 * @author Gtajisan (Farhan Muh Tasim)
 * ! Floppa-Chatbot Core Starter
 * ! Official repository: https://github.com/frnAlt/Floppa-Chatbot
 * Ecosystem Credits: Priyansh Rajput • NTKhang • Neoaz (xtreme-fca) • DongDev • frnAlt
 */

const { spawn } = require("child_process");
const os = require("os");
const log = require("./logger/log.js");
const pkg = require("./package.json");

// Ensure stdout and stderr flush immediately in non-TTY CI/GitHub Actions runners
if (process.stdout._handle && typeof process.stdout._handle.setBlocking === 'function') {
	process.stdout._handle.setBlocking(true);
}
if (process.stderr._handle && typeof process.stderr._handle.setBlocking === 'function') {
	process.stderr._handle.setBlocking(true);
}

let consecutiveCrashes = 0;
let lastCrashTime = 0;

function startProject() {
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
		const isCiOrRunner = Boolean(
			process.env.CI_TEST_MODE === 'true' ||
			process.env.CI === 'true' ||
			process.env.GITHUB_ACTIONS === 'true' ||
			process.env.RUNNER_MODE === 'true'
		);
		if (isCiOrRunner && code === 1) {
			log.err("Floppa-Chatbot", `Process exited with fatal code ${code} in CI/Runner environment. Halting supervisor.`);
			process.exit(code || 1);
		}
		if (process.env.CI_TEST_MODE === 'true' && code !== 2) {
			log.err("Floppa-Chatbot", `Process exited with code ${code} in CI test mode. Not restarting.`);
			process.exit(code || 1);
		}

		if (code === 2) {
			consecutiveCrashes = 0;
			log.info("Floppa-Chatbot", "Scheduled restart initiated...");
			startProject();
			return;
		}

		const now = Date.now();
		if (now - lastCrashTime < 60000) {
			consecutiveCrashes++;
		} else {
			consecutiveCrashes = 1;
		}
		lastCrashTime = now;

		if (consecutiveCrashes >= 5) {
			log.err("Floppa-Chatbot", `Process failed ${consecutiveCrashes} times consecutively within 60s. Halting supervisor.`);
			process.exit(code || 1);
		}

		const delay = 3000;
		log.info("Floppa-Chatbot", `Restarting in ${delay / 1000}s (failure count: ${consecutiveCrashes}/5)...`);
		setTimeout(() => startProject(), delay);
	});
}

startProject();
