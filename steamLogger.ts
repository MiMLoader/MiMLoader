let cwd = process.cwd();

const server = Bun.serve({
    port: 8080,
    fetch(request) {
        return new Response(`HELLO cwd=${cwd}`);
    },
});
console.log(`Listening on http://localhost:${server.port}`);