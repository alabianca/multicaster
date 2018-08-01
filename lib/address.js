const os = require('os');


const me = function() {
    const networkInterfaces = os.networkInterfaces();
    let interface;
    for(let iface in networkInterfaces) {
        for(let address of networkInterfaces[iface]) {
            if(address.family === 'IPv4' && !address.internal) {
                interface = address.address;
            }
        }
    }
    
    return interface;
}

const myNetworkInterfaces = function() {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = [];
    
    for(let iface in networkInterfaces) {
        for(let address of networkInterfaces[iface]) {
            interfaces.push(address);
        }
    }
    
    return interfaces;
}

module.exports.myNetworkInterfaces = myNetworkInterfaces;
module.exports.me = me;