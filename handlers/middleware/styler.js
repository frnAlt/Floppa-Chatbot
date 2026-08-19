const axios = require('axios');
const fs = require('fs');
process.on("unhandledRejection", (reason) => console.log(reason));
process.on("uncaughtException", (reason) => console.log(reason));
// Author: Liane
let isRegistered = false;

function styleRegister(api, options) {
  try {
    if (isRegistered) {
      return;
    }

    if (!options) {
      options = JSON.parse(fs.readFileSync('stylerConfig.json', 'utf8'));
    }

    const { sendMessage } = api;

    async function sendStyled(content, ...args) {
      try {
        let text = content;
        if (typeof content !== 'string') {
          text = content.body;
        }

        try {
          const styledText = await module.exports.styled(text, options);
          if (typeof content === 'string') {
            await sendMessage(styledText, ...args);
          } else {
            await sendMessage({ body: styledText, ...content }, ...args);
          }
          
        } catch (error) {
          console.log('Error styling text:', error.message);
        }
      } catch (error) {
        console.log('Error sending styled content:', error.message);
      }
    }

    api.sendMessage = sendStyled;
    isRegistered = true;
    return api;
  } catch (e) {
    console.error('Error in styleRegister:', e.message);
    return e;
  }
}

module.exports.register = styleRegister;
module.exports.styled = async (text, options) => {
  try {
    const { title, contentFont, titleFont } = options;

    try {
      const response = await axios.post('https://lianeapi.onrender.com/api/styler', {
        content: text,
        title,
        contentFont,
        titleFont,
      });

      if (!response.data) {
        throw new Error('Failed to fetch or style the content');
      }

      const result = response.data.message;
      return result;
    } catch (error) {
      console.error('Error in axios post:', error.message);
      return text;
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
    return text;
  }
};


/*
make stylerConfig.json

{
  "title": "✨ Example Title",
  "titleFont": "bold",
  "contentFont": "fancy"
}
*/

/*
require("./styler").register(api);
*/