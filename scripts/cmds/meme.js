const axios = require("axios");

const mahmud = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
  return base.data.mahmud;
};

module.exports = {
  config: {
    name: "meme",
    aliases: ["memes"],
    version: "1.7",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    category: "fun",
    guide: "{pn}"
  },
  
  onStart: async function({ message, event, api }) {
    try {
      const apiUrl = await mahmud();
      const res = await axios.get(`${apiUrl}/api/meme`);
      const imageUrl = res.data?.imageUrl;
      
      if (!imageUrl) {
        return message.reply("Could not fetch meme. Please try again later.");
      }
      
      const stream = await axios({
        method: "GET",
        url: imageUrl,
        responseType: "stream",
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      await api.sendMessage({
        body: "🐸 | 𝐇𝐞𝐫𝐞'𝐬 𝐲𝐨𝐮𝐫 𝐫𝐚𝐧𝐝𝐨𝐦 𝐦𝐞𝐦𝐞",
        attachment: stream.data
      }, event.threadID, event.messageID);
      
      return;
    } catch (error) {
      return message.reply("An error occurred while fetching meme.");
    }
  }
};