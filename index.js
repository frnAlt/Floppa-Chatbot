/**
 * @author Gtajisan (Farhan Muh Tasim)
 * ! Floppa-Chatbot Core Starter
 * ! Official repository: https://github.com/frnAlt/Floppa-Chatbot
 */

const { spawn } = require("child_process");
const log = require("./logger/log.js");

function startProject() {
	// --expose-gc  : lets MemoryManager call global.gc() to force V8 GC when heap is high
	// --max-old-space-size=400 : caps V8 old-gen heap at 400 MB
	const child = spawn("node", ["--expose-gc", "--max-old-space-size=400", "Floppa.js"], {
		cwd: __dirname,
		stdio: "inherit",
		shell: true
	});

	child.on("close", (code) => {
		log.info("Floppa-Chatbot", `Project stopped with code: ${code}`);
		if (code === 0) {
			log.info("Floppa-Chatbot", "Stopped cleanly. Not restarting.");
			return;
		}
		const delay = code === 2 ? 0 : 3000;
		log.info("Floppa-Chatbot", `Restarting in ${delay / 1000}s...`);
		setTimeout(() => startProject(), delay);
	});
}

startProject();
