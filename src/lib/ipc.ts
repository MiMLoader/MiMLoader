import path from 'node:path';
import * as fs from 'fs-extra';
import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static';

class IPCServer {
	private server = new Elysia();
	private port = 5131;
	private wsConnections = new Map<string, { ws: WebSocket, claim: string; }>();
	ws;
	claim;
	constructor() {
		this.server.get('/compiledmods', ({ set }) => {
			if (!fs.existsSync(path.join(process.cwd(), 'mods', 'compiled-mods.js'))) {
				set.status = 404;
				return 'Compiled mods could not be found';
			}
			return Bun.file(path.join(process.cwd(), 'mods', 'compiled-mods.js'));
		});
		this.claim = (handler: string) => {
			if (this.wsConnections.has(handler)) {

			}
		};
		this.ws = {
			server: this.server.ws('/ws', {
				query: t.Object({
					handler: t.String()
				}),
				body: t.Object({
					channel: t.String(),
					message: t.String(),
				}),
				open: (ws) => {
					console.log(`[IPC] ${ws.data.query.handler} connected.`);
					if (!this.wsConnections.has(ws.data.query.handler)) {
						this.wsConnections.set(ws.data.query.handler, { ws });
					} else {
						console.warn(`[IPC] ${ws.data.query.handler} already has an ipc connection, closing latest one.`);
						ws.close();
					}
				},
				message(ws, message) {
					if (message.channel === 'consoleLog' || message.channel === 'consoleWarn' || message.channel === 'consoleError') {
						console.log('[IPC][GAMELOG]', message.message);
						if (message.channel !== 'consoleLog') {
							console.warn(`[IPC][GAMELOG][${message.channel}] ${message.message}`);
						}
					} else {
						console.log('channel', message.channel);
						console.log('message', message.message);
					}
				},
				close(ws) {
					if (ws.data.query.handler === 'mimlAPI') {
						console.warn('[IPC] Lost connection the game. Exiting Process.');
						return process.exit(1);
					}
					console.log(`[IPC] ${ws.data.query.handler}(${ws.id}) disconnected`);
				}
			}),
			send: (handler: string, channel: string, message: string) => {
				if (!this.wsConnections.get(handler)?.ws) {
					console.warn(handler, 'hasn\'t connected but an attempt to send data has been made');
					return { success: false, message: 'Game side ipc hasn\'t connected' };
				}
				this.wsConnections.get(handler).ws.send({ channel: channel, message: message });
				return true;
			}
		};
	}

	start(callback: () => void = () => { }) {
		this.server.listen(this.port, callback);
	}

	close() {
		for (const ws of this.wsConnections) {
			ws.close();
		}
	}

	hostAssets(name: string, location: string | null = null, mod = true) {
		if (mod) {
			this.server.use(staticPlugin({
				prefix: `/mods/${name}/assets`,
				assets: path.join(process.cwd(), 'mods', name, 'assets')
			}));
		} else {
			if (location === null) {
				throw new Error('Location is required for non-mod assets');
			}
			this.server.use(staticPlugin({
				prefix: `/${name}`,
				assets: path.join(process.cwd(), location)
			}));
		}
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
}

const ipc = new IPCServer();

export { IPCServer, ipc };
