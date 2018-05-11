
const os = require('os');
//const myself = '192.168.1.220'
const Multicaster = require('./index')();
const multicaster = Multicaster.multicaster;
const registration = Multicaster.register('test');

setTimeout(()=>{
    registration.unregister();
},5000);
//const target = process.argv[2];

const me = require('./lib/address');

// console.log(me())
// const myself = me();

// multicaster.on('response', (res)=>{
//     //console.log('GOT A RESPONSE');
//     //console.log(res.msg.answers);
//     const answ = res.msg.answers[0];
//     if(myself !== res.from) {
//         if(answ && answ.name && answ.name === 'spacedrop') {
//             console.log(`Host Found: ${answ.data.target}: ${answ.data.port}`)
//             multicaster.stop();
//             process.exit(1);
//         }
//     }
    
// })


// multicaster.on('query', (query)=>{
    
//     console.log('QUERY FROM: ', query.from)
//     if(myself !== query.from) {
//         console.log('RESPONDING TO: ' + query.from)
//         multicaster.respond({
//             name: 'spacedrop',
//             port: 3000,
//             target: myself
//         })
//     }
    
// });



// setInterval(()=>{
//     multicaster.scan(target);
// }, 5000)

// setTimeout(()=>{
//     console.log('Host not found');
//     process.exit(1);
// },10000)

