const dgram = require('dgram');
const EventEmitter = require('events').EventEmitter;
const packet = require('dns-packet');
const os = require('os');
const address = require('./lib/address');
const me = address.me;
const myNetworkInterfaces = address.myNetworkInterfaces();


module.exports = function(options) {
    const selfAddress = options.address || null;
    const selfPort = options.port || null;
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
        switch(decoded.type) {
            case "query": _emitQuery(decoded,rinfo);
                break;
            case "response": _emitResponse(decoded,rinfo);
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
        });
        _socket.send(buffer,0,buffer.length,MULTICAST_PORT,MULTICAST_IPV4);
    }

    
    
    multicaster.respond = function(response) {
        const buffer = packet.encode(_buildResponse(response));
        _socket.send(buffer,0,buffer.length,MULTICAST_PORT,MULTICAST_IPV4);
    }
    
    multicaster.stop = function() {
        clearInterval(intervalId);
        _socket.dropMembership(MULTICAST_IPV4);
        _socket.close();
    }

    //PRIVATE FUNCTIONS
    const _buildResponse = function(response) {
        const _packet = {type: 'response'};
        if(response.qtype === 'A' || !response.qtype) {
            _packet.answers = [{
                type:      'A',
                ttl:       response.ttl || 225,
                data:      response.data,
                name:      response.name
            }]
        }
        else if(response.qtype === 'SRV') {
            _packet.answers = [{
                type:      'SRV',
                class:     'IN',
                ttl:       response.ttl || 225,
                name:      response.name,
                data: {
                    port:  response.port,
                    target:response.target
                }
            }]
        }
        return _packet;
    }

    function _emitResponse(message,rinfo) {
        const remoteAddress = rinfo.address;
        const isMe = myNetworkInterfaces.find(interface => interface.address === remoteAddress);
        const id = _myId(rinfo);

        if(isMe && selfAddress) {
            multicaster.emit('response',{msg:message,from:id});
        } else {
            multicaster.emit('response', {msg:message,from:remoteAddress + ":" + rinfo.port});
        }
    }

    function _emitQuery(message,rinfo) {
        // const remoteAddress = rinfo.address;
        // const isMe = myNetworkInterfaces.find(interface => interface.address === remoteAddress);
        // const id = _myId(rinfo);
        // if(isMe && selfAddress) {
        //     multicaster.emit('query',{msg:message,from:id});
        // } else {
        //     multicaster.emit('query', {msg:message,from:remoteAddress + ':' + rinfo.port});
        // }
        multicaster.emit('query', {msg:message,from:rinfo.address + ':' + rinfo.port});
    }

    function _myId(rinfo) {
        const address = selfAddress ? selfAddress : rinfo.address;
        const port = selfPort ? selfPort : rinfo.port;

        return address + ":" + port;
        
    }


    //PUPLIC FUNCTIONS
    const register = function(name) {
  
        multicaster.on('query', (query)=>{
            const qs = query.msg.questions;

            for(let i = 0; i<qs.length; i++) {
                if(qs[i].name) {
                    const trimmed = qs[i].name.replace('.local', '');

                    if(trimmed == name) {
                        //respond
                        multicaster.respond({
                            name: qs[i].name,
                            qtype: QTYPE,
                            ttl: 225,
                            port: selfPort || MULTICAST_PORT,
                            target: me()
                        });
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

