export default {
  category: "inventory",
  info: {
    purpose: "item_list_result",
    async hook(ctx, extra) {
      extra.finalRes = extra.finalRes.replace(
        /☆ \[font=fancy_italic\].+?\[:font=fancy_italic]\n\n/g,
        ""
      );

      return extra.finalRes;
    },
  },
  id: "hidecategoryinv",
  packageName: "Category Remover",
  packageDesc: "Removes category headers from the inventory display.",
  packagePermissions: [],
  importance: 1,
};
