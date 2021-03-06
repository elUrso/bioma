let clients = []
let states = {}
let names = {}
let router = {}

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
        dispatch(id, client, data)
    })
    client.on('close', () => {
        let state = getClientState(id);
        if(state.valid) {
            if(state.inmatch) {
                state.dropMatch()
            }
            let name = state.name
            delete names[name]
            delete states[id]
            broadcast(`message SYSTEM User <b>${name}</b> disconnected`)
            console.log(`Client ${id} (${name}) disconnected`)
        }
    })
}

let dispatch = (id, client, data) => {
    let slice = data.split(" ")
    let command = slice.shift()
    if(command in router) {
        router[command](id, client, slice)
    } else {
        client.send("err unknown command")
    }
}

let setUsername = (id, client, args) => {
    let desirededUsername = args[0]
    if(desirededUsername in names) {
        client.send("err username already in use")
    } else {
        names[desirededUsername] = id
        getClientState(id).name = desirededUsername
        getClientState(id).valid = true
        client.send(`ok username set to ${desirededUsername}`)
        broadcast(`message SYSTEM User <b>${desirededUsername}</b> connected`)
    }
}
router["setusername"] = setUsername

let getPlayers = (id, client, args) => {
    let ret = "ok"
    for(username in names) {
        ret = `${ret} ${username}`
    }
    client.send(ret)
}
router["getplayers"] = getPlayers

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

let getName = (id) => {
    return getClientState(id).name
}

let broadcast = (msg) => {
    for(id in clients) {
        if(id in states) {
            getClient(id).send(`! ${msg}`)
        }
    }
}

class UserState {
    constructor() {
        this.alive = true
        this.initizalized = false
        this.inmatch = false
    }
}

(() => {
    module.exports.addClient = addClient
    module.exports.getClient = getClient
    module.exports.getState = getClientState
    module.exports.getName = getName
    module.exports.attach = attach
    module.exports.router = router
    module.exports.broadcast = broadcast
})()