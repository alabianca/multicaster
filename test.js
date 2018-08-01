const net = require('net');

const address = process.argv[2];
const port = process.argv[3];

const Multicaster = require('./index')({
    address:address,
    port:port
});
const mdns = Multicaster.multicaster;
const subscription = Multicaster.register('spacedrop');
const self = require('./lib/address').me();
const id = address + ":" + port;


const server = net.createServer((socket)=>{
    console.log('We got a connection');
});

server.listen(port,address,()=>{
    console.log('Server @ ' + address + ' listening on port ' + port);

    mdns.on('response',onResponse);

    setInterval(()=>{
        mdns.scan('spacedrop');
    },3000);
});



function onResponse(res) {
    console.log('Got a Response ...');
    const answ = res.msg.answers[0];

    if(id != res.from) {
        
        if(answ && answ.name && answ.name === 'spacedrop') {
            console.log('It is a Peer!!');
        }
    }
}

