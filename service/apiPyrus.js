const fetch = require('node-fetch');
const moment = require('moment');
const util = require('util')
require('dotenv').config()

class apiPyrus {
    _token = '';
    _idPhoneCatalog = 90007;
    _idClientCatalog = 75853;
    _botLogin = process.env.BOT_LOGIN;
    _botPassword = process.env.BOT_PASSWORD;
    _integration_guid = process.env.INTEGRATION_GUID;
    
    _createUndefinedPhone = async (task_id) => {
        const transformCatalog = ({catalog, phone, organization}) => {
            let modifycatalog = {
                apply: true,
                catalog_headers: catalog.catalog_headers.map(({name}) => {return name}),
                items: catalog.items.map(({values}) => {return {values}})
            }
            modifycatalog.items.push({
                    values: [
                        `+${phone}`,
                        '',
                        '',
                        `${organization}`
                    ]
                });
            return modifycatalog;
        }
        const MINUTES = 20000;
        setTimeout(async () => {
            const res = await fetch(`https://api.pyrus.com/v4/tasks/${task_id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token}`
                }
            });
            const {task:{fields}} = await res.json();
            const client = fields.filter(({id}) => {return id == 31 || id == 41});
            const phone = client[0]?.value;
            const organization = client[1]?.value.values[0];

            if(phone && organization){
                const res = await fetch(`https://api.pyrus.com/v4/catalogs/${this._idPhoneCatalog}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this._token}`
                    }
                });
                let catalog = await res.json();
                const modifyCatalog = transformCatalog({catalog, phone, organization});
                const res2 = await fetch(`https://api.pyrus.com/v4/catalogs/${this._idPhoneCatalog}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this._token}`
                    },
                    body: JSON.stringify(modifyCatalog)
                });
                const body = await res2.json();
                // console.log(body)
                console.log(`Клиент: ${phone}, Организация: ${organization}`)
                return;
            } 
            
            return false;
        }, MINUTES);
    }

    isInvalidToken(res) {
        return res.error && res.error_code == "invalid_token";
    }

    getToken = async () => {
        try {
            const res = await fetch(`https://api.pyrus.com/v4/auth?login=${this._botLogin}&security_key=${this._botPassword}`);
            const { access_token } = await res.json();
            this._token = access_token;
        } catch (error) {
            throw new Error(error)
        }
    }
    
    createTaskFromCall = async ({calleridnum, extension}) => {
        const call = {
            to: extension,
            from: calleridnum,
            extension: extension,
            integration_guid: this._integration_guid
        };
        const req = async () => {
            const res = await fetch('https://api.pyrus.com/v4/calls', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token}`
                },
                method: 'POST', 
                body: JSON.stringify(call),
            });
            const body = await res.json();
            return body;
        };
        try {
            let res = await req();
            if(this.isInvalidToken(res)){
                await this.getToken();
                res = await req();
            }
            console.log(res);
            return res;
        } catch (error) {
            throw new Error(error)
        }
       
    }

    getCatalog = async (catalog) => {
        const req = async () => {
            const res = await fetch(`https://api.pyrus.com/v4/catalogs/${catalog}`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token}`
                }
            });
            const body = await res.json();
            return body;
        }
        try {
            let res = await req();
            if(this.isInvalidToken(res)){
                await this.getToken();
                res = await req();
            }
            return res
        } catch (error) {
            throw new Error(error)
        }
    } 
    
    getTaskbyPhone = async ({calleridnum}) => {
        const req = async () => {
            const res = await fetch(`https://api.pyrus.com/v4/forms/759394/register?fld19=2&fld41=${calleridnum}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token}`
                }
            });
            const body = await res.json();
            return body;
        };
        try {
            let res = await req();

            if(this.isInvalidToken(res)){
                await this.getToken();
                res = await req();
            }

            if(Object.entries(await req()).length === 0){
                return false;
            } else {
                return res;
            }
        } catch (error) {
            throw new Error(error)
        }

    }

    editTask = async ({task_id, call_guid, calleridnum, connectedlinename}) => {

        const req = async (data) => {
            const res = await fetch(`https://api.pyrus.com/v4/tasks/${task_id}/comments`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token}`
                },
                method: 'POST',
                body: JSON.stringify(data),
            });
            const body = await res.json();
            return body;
        };

        const findUserbyPhone = async () => {
            const catalog = await this.getCatalog(this._idPhoneCatalog);
            const user = catalog.items.filter((item) => {
                return item.values[0] === `+${calleridnum}`;
            });

            if(user.length){
                return user[0];
            }

            this._createUndefinedPhone(task_id);
            return false;
        } 

        const findOrganizationbyName = async (organizationName) => {
           const catalog = await this.getCatalog(this._idClientCatalog);
           const client = catalog.items.filter((item) => {
                return item.values[0] == organizationName;
            });

            if(client.length){
                return client[0];
            }

            return false;
        }

        const user = await findUserbyPhone();
        // console.log(user);

        const organization = user ? await findOrganizationbyName(user.values[user.values.length - 1]) : false;
        // console.log(organization)

        const transformFiletArray = () => {
            const array = [{
                id: '36',
                value: moment().subtract(3, 'hours').format('HH:mm')
            },{
                id: '50',
                value: call_guid
            },{
                id: '3',
                value: `Создана новая задача — ${moment().format('YYYY-MM-DD, HH:mm')}, назначен ответственный ${connectedlinename}`
            },{
                id: '26',
                value: {
                    choice_id: '2'
                }
            }];
            if(organization){
                array.push({
                    id: "31",
                    value: {
                        item_id: organization.item_id
                    }
                })
            }
            if(user) {
                array.push({
                    id: '44',
                    value: user.values.join(' ')
                })
            }
            return array;
        }

        let res = await req({
            text: `Создана новая задача — ${moment().format('YYYY-MM-DD, HH:mm')}, назначен ответственный ${connectedlinename}`,
            subject: `Задача №${task_id}, номер телефона - ${calleridnum}`,
            field_updates: transformFiletArray()
        });
        
        if(this.isInvalidToken(res)){
            await this.getToken();
            res = await req();
        }

        return res
    }

    openNewWindowbyTask = async ({extension, call_guid}) => {
        const data = {
            event_type: 'show',
            extension: `${extension}`
        };
        try {
            const res = await fetch(`https://api.pyrus.com/v4/calls/${call_guid}/event`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token}`
                },
                body: JSON.stringify(data),
            });
        } catch (error) {
            throw new Error(error)
        }
    }


}

module.exports = apiPyrus;