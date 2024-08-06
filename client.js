const net = require('net');
const fs = require('fs');

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
    console.log('Data length : ', data.length);
    parseData(data);
    responseReceived = true;
});

function parseData(data) {
    numPackets = data.length / 17;

    let packets = [];

    for (let i = 0; i < numPackets; i++) {
        const packet = {
            symbol: data.toString('ascii', i * 17, i * 17 + 4).trim(),
            buysellindicator: data.toString('ascii', i * 17 + 4, i * 17 + 5).trim(),
            quantity: data.readInt32BE(i * 17 + 5),
            price: data.readInt32BE(i * 17 + 9),
            packetSequence: data.readInt32BE(i * 17 + 13),
        }
        console.log(packet);

        packets.push(packet);
    }

    fs.writeFileSync('response.json', JSON.stringify(packets, null, 2));
    console.log('Saved response to response.json');
}

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
