/**
 * Command Suggestion Utility — "Did You Mean?" Dice's Coefficient (bigram matcher)
 * Imported from Cat-Bot engine
 */

function compareTwoStrings(first, second) {
	const f = first.replace(/\s+/g, '');
	const s = second.replace(/\s+/g, '');

	if (f === s) return 1;
	if (f.length < 2 || s.length < 2) return 0;

	const firstBigrams = new Map();
	for (let i = 0; i < f.length - 1; i++) {
		const bigram = f.substring(i, i + 2);
		firstBigrams.set(bigram, (firstBigrams.get(bigram) || 0) + 1);
	}

	let intersectionSize = 0;
	for (let i = 0; i < s.length - 1; i++) {
		const bigram = s.substring(i, i + 2);
		const count = firstBigrams.get(bigram) || 0;

		if (count > 0) {
			firstBigrams.set(bigram, count - 1);
			intersectionSize++;
		}
	}

	return (2.0 * intersectionSize) / (f.length + s.length - 2);
}

function findSimilarCommand(unknown, commandsMap) {
	if (!unknown || !commandsMap) return null;
	const targetCmd = unknown.toLowerCase().trim();
	const seen = new Set();
	const ratings = [];

	for (const [cmdName, mod] of commandsMap.entries()) {
		const canonical = (mod?.config?.name || cmdName).toLowerCase();
		if (seen.has(canonical)) continue;
		seen.add(canonical);

		const score = compareTwoStrings(targetCmd, canonical);
		ratings.push({ target: canonical, rating: score });

		if (mod?.config?.aliases && Array.isArray(mod.config.aliases)) {
			for (const alias of mod.config.aliases) {
				const aliasScore = compareTwoStrings(targetCmd, alias.toLowerCase());
				ratings.push({ target: canonical, rating: aliasScore });
			}
		}
	}

	ratings.sort((a, b) => b.rating - a.rating);

	const MIN_THRESHOLD = 0.35;
	if (ratings.length > 0 && ratings[0].rating >= MIN_THRESHOLD) {
		return ratings[0].target;
	}

	return null;
}

module.exports = {
	findSimilarCommand,
	compareTwoStrings
};
