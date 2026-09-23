'use strict';

const logger = require('./logger');
const axios = require('axios');

const broadcastConfig = {
  enabled: false,
  data: [],
};

const fetchBroadcastData = async () => {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/priyanshufsdev/facebook-bot/main/Fca_BroadCast.json', { timeout: 10000 });
    broadcastConfig.data = typeof response.data === 'string' ? JSON.parse(response.data) : (response.data || []);
    return broadcastConfig.data;
  } catch (error) {
    logger.Error(`Failed to fetch broadcast data: ${error.message}`);
    broadcastConfig.data = [];
    return [];
  }
};

const broadcastRandomMessage = () => {
  const randomMessage = broadcastConfig.data.length > 0 ? broadcastConfig.data[Math.floor(Math.random() * broadcastConfig.data.length)] : 'Good Luck!';
  logger.Normal(randomMessage);
};

const startBroadcasting = async (enabled) => {
  enabled = Boolean(global.Fca?.Require?.Priyansh?.BroadCast);
  if (!enabled) return;
    try {
      await fetchBroadcastData();
      broadcastRandomMessage();
      const bTimer = setInterval(broadcastRandomMessage, 3600 * 1000);
      if (bTimer && bTimer.unref) bTimer.unref();
    } catch (error) {
      logger.Error(`Failed to start broadcasting: ${error.message}`);
    }
  }
};

module.exports = {
  startBroadcasting,
};
