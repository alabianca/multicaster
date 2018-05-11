const dgram = require('dgram');
const EventEmitter = require('events').EventEmitter;
const packet = require('dns-packet');
const os = require('os');
const me = require('./lib/address');


module.exports = function() {
    const MULTICAST_IPV4 = '224.0.0.251';
    const MULTICAST_PORT = 5353;
    const QTYPE = 'SRV';
    const myself = me();
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
        const buffer = packet.encode(_buildResponse(response));
        _socket.send(buffer,0,buffer.length,MULTICAST_PORT,MULTICAST_IPV4);
    }
    
    multicaster.stop = function() {
        console.log('stopping');
        clearInterval(intervalId);
        _socket.dropMembership(MULTICAST_IPV4);
        _socket.close();
    }

    //PRIVATE FUNCTIONS
    const _buildResponse = function(response) {
        const _packet = {type: 'response'};
   
        if(response.qtype === 'A' || !response.qtype) {
            _packet.answers = [{
                type: 'A',
                ttl: response.ttl || 225,
                data: response.data,
                name: response.name
            }]
        }
        else if(response.qtype === 'SRV') {
            _packet.answers = [{
                type: 'SRV',
                class: 'IN',
                name: response.name,
                data: {
                    port: response.port,
                    target: response.target
                }
            }]
        }
        return _packet;
    }


    //PUPLIC FUNCTIONS
    const register = function(name) {
        //console.log(myself);
  
        multicaster.on('query', (query)=>{
            const qs = query.msg.questions;
            
            for(let i = 0; i<qs.length; i++) {

                if(qs[i].name) {
                    const trimmed = qs[i].name.replace('.local', '');
 
                    if(trimmed == name) {
                        //respond
                        multicaster.respond({
                            name: qs[i].name,
                            qtype: 'A',
                            ttl: 225,
                            data: myself
                        });

                        //multicaster.stop();
                    }
                    
                }
            }
        });

        return {
            unregister:function() {
                multicaster.stop();
            }
        }

        
    }


    return {
        multicaster:multicaster,
        register: register
    }
}

