const net = require('net');

const address = process.argv[2];
const port = process.argv[3];
const myname = process.argv[4];
const SERVICE_NAME = myname + '.' + "spacedrop";
console.log(SERVICE_NAME)
const Multicaster = require('multicaster')({
    address:address,
    port:port
});
const mdns = Multicaster.multicaster;
const subscription = Multicaster.register(SERVICE_NAME);
const self = require('./me').me();
const id = address + ":" + port;
let intervalId = null;
let receiveSocket = null;

const server = net.createServer((socket)=>{
    console.log('We got a connection');
    stopScanning();
    socket.write('hi');
});

server.listen(port,address,()=>{
    console.log('Server @ ' + address + ' listening on port ' + port);

    mdns.on('response',onResponse);

    intervalId = setInterval(()=>{
        mdns.scan(SERVICE_NAME);
    },3000);
});



function onResponse(res) {
    console.log('Got a Response ...', res.from);
    const answ = res.msg.answers[0];
    
    // establish connection
    if(id < res.from) { // ensure that only one of the peers is establishing a connection
        console.log('Connect');
        const connInfo = res.from.split(':');
        const host = connInfo[0];
        const port = connInfo[1];
        receiveSocket = net.connect({
            host: host,
            port: port
        });
        stopScanning();

        receiveSocket.on('data', (data) => {
            console.log(data);
        })
    }
}

function stopScanning() {
    clearInterval(intervalId);
    intervalId = null;
    subscription.unregister();
}