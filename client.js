const net = require('net');
const fs = require('fs');

const HOST = 'localhost';
const PORT = 3000;

const client = new net.Socket();
let ifResponseReceived = false;

const receivedPackets = [];
const receivedSequence = [];

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
    //console.log('Data : ', data);
    //console.log('Data length : ', data.length);
    const packets = parseData(data);
    packets.forEach((packet) => {
        receivedPackets.push(packet);
        receivedSequence.push(packet.packetSequence);
    })
    ifResponseReceived = true;
});

function parseData(data) {
    const numPackets = data.length / 17;
    console.log('Number of packets:', numPackets);
    const packets = [];

    for (let i = 0; i < numPackets; i++) {
        const packet = {
            symbol: data.toString('ascii', i * 17, i * 17 + 4).trim(),
            buysellindicator: data.toString('ascii', i * 17 + 4, i * 17 + 5).trim(),
            quantity: data.readInt32BE(i * 17 + 5),
            price: data.readInt32BE(i * 17 + 9),
            packetSequence: data.readInt32BE(i * 17 + 13),
        };
        packets.push(packet);
    }
    return packets;
}

function saveToFile(packets) {
    packets.sort((a, b) => a.packetSequence - b.packetSequence);
    try {
        fs.writeFileSync('response.json', JSON.stringify(packets, null, 2));
        console.log('Saved response to response.json');
    } catch (err) {
        console.error('Error saving response to file:', err);
    }
}

function missingSequenceFind() {
    const expectedSequence = Array.from({ length: receivedSequence[receivedSequence.length - 1] + 1 }, (_, i) => i);
    let a = expectedSequence.filter(num => !receivedSequence.includes(num));
    a.shift();
    return a;
}

function getMissingPackets(missingSequence) {
    client.connect(PORT, HOST, () => {
        console.log('Reconnected to server');
        missingSequence.forEach(num => {
            const buffer = Buffer.alloc(2);
            buffer.writeUInt8(2, 0);
            buffer.writeUInt8(num, 1);
            console.log(`Requesting packet sequence number ${num}`);
            client.write(buffer);
        })
        client.end();
    });

}

client.on('close', () => {
    console.log('Connection closed');
    if (!ifResponseReceived) {
        console.log('No response');
    } else {
        console.log('Response success!!!');
        missingSequence = missingSequenceFind();
        if (missingSequence.length > 0) {
            console.log('Missing sequence:', missingSequence);
            getMissingPackets(missingSequence);
        }
        saveToFile(receivedPackets);
    }
});

client.on('error', (err) => {
    console.error('Connection error:', err);
    return
});

setTimeout(() => {
    if (!ifResponseReceived) {
        console.log('tiemout');
        client.destroy();
    }
}, 10000);
