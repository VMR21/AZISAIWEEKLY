const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS middleware
app.use(cors());

// API details
const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // your full key here

// Cache for leaderboard data
let leaderboardCache = [];

// Format usernames for privacy
const formatUsername = (username) => {
    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);
    return `${firstTwo}***${lastTwo}`;
};

// Calculate the current 7-day interval since May 1, 2025 UTC
function getCurrent7DayWindow() {
    const now = new Date();
    const base = new Date(Date.UTC(2025, 4, 1, 0, 0, 0)); // May is month 4 (0-indexed)
    const msIn7Days = 7 * 24 * 60 * 60 * 1000;
    const diff = now.getTime() - base.getTime();
    const intervalIndex = Math.floor(diff / msIn7Days);
    const startDate = new Date(base.getTime() + intervalIndex * msIn7Days);
    const endDate = new Date(startDate.getTime() + msIn7Days);
    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };
}

// Fetch leaderboard data
async function fetchLeaderboardData() {
    try {
        const { startDate, endDate } = getCurrent7DayWindow();

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
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
            .slice(0, 100000)
            .map((player) => ({
                username: formatUsername(player.username),
                wagered: Math.round(player.weightedWagered),
                weightedWager: Math.round(player.weightedWagered),
            }));

        console.log(`Leaderboard updated for ${startDate} to ${endDate}`);
    } catch (error) {
        console.error("Error fetching leaderboard data:", error.message);
    }
}

// Routes
app.get("/", (req, res) => {
    res.send("Welcome to the Leaderboard API. Access /leaderboard or /leaderboard/top14");
});

app.get("/leaderboard", (req, res) => {
    res.json(leaderboardCache);
});

app.get("/leaderboard/top14", (req, res) => {
    const top14 = leaderboardCache.slice(0, 14);
    res.json(top14);
});

// Initial data fetch and refresh every 5 mins
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Self-ping every 4 mins
setInterval(() => {
    axios.get("https://azisailbdata.onrender.com/leaderboard/top14")
        .then(() => console.log("Self-ping successful."))
        .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);
