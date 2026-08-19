const axios = require("axios");

module.exports = {
  config: {
    name: "github",
    aliases: ["gh"],
    version: "2.4.75",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    description: {
      vi: "Tìm kiếm thông tin repository hoặc user trên GitHub",
      en: "Search repository or user info on GitHub"
    },
    category: "utility",
    guide: {
      en: "{pn} repo <user/repo>\n{pn} user <username>"
    }
  },

  onStart: async function ({ args, message }) {
    if (!args[0]) {
      return message.reply("🐙 GitHub Command Usage:\n/github user <username>\n/github repo <owner/repo>");
    }

    const type = args[0].toLowerCase();
    const query = args[1];

    if (!query) {
      return message.reply(`❌ Please provide a ${type === "repo" ? "repository (e.g. facebook/react)" : "username (e.g. torvalds)"}.`);
    }

    try {
      if (type === "user") {
        const { data } = await axios.get(`https://api.github.com/users/${encodeURIComponent(query)}`);
        let msg = `👤 GitHub User: ${data.name || data.login}\n`;
        msg += `🔗 Username: @${data.login}\n`;
        msg += `📦 Public Repos: ${data.public_repos}\n`;
        msg += `👥 Followers: ${data.followers} | Following: ${data.following}\n`;
        if (data.bio) msg += `📝 Bio: ${data.bio}\n`;
        msg += `🌐 Profile: ${data.html_url}`;

        const avatarStream = await global.utils.getStreamFromURL(data.avatar_url, "avatar.png");
        return message.reply({ body: msg, attachment: avatarStream });
      }

      if (type === "repo") {
        const { data } = await axios.get(`https://api.github.com/repos/${query}`);
        let msg = `📦 Repository: ${data.full_name}\n`;
        msg += `⭐ Stars: ${data.stargazers_count} | 🍴 Forks: ${data.forks_count}\n`;
        msg += `🐛 Open Issues: ${data.open_issues_count}\n`;
        msg += `💻 Language: ${data.language || "N/A"}\n`;
        if (data.description) msg += `📝 Description: ${data.description}\n`;
        msg += `🌐 URL: ${data.html_url}`;

        return message.reply(msg);
      }

      return message.reply("❌ Invalid subcommand. Use 'user' or 'repo'.");
    } catch (err) {
      return message.reply(`❌ GitHub API Error: ${err.response?.data?.message || err.message}`);
    }
  }
};
