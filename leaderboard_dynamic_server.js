const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2YWU0ODdiLTU3MDYtNGE3ZS04YTY5LTMzYThhOWM5NjMxYiIsIm5vbmNlIjoiZWI2MzYyMWUtMTMwZi00ZTE0LTlmOWMtOTY3MGNiZGFmN2RiIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzI3MjQ2NjY1fQ.rVG_QKMcycBEnzIFiAQuixfu6K_oEkAq2Y8Gukco3b8";

let leaderboardCache = [];

const formatUsername = (username) => {
  const firstTwo = username.slice(0, 2);
  const lastTwo = username.slice(-2);
  return `${firstTwo}***${lastTwo}`;
};

// Weekly cycle from Tuesday 00:00:01 JST to next Monday 23:59:59 JST
function getJSTWeeklyPeriod() {
  const now = new Date();

  // Convert to JST
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffsetMs);

  // Find most recent Monday 23:59:59 JST
  const dayOfWeek = nowJST.getUTCDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Days since last Monday

  const lastMondayJST = new Date(
    Date.UTC(
      nowJST.getUTCFullYear(),
      nowJST.getUTCMonth(),
      nowJST.getUTCDate() - daysSinceMonday,
      14, 59, 59 // 23:59:59 JST = 14:59:59 UTC
    )
  );

  const startDate = new Date(lastMondayJST.getTime() + 2000); // Tuesday 00:00:01 JST
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399000); // Next Monday 23:59:59 JST

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

async function fetchLeaderboardData() {
  try {
    const { startDate, endDate } = getJSTWeeklyPeriod();

    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params: {
        userId: "26ae487b-5706-4a7e-8a69-33a8a9c9631b",
        startDate,
        endDate,
      },
    });

    const data = response.data;

    leaderboardCache = data
      .filter((player) => player.username !== "azisai205")
      .sort((a, b) => b.weightedWagered - a.weightedWagered)
      .map((player) => ({
        username: formatUsername(player.username),
        wagered: Math.round(player.weightedWagered),
        weightedWager: Math.round(player.weightedWagered),
      }));

    console.log(`✅ Leaderboard updated for ${startDate} → ${endDate}`);
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error.message);
  }
}

// Routes
app.get("/", (req, res) => {
  res.send("Welcome. Access /1000 or /5000 for this week's filtered data.");
});

app.get("/1000", (req, res) => {
  const filtered = leaderboardCache.filter(
    (p) => p.weightedWager >= 1000 && p.weightedWager < 5000
  );
  res.json(filtered);
});

app.get("/5000", (req, res) => {
  const filtered = leaderboardCache.filter((p) => p.weightedWager >= 5000);
  res.json(filtered);
});

// Refresh every 5 mins
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Keep Render alive
setInterval(() => {
  axios
    .get("https://azisaiweekly-upnb.onrender.com/5000")
    .then(() => console.log("🔁 Self-ping success"))
    .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
