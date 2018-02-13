
const os = require('os');
const myself = '192.168.1.220'
const multicaster = require('./index')().multicaster
const target = process.argv[2];



multicaster.on('response', (res)=>{
    const answ = res.msg.answers[0];
    
    if(answ.name && answ.name === target) {
        console.log(`Host Found: ${answ.data}`)
        multicaster.stop();
        process.exit(1);
    }
})


multicaster.on('query', (query)=>{

    if(myself !== query.from) {
        multicaster.respond()
    }
    
});


multicaster.scan(target);

setTimeout(()=>{
    console.log('Host not found');
    process.exit(1);
},5000)

