import path from 'node:path';
import * as fs from 'fs-extra';
import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static';

class IPCServer {
	private server = new Elysia();
	private port = 5131;
	private ws;
	constructor() {
		this.server.get('/compiledmods', ({ set }) => {
			if (!fs.existsSync(path.join(process.cwd(), 'mods', 'compiled-mods.js'))) {
				set.status = 404;
				return 'Compiled mods could not be found';
			}
			return Bun.file(path.join(process.cwd(), 'mods', 'compiled-mods.js'));
		});
		this.ws = this.server.ws('/ws', {
			query: t.Object({
				parent: t.String()
			}),
			body: t.Object({
				event: t.String(),
				message: t.String(),
			}),
			open(ws) {
				console.log(`[IPC] ${ws.data.query.parent} connected with id ${ws.id}`);
			},
			message(ws, message) {
				console.log(message);

				console.log(message.event, message.message);
			}
		});
	}

	start(callback: () => void = () => { }) {
		this.server.listen(this.port, callback);
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
