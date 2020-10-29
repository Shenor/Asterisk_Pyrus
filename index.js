const ami = new require('asterisk-manager')(5038, '127.0.0.1', 'bx24', 'i8z3peuogxk', true)
const moment = require('moment');
const ApiPyrus = require('./service/apiPyrus');
const pyrus = new ApiPyrus();

ami.keepConnected();

//BlackList phone number
const blackList = [201, 301, '<unknown>'];
const isValidCall  = (event) => {
    return event.channel.match(/MCN/g) && !blackList.includes(+event.connectedlinename.split('/')[0]);
};

ami.on('bridgeenter', async (event) => {
    if(isValidCall(event)){
        console.log(moment().format('YYYY-MM-DD, HH:mm'));
        console.log(event);
        
        const {calleridnum, connectedlinename} = event;
        const extension = +connectedlinename.split('/')[0];
        const taskbyPhone = await pyrus.getTaskbyPhone({calleridnum})

            if(taskbyPhone){
                const {tasks} = taskbyPhone;
                const {value} = tasks[0].fields.filter(({id}) => {return id == 50})[0];
                await pyrus.openNewWindowbyTask({extension, call_guid: value});
                return;
            }

        const {task_id, call_guid} = await pyrus.createTaskFromCall({calleridnum, extension});
        const editableTask = await pyrus.editTask({task_id, call_guid, calleridnum, connectedlinename});
        await pyrus.openNewWindowbyTask({extension, call_guid});
        console.log(editableTask)
    }
});

// (async () => {
//     const test = await pyrus.getTaskbyPhone({calleridnum: '79186275537'})
//     if(test){
//         const {tasks} = test;
//         const {value:GUID} = tasks[0].fields.filter(({id}) => {return id == 50})[0];
//         console.log(GUID);
//     }
// })();