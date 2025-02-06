import path from 'node:path';
import { Elysia } from 'elysia';
import * as fs from 'fs-extra';

class IPCServer {
	private server = new Elysia();
	private port = 5131;
	constructor() {
		this.server.get('/compiledmods', ({ set }) => {
			if (
				!fs.existsSync(path.join(process.cwd(), 'mods', 'compiled-mods.js'))
			) {
				set.status = 404;
				return 'Compiled mods could not be found';
			}
			return Bun.file(path.join(process.cwd(), 'mods', 'compiled-mods.js'));
		});
	}

	start(callback: () => void = () => { }) {
		this.server.listen(this.port, callback);
	}

	hostAssets(name: string) {
		this.server.get(`mods/${name}/assets/:file`, async ({ params: { file }, set }) => {
			if (await Bun.file(path.join(process.cwd(), 'mods', name, 'assets', file)).exists())
				return Bun.file(path.join(process.cwd(), 'mods', name, 'assets', file));
			set.status = 404;
			return 'Not Found';
		});

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
