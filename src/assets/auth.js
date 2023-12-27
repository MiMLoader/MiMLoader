const { shell } = require('electron');
const express = require('express');
const axios = require('axios');

const server = express();


server.get('/auth/login', (req, res) => {
    res.sendFile(__dirname + '/login.html')
});

server.get('/auth/discord', (req, res) => {
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=1179513611719295106&response_type=code&redirect_uri=https%3A%2F%2Fmimloader.com%2Fauth%2Fdiscord%2Fcallback&scope=identify`);
});
server.get('/auth/discord/callback', async (req, res) => {
    console.log(req.query.token)
});

const auth = {
    isAuth: false,
    isConsent: false,
    token: null,
    server: {
        start: () => {
            return new Promise((resolve) => {
                server.listen(5313, () => {
                    console.log('Auth server started on port 5313');
                    resolve();
                });
            });
        },
        stop: () => {
            server.close()
        },
        app: server
    },
    start: async () => {
        await auth.server.start();
        shell.openExternal('http://localhost:5313/auth/login');
    },
};

auth.start();