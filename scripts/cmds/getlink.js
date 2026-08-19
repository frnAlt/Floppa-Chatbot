"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = defineCommand({
    meta: {
        name: "getlink",
        description: "Resolves FB Attachment URL",
        category: "Thread",
        version: "1.0.0",
        icon: "🔗",
    },
    async entry({ output, input }) {
        return output.reply(input.replier && input.replier?.attachmentUrls.length > 0
            ? input.replier.attachmentUrls.join("\n\n")
            : "❌");
    },
});
