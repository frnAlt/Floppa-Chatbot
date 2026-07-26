/**
 * Markdown to Styled Plain Text / Unicode converter
 * Imported from Cat-Bot engine
 * Suitable for Facebook Messenger plain text rendering
 */

function mdToText(md) {
	if (typeof md !== 'string') return md;
	
	let output = md;
	output = output
		.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
		.replace(/\*(.*?)\*/g, '$1')
		.replace(/`(.*?)`/g, '$1')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

	return output;
}

module.exports = { mdToText };
