const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2YWU0ODdiLTU3MDYtNGE3ZS04YTY5LTMzYThhOWM5NjMxYiIsIm5vbmNlIjoiZWI2MzYyMWUtMTMwZi00ZTE0LTlmOWMtOTY3MGNiZGFmN2RiIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzI3MjQ2NjY1fQ.rVG_QKMcycBEnzIFiAQuixfu6K_oEkAq2Y8Gukco3b8"; // Use your full key

let leaderboardCache = [];

const formatUsername = (username) => {
    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);
    return `${firstTwo}***${lastTwo}`;
};

// Get current JST 7-day window based on fixed rounds
function getJST7DayPeriodWindow() {
    const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000); // convert to JST
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    const day = now.getUTCDate();
    let startDay, endDay;

    if (day >= 1 && day <= 7) {
        startDay = 1;
        endDay = 7;
    } else if (day >= 8 && day <= 14) {
        startDay = 8;
        endDay = 14;
    } else if (day >= 15 && day <= 21) {
        startDay = 15;
        endDay = 21;
    } else if (day >= 22 && day <= 28) {
        startDay = 22;
        endDay = 28;
    } else {
        return null; // no leaderboard during 29–31
    }

    const startDate = new Date(Date.UTC(year, month, startDay - 1, 15, 0, 1)); // JST 00:00:01 = UTC 15:00:01 prev day
    const endDate = new Date(Date.UTC(year, month, endDay, 14, 59, 59)); // JST 23:59:59 = UTC 14:59:59 same day

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };
}

async function fetchLeaderboardData() {
    try {
        const period = getJST7DayPeriodWindow();
        if (!period) {
            console.log("No active leaderboard period (29th–31st JST)");
            leaderboardCache = [];
            return;
        }

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

// Fetch leaderboard every 5 mins
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Self-ping to keep Render alive
setInterval(() => {
    axios.get("https://azisaiweekly-upnb.onrender.com/leaderboard/top14")
        .then(() => console.log("Self-ping successful."))
        .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);
