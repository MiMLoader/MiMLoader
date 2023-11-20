console.log = (data) => {
    process.stdout.write(`[MIMLI] ${data}\n`);
};

console.log('Connecting to injection server...');
const injectionClient = new WebSocket('ws://localhost:6757');
injectionClient.onerror = (error) => {
    process.stdout.write(`[MIMLI | ws] ${error}`);
}
try {
    injectionClient.onopen = () => {
    injectionClient.send('Ive connected!');
    };
} catch (error) {
    console.log(error);
}
injectionClient.onmessage = (message) => {
    console.log(message.data);
    if (message.data === 'pause') {
        setTimeout(() => {
            console.log('Resuming...');
            injectionClient.send('resume');
        }, 10000);
    }
};

console.log(`PROCESS INFO: ${process.pid}`)