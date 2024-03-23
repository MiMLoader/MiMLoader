import path from 'node:path';
import express from 'express';
import * as fs from 'fs-extra';
import {createServer} from 'node:http';
import ws from 'ws';

const app = express();
const server = createServer(app);
const websocket = new ws.WebSocketServer({ noServer: true });
class IPCServer {
	private app = app;
	private server = server;
	private port = 5131;
	private websocket = websocket;
	constructor() {

		this.server.on('upgrade', (request, socket, head) => {
			try {
				this.websocket.handleUpgrade(request, socket, head, (ws) => {
					this.websocket.emit('connection', ws, request);
				});
			} catch (e) {
				console.error(e);
				socket.destroy();
			}
		});

		this.app.get('/compiledmods', (req, res) => {
			if (
				!fs.existsSync(path.join(process.cwd(), 'mods', 'compiled-mods.js'))
			) {
				res.status(404).send('Compiled mods not found');
				return;
			}
			const compiledMods = fs.readFileSync(
				path.join(process.cwd(), 'mods', 'compiled-mods.js'),
				'utf-8',
			);
			res.setHeader('Content-Type', 'application/javascript');
			res.send(compiledMods);
		});
	}

	start(callback: () => void = () => {}) {
		this.server.listen(this.port, callback);
	}

	hostAssets(name: string, location: string | null = null, mod = true) {
		if (mod) {
			this.app.use(
				`/mods/${name}/assets`,
				express.static(path.join(process.cwd(), 'mods', name, 'assets')),
			);
		} else {
			if (location === null) {
				throw new Error('Location is required for non-mod assets');
			}
			this.app.use(
				`/${name}`,
				express.static(path.join(process.cwd(), location as string)),
			);
		}
	}

	on(event: string, callback: (data: string) => void) {
		this.websocket.on(event, callback);
	}

	emit(data: string) {
		// @ts-ignore
		this.websocket.clients[0].send(data);
	}

	get portNumber() {
		return this.port;
	}

	set portNumber(port: number) {
		this.port = port;
	}

	get serverInstance() {
		return this.server;
	}

	get wsInstance() {
		return this.websocket;
	}
}

const ipc = new IPCServer();

export { IPCServer, ipc };
