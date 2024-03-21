import path from 'node:path';
import express from 'express';
import * as fs from 'fs-extra';
import ws from 'ws';

const server = express();

class IPCServer {
	private server = server;
	private ws = new ws.Server({ noServer: true });
	private port = 5131;
	constructor() {
		// @ts-ignore
		this.server.on('upgrade', (req, socket, head) => {
			this.ws.handleUpgrade(req, socket, head, (socket) => {
				this.ws.emit('connection', socket, req);
			});
		});

		this.ws.on('connection', (socket) => {
			socket.on('message', (message) => {
				console.log('received: %s', message);
			});
		});

		this.server.get('/compiledmods', (req, res) => {
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
			this.server.use(
				`/mods/${name}/assets`,
				express.static(path.join(process.cwd(), 'mods', name, 'assets')),
			);
		} else {
			if (location === null) {
				throw new Error('Location is required for non-mod assets');
			}
			this.server.use(
				`/${name}`,
				express.static(path.join(process.cwd(), location as string)),
			);
		}
	}

	on(event: string, callback: (data: string) => void) {
		this.ws.on(event, callback);
	}

	emit(data: string) {
		// @ts-ignore
		this.ws.clients[0].send(data);
	}

	close() {
		this.ws.close();
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
		return this.ws;
	}
}

const ipc = new IPCServer();

export { IPCServer, ipc };
