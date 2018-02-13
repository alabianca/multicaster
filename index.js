const dgram = require('dgram');
const EventEmitter = require('events').EventEmitter;
const packet = require('dns-packet');
const os = require('os');


module.exports = function() {
    const MULTICAST_IPV4 = '224.0.0.251';
    const MULTICAST_PORT = 5353;
    const QTYPE = 'SRV';
    let intervalId = null;
    const _socket = dgram.createSocket({
        type: 'udp4',
        reuseAddr:true
    });

    const multicaster = new EventEmitter();
    


    _socket.on('error', ()=>{
        //error handler
    });

    _socket.on('listening', ()=>{
        //listening
        _socket.addMembership(MULTICAST_IPV4)
    });

    _socket.on('message', (msg,rinfo)=>{
        //message received
        const decoded = packet.decode(msg);
        //console.log('ip' ,rinfo.address);
        //console.log(decoded)
        switch(decoded.type) {
            case "query": multicaster.emit('query', {msg: decoded,from:rinfo.address});
                break;
            case "response": multicaster.emit("response", {msg:decoded, from: rinfo.address});
                break;
        }
        
    });

    _socket.bind(MULTICAST_PORT)




    multicaster.scan = function(name) {
        const buffer = packet.encode({
            type: 'query',
            id: 1,
            flags: packet.RECURSION_DESIRED,
            questions: [
                {
                    type:QTYPE,
                    class:'IN',
                    name:name
                }
            ]
        })
        _socket.send(buffer,0,buffer.length,MULTICAST_PORT,MULTICAST_IPV4);
        // intervalId = setInterval(()=>{
        //     _socket.send(buffer,0,buffer.length,MULTICAST_PORT,MULTICAST_ADDRESS);
        // },5000);
    }

    
    
    multicaster.respond = function(response) {

        const buffer = packet.encode({
            type: 'response',
            answers: [{
                type:QTYPE,
                class: 'IN',
                name: response.name,
                data: {
                    port: response.port,
                    target: response.target
                }
            }]

        });

        _socket.send(buffer,0,buffer.length,MULTICAST_PORT,MULTICAST_IPV4);
    }
    
    multicaster.stop = function() {
        clearInterval(intervalId);
    }


    return {
        multicaster:multicaster
    }
}

