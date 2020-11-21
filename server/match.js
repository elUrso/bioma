let router = {}
let matches = {}
let playerInMatch = {}

let inject = (User) => {
    for(key in router) {
        User.router[key] = router[key]
    }
}

let createMatch = (id, client, args)  => {
    let desiredName = args[0]
    if(id in playerInMatch) {
        client.send("err already in match, please leave before joining or creating a new match")
    } else if(desiredName in matches) {
        client.send("err match name already used")
    } else {
        let match = new Match()
        match.playersID.push(id)
        matches[desiredName] = match
        playerInMatch[id] = desiredName
        client.send(`ok joined match ${desiredName}`)
    }
}
router['creatematch'] = createMatch

let getMatches = (id, client, args) => {
    let ret = "ok"
    for(match in matches) {
        ret = `${ret} ${match} ${matches[match].playersID.length}`
    }
    client.send(ret)
}
router['getmatches'] = getMatches

let joinMatch = (id, client, args) => {
    let matchName = args[0]
    if(matchName in matches) {
        let match = matches[matchName]
        if(match.playersID.length < match.capacity) {
            if(!(id in playerInMatch)) {
                match.playersID.push(id)
                playerInMatch[id] = matchName
                client.send("ok joined match")
            } else {
                client.send("err already in a match")
            }
        } else {
            client.send("err match is full")
        }
    } else {
        client.send("err match does not exist")
    }
}
router['joinmatch'] = joinMatch

let leaveMatch = (id, client, args) => {
    if(id in playerInMatch) {
        let name = playerInMatch[id]
        let match = matches[name]
        removePlayer(match, id)
        if(match.playersID == 0) {
            delete matches[name]
        }
        delete playerInMatch[id]
        client.send("ok")
    } else {
        client.send("err not in a match")
    }
}
router['leavematch'] = leaveMatch

let setReady = (id, client, args) => {
    if(id in playerInMatch) {
        let name = playerInMatch[id]
        let match = matches[name]
        match.playersReady.push(id)
        client.send("ok")
        if(match.playersReady.length == match.capacity)
            client.send("! matchbegin")
    } else {
        client.send("err not in a match")
    }
}
router['setready'] = setReady

let removePlayer = (match, id) => {
    match.playersID.splice(match.playersID.indexOf(id))
}

class Match {
    constructor() {
        this.playersID = []
        this.playersReady = []
        this.capacity = 2
    }
}

(() => {
    module.exports.inject = inject
})()