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

// Get current JST weekly leaderboard window, ending Monday 23:59:59 JST
function getJSTWeeklyWindow() {
    // Current time in JST (UTC+9)
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // End date is the most recent Monday at 23:59:59 JST
    const end = new Date(now);
    let dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

    // If it's not Monday, go back to the previous Monday
    if (dayOfWeek !== 1) {
        let daysToSubtract = (dayOfWeek + 6) % 7;
        end.setUTCDate(now.getUTCDate() - daysToSubtract);
    }
    
    // Set time to 23:59:59 JST (which is 14:59:59 UTC on the same day)
    end.setUTCHours(14, 59, 59, 999);

    // Start date is the Tuesday of the previous week
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6); // Go back 6 days to the previous Tuesday
    start.setUTCHours(15, 0, 0, 0); // 00:00:00 JST (which is 15:00:00 UTC on the previous day)

    return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
    };
}

async function fetchLeaderboardData() {
    try {
        const period = getJSTWeeklyWindow();
        const { startDate, endDate } = period;

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

        console.log(`✅ Updated leaderboard cache for ${startDate} to ${endDate}`);
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

// Refresh cache every 5 mins
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Keep Render alive
setInterval(() => {
    axios.get("https://azisaiweekly-upnb.onrender.com/5000")
        .then(() => console.log("🔁 Self-ping success"))
        .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server live at port ${PORT}`);
});
