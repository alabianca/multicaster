const net = require('net');
const Multicaster = require('multicaster')();
const address = process.argv[2];
const mdns = Multicaster.multicaster;
const subscription = Multicaster.register('spacedrop.local');
const self = me();


const server = net.createServer((socket)=>{
    console.log('We got a connection');
});

server.listen(3000,()=>{
    console.log('Server @ ' + address + ' listening on port 3000');

    mdns.on('response',onResponse);

    setInterval(()=>{
        mdns.scan('spacedrop.local');
    },3000);
})


function onResponse(res) {
    console.log('Got a Response ...');
    const answ = res.msg.answers[0];

    if(self != res.from) {
        if(answ && answ.name && answ.name === 'spacedrop') {
            console.log('It is a Peer!!');
        }
    }
}

