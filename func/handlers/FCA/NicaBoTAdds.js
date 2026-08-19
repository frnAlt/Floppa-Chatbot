function binaryToDecimal(data) {
	let ret = "";
	while (data !== "0") {
		let end = 0;
		let fullName = "";
		let i = 0;
		for (; i < data.length; i++) {
			end = 2 * end + parseInt(data[i], 10);
			if (end >= 10) {
				fullName += "1";
				end -= 10;
			}
			else {
				fullName += "0";
			}
		}
		ret = end.toString() + ret;
		data = fullName.slice(fullName.indexOf("1"));
	}
	return ret;
}

function generateOfflineThreadingID() {
	const ret = Date.now();
	const value = Math.floor(Math.random() * 4294967295);
	const str = ("0000000000000000000000" + value.toString(2)).slice(-22);
	const msgs = ret.toString(2) + str;
	return binaryToDecimal(msgs);
}
module.exports = {
  generateOfflineThreadingID,
  binaryToDecimal
}