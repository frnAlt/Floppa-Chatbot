module.exports = {
    config: {
        name: "addfriend",
        aliases: [],
        version: "2.4.71",
        author: "frnAlt",
        countDown: 10,
        role: 2,
        shortDescription: {
            en: "Send friend request to a user"
        },
        description: {
            en: "Send friend request to a Facebook user by their ID or profile URL"
        },
        category: "owner",
        guide: {
            en: "{pn} <userID> - Send friend request to user by ID\n{pn} <profile URL> - Send friend request to user by profile URL"
        }
    },

    ST: async function ({ api, message, args, getLang }) {
        try {
            if (!args[0]) {
                return message.reply("❌ Please provide a user ID or profile URL.\n\nUsage:\n• !sendfriendrequest 61579896599103\n• !sendfriendrequest https://www.facebook.com/profile.php?id=61579896599103");
            }

            let userID = args[0];

            // Extract user ID from Facebook profile URL if provided
            if (userID.includes("facebook.com")) {
                const urlMatch = userID.match(/(?:id=|profile\.php\?id=|facebook\.com\/)(\d+)/);
                if (urlMatch && urlMatch[1]) {
                    userID = urlMatch[1];
                } else {
                    return message.reply("❌ Could not extract user ID from the provided URL. Please check the URL format.");
                }
            }

            // Validate that userID contains only numbers
            if (!/^\d+$/.test(userID)) {
                return message.reply("❌ Invalid user ID format. Please provide a valid numeric user ID or Facebook profile URL.");
            }



            const result = await api.sendFriendRequest(userID);

            if (result && result.success) {
                let responseMessage = "✅ FRIEND REQUEST SENT SUCCESSFULLY!\n";
                responseMessage += "═══════════════════════════════\n\n";
                responseMessage += `👤 User ID: ${result.userID}\n`;
                responseMessage += `📝 Status: ${result.friendshipStatus}\n`;

                if (result.actionTitle) {
                    responseMessage += `⚡ Action: ${result.actionTitle}\n`;
                }

                responseMessage += "\n═══════════════════════════════";
                responseMessage += "\n💡 The friend request has been sent successfully!";

                message.reply(responseMessage);
            } else {
                message.reply(`❌ Failed to send friend request to user ID: ${userID}`);
            }

        } catch (error) {
            console.error("Error in sendfriendrequest command:", error);

            let errorMessage = "❌ An error occurred while sending friend request.\n\n";

            if (error.message && error.message.includes("GraphQL")) {
                errorMessage += "🔍 Error: GraphQL request failed\n";
                errorMessage += "💡 This might happen if:\n";
                errorMessage += "• The user ID doesn't exist\n";
                errorMessage += "• The user has blocked friend requests\n";
                errorMessage += "• You've already sent a request to this user\n";
                errorMessage += "• Rate limiting is in effect\n";
            } else if (error.error) {
                errorMessage += `🔍 Error: ${error.error}\n`;
            } else {
                errorMessage += "🔍 Error: Unknown error occurred\n";
            }

            errorMessage += "\nPlease try again later or check the user ID.";

            message.reply(errorMessage);
        }
    }
};

module.exports.onStart = module.exports.ST;
