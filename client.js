const net = require('net');

const HOST = 'localhost';
const PORT = 3000;

const client = new net.Socket();
let responseReceived = false;

client.connect(PORT, HOST, () => {
    console.log('Connected to server');
    sendRequest();
});

function sendRequest() {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt8(1, 0);
    console.log('Sending request to stream all packets');
    client.write(buffer);
}

client.on('data', (data) => {
    console.log('Received response!');
    console.log('Data : ', data);
    responseReceived = true;
});

client.on('close', () => {
    console.log('Connection closed');
    if (!responseReceived) {
        console.log('No response');
    }
    else{
        console.log('Response success!!!');
    }
});

client.on('error', (err) => {
    console.error('Connection error:', err);
});

setTimeout(() => {
    if (!responseReceived) {
        console.log('tiemout');
        client.destroy();
    }
}, 5000);
