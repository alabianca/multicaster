const os = require('os');


module.exports = function() {
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