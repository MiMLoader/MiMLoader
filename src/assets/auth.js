const { shell } = require('electron');
const express = require('express');
const { console } = require('./console.js');

const app = express();

app.get('/auth/discord/callback', async (req, res) => {
	const code = req.query.code;
	const access_token = req.query.access_token;
    if (code !== '200') {
		res.sendFile(__dirname + '/error.html');
		console.warn('Auth failed');
        return auth.resolve();
    }
	console.log('Auth success');
	res.sendFile(__dirname + '/callback.html');
	auth.token = access_token;
	auth.isAuth = true;
    return auth.resolve();
});
let server;
const auth = {
    resolve: null,
    isAuth: false,
	token: null,
	server: {
		start: () => {
			return new Promise((resolve) => {
				server = app.listen(5313, () => {
					resolve();
				});
			});
		},
		stop: () => {
			server.close();
		},
	},
	start: async () => {
		await auth.server.start();
        shell.openExternal('https://mimloader.com/auth/login');
        await auth.complete;
        auth.server.stop();
	},
};
auth.complete = new Promise((resolve) => {
    auth.resolve = resolve;
}),


module.exports = auth;