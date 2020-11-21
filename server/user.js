let clients = []
let states = {}
let names = {}

let addClient = (client) => {
    let id = this.clients.length
    this.clients.push(client)
    return id
}

let getClient = (id) => {
    return clients(id)
}

let getClientState = (id) => {
    return states(id)
}

let attach = (client) => {
    let id = addClient(client)
    states[id] = new UserState()
    setupHeartbeat(id)
}

let setupHeartbeat = (id) => {
    let client = getClient(id)
    let state = getClientState(id)
    state.didPong = false
    state.heartbeat = setTimeout(()=>{
        if(!state.didPong) {
            client.terminate()
            state.alive = false
        } else {
            
        }
    }, 5000)
}

class UserState {
    constructor() {
        this.alive = true
        this.initizalized = false
    }
}

(() => {
    module.exports.addClient = addClient
    module.exports.getClient = getClient
})()