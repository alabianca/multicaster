const dgram = require('dgram');
const EventEmitter = require('events').EventEmitter;
const packet = require('dns-packet');
const os = require('os');
const address = require('./lib/address');
const crypto = require('crypto')
const me = address.me;
const myNetworkInterfaces = address.myNetworkInterfaces();


module.exports = function(options) {
    const selfAddress = options.address || null;
    const selfPort = options.port || null;
    const MULTICAST_IPV4 = '224.0.0.251';
    const MULTICAST_PORT = 5353;
    const QTYPE = 'SRV';
    let SERVICE_NAME = null;
    let SERVICE_OWNER = null; // userDefined.[160 random bits] - ie: alexander.902810047512e62eeec0f57dbc8ff6e1c53110f6
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

    _socket.bind(MULTICAST_PORT);




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
        const messageInfo = _hasService(message.answers);
        let connectionInfo = null;
        if(messageInfo) { //filter out source of message
            const remoteAddress = rinfo.address;
            const isMe = _isThisMe(remoteAddress,messageInfo);

            //1. check if message came from my process
            if(isMe) {
                return; //don't bother emit response as it is me
            }

            //2. check if message came from another address locally
            if(_fromLocalAddress(remoteAddress)) {
                connectionInfo = messageInfo.address + ":" + messageInfo.port;
                multicaster.emit('response', {msg:message,from: connectionInfo});
                return;
            }

            //3. message came from a remote
            connectionInfo = rinfo.address + ":" + rinfo.port;
            multicaster.emit('response', {msg:message, from: connectionInfo});
        }
    }

    function _emitQuery(message,rinfo) {
        multicaster.emit('query', {msg:message,from:rinfo.address + ':' + rinfo.port});
    }

    function _myId(rinfo) {

        const address = selfAddress ? selfAddress : rinfo.address;
        const port = selfPort ? selfPort : rinfo.port;

        return address + ":" + port;
        
    }

    //check whether the response contains the service we are scanning for
    function _hasService(answers) {
        for(let i = 0; i<answers.length; i++) {
            if(answers[i].name) {
                const split = answers[i].name.split('.');
                const service = split[split.length-1];
                const sender = split[0] + '.' + split[1];
                if(service === SERVICE_NAME) {
                    return {
                        owner: sender,
                        port: answers[i].data.port,
                        address: answers[i].data.target
                    };
                }
            }
        }
        return null;
    }

    function _isThisMe(remoteAddress, msgInfo) {
        const found = myNetworkInterfaces.find(interface => interface.address === remoteAddress);
        if(found && msgInfo.owner === SERVICE_OWNER) {
            return true;
        }

        return false;
    }

    function _fromLocalAddress(remoteAddress) {
        const found = myNetworkInterfaces.find(interface => interface.address === remoteAddress);

        if(found) {
            return true;
        }

        return false;
    }


    //PUPLIC FUNCTIONS
    const register = function(name) {
        const random = crypto.randomBytes(20); //160 bit random buffer
        const split = name.split('.');
        SERVICE_NAME = split[split.length-1];
        SERVICE_OWNER = split[0] + '.'  + random.toString('hex');
        multicaster.on('query', (query)=>{
            const qs = query.msg.questions;

            for(let i = 0; i<qs.length; i++) {
                if(qs[i].name) {
                    
                    const splitName = qs[i].name.split('.');
                    const trimmed = splitName[splitName.length-1];
                    
                    if(trimmed == SERVICE_NAME) {
                        //respond
                        multicaster.respond({
                            name: SERVICE_OWNER + "." + trimmed,
                            qtype: QTYPE,
                            ttl: 225,
                            port: selfPort || MULTICAST_PORT,
                            target: selfAddress
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

    const getId = function() {
        return SERVICE_OWNER;
    }


    return {
        multicaster:multicaster,
        register: register,
        id: getId
    }
}

