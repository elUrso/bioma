let clients = []
let states = {}
let names = {}

let addClient = (client) => {
    let id = clients.length
    clients.push(client)
    return id
}

let getClient = (id) => {
    return clients[id]
}

let getClientState = (id) => {
    return states[id]
}

let attach = (client) => {
    let id = addClient(client)
    states[id] = new UserState()
    setupHeartbeat(id)
    client.on('message', (data) => {
        console.log(`Got from ${id}: ${data}`)
        client.send('Hi!')
    })
    client.on('close', () => {
        console.log(`Client ${id} disconnected`)
    })
}

let setupHeartbeat = (id) => {
    let client = getClient(id)
    let state = getClientState(id)
    state.didPong = false
    state.heartbeat = () => {
        if(state.didPong) {
            state.didPong = false
            state.heartbeattimeout = setTimeout(state.heartbeat, 5000)
            client.ping(() => {})
        } else {
            client.terminate()
            state.alive = false
        }
    }
    client.on('pong', (_) => {
        state.didPong = true
    })
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
    module.exports.attach = attach
})()