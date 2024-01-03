const { Server } = require('socket.io');
const { createServer } = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);
const importQueue = [];

io.on('connection', (socket) => {
	console.log('Client connected');
	socket.on('disconnect', () => {
		console.log('Client disconnected');
	});
});

exports.modLoaderServer = {
	start: () => {
		const port = 5313;
		server.listen(port, () => {
			console.log(`Mod loader server listening on port ${port}`);
		});
	},
	stop: () => {
		server.close();
		console.log('Mod loader server stopped');
	},
	addImport: (mod, gamePath) => {
		app.use(
			`/mods/${mod.name}`,
			express.static(path.join(gamePath, 'mods', mod.name, mod.main))
		);
		app.use(
			`/mods/${mod.name}/assets`,
			express.static(path.join(gamePath, 'mods', mod.name, 'assets'))
		);
		mod.path = `http://localhost:5313/mods/${mod.name}`;
		importQueue.push(mod);
		console.log(`Added ${mod.name} to import queue`);
	},
	import: () => {
		importQueue.sort((a, b) => {
			return b.priority - a.priority;
		});
		importQueue.forEach((mod) => {
			io.emit('import', mod);
			console.log(`Imported ${mod.name}`);
		});
	},
	io: io,
};
