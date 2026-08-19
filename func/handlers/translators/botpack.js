export function entry({ ...module }) {
  try {
    const { config, run, handleReply } = module;
    const cassidy = {
      meta: {
        ...config,
        permissions: config.hasPermssion === 2 ? [2] : [0, 1, 2],
        noPrefix: config.usePrefix === false
      },
      entry: run,
      async reply({ ...context }) {
        context.handleReply = context.repObj;
        await handleReply(context);
      }
    }
    return cassidy;
  } catch (err) {
    console.log(err);
    return module;
  }
}