/**
 * System Telemetry & Statistics Helper (func/systemStats.js)
 * 
 * Provides real-time metrics for CPU usage, Memory consumption, Uptime, and Load Average.
 */

const os = require("os");

function getSystemMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  const uptimeSeconds = os.uptime();
  const processUptimeSeconds = process.uptime();

  const loadAvg = os.loadavg();
  const cpus = os.cpus();

  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || "Generic CPU",
    memory: {
      totalMB: Math.round(totalMem / (1024 * 1024)),
      usedMB: Math.round(usedMem / (1024 * 1024)),
      freeMB: Math.round(freeMem / (1024 * 1024)),
      usagePercent: `${memUsagePercent}%`
    },
    uptime: {
      systemFormatted: formatUptime(uptimeSeconds),
      processFormatted: formatUptime(processUptimeSeconds),
      systemSeconds: uptimeSeconds,
      processSeconds: processUptimeSeconds
    },
    loadAverage: loadAvg.map(l => l.toFixed(2))
  };
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

module.exports = {
  getSystemMetrics,
  formatUptime
};
