const net = require('net');
const fs = require('fs');

const HOST = 'localhost';
const PORT = 3000;

// Create a new socket
const client = new net.Socket();
let ifResponseReceived = false;

const receivedPackets = [];
const receivedSequence = [];

// Connect to server
client.connect(PORT, HOST, () => {
    console.log('Connected to server');
    sendRequest();
});

// Function to send request to stream all packets
function sendRequest() {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt8(1, 0); // Request type - Stream All Packets
    console.log('Sending request to stream all packets');
    client.write(buffer);
}

// Event handler for data received from server
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

// Function to parse received data to packets
function parseData(data) {
    if (data.length % 17 !== 0) {
        console.error('Invalid data received');
        return;
    }
    const numPackets = data.length / 17; // 17 bytes per packet as defined in Response Payload Format (4 + 1 + 4 + 4 + 4)
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

// Function to save received packets to file
function saveToFile(packets) {
    packets.sort((a, b) => a.packetSequence - b.packetSequence); // Sort packets by sequence number
    try {
        fs.writeFileSync('response.json', JSON.stringify(packets, null, 2));
        console.log('Saved response to response.json');
    } catch (err) {
        console.error('Error saving response to file:', err);
    }
}

// Function to find missing packets using sequence number
function missingSequenceFind() {
    const expectedSequence = Array.from({ length: receivedSequence[receivedSequence.length - 1] + 1 }, (_, i) => i);
    let missingSeq = expectedSequence.filter(num => !receivedSequence.includes(num));
    missingSeq.shift(); // SInce packets start from 1 and not 0
    return missingSeq;
}

// Function to request missing packets
function getMissingPackets(missingSequence) {
    client.connect(PORT, HOST, () => {
        console.log('Reconnected to server');
        missingSequence.forEach(num => {
            const buffer = Buffer.alloc(2);
            buffer.writeUInt8(2, 0); // Write request type Resend Packet
            buffer.writeUInt8(num, 1); // Write missing sequence number
            console.log(`Requesting packet sequence number ${num}`);
            client.write(buffer);
        })
        client.end();
    });
}

// Event handler for connection close
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

setTimeout(() => { // Set timeout for connection
    if (!ifResponseReceived) {
        console.log('tiemout');
        client.destroy();
    }
}, 10000);
