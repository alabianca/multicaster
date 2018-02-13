
const os = require('os');
const myself = '192.168.1.220'
const multicaster = require('./index')().multicaster
const target = process.argv[2];

const me = require('./lib/address');

console.log(me())

multicaster.on('response', (res)=>{
    //console.log('GOT A RESPONSE');
    //console.log(res.msg.answers);
    const answ = res.msg.answers[0];
    if(answ && answ.name && answ.name === 'spacedrop') {
        console.log(`Host Found: ${answ.data.target}: ${answ.data.port}`)
        multicaster.stop();
        process.exit(1);
    }
})


multicaster.on('query', (query)=>{

    if(myself !== query.from) {
        console.log('RESPONDING TO: ' + query.from)
        multicaster.respond({
            name: 'spacedrop',
            port: 3000,
            target: me()
        })
    }
    
});


multicaster.scan(target);

setTimeout(()=>{
    console.log('Host not found');
    process.exit(1);
},10000)

