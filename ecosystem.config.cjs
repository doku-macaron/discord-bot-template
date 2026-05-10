module.exports = {
    apps: [
        {
            name: "discord-bot-template",
            script: "bun",
            args: "run start",
            autorestart: true,
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
