let router = {}
let matches = {}
let playerInMatch = {}
let User = {}

let inject = (tgt) => {
    for (key in router) {
        tgt.router[key] = router[key]
    }
    User = tgt
}
 
let sendUpdateMatches = () => {
    User.broadcast("update_matches")
}

let createMatch = (id, client, args) => {
    let desiredName = args[0]
    if (id in playerInMatch) {
        client.send("err already in match, please leave before joining or creating a new match")
    } else if (desiredName in matches) {
        client.send("err match name already used")
    } else {
        let match = new Match()
        match.playersID.push(id)
        matches[desiredName] = match
        playerInMatch[id] = desiredName
        registerPlayer(id, desiredName)
        client.send(`ok joined match ${desiredName}`)
        sendUpdateMatches()
    }
}
router['creatematch'] = createMatch

let registerPlayer = (playerID, matchName) => {
    let state = User.getState(playerID)
    let match = matches[matchName]
    state.inmatch = true
    state.dropMatch = () => {
        console.log(`Removing player ${User.getName(playerID)} from match ${matchName}`)
        removePlayer(match, playerID)
        sendUpdateMatches()
        if (match.playersID.length == 0) {
            delete matches[matchName]
        }
        delete playerInMatch[playerID]
    }
}

let getMatches = (id, client, args) => {
    let ret = "ok"
    for (match in matches) {
        ret = `${ret} ${match} ${matches[match].playersID.length}`
    }
    client.send(ret)
}
router['getmatches'] = getMatches

let joinMatch = (id, client, args) => {
    let matchName = args[0]
    if (matchName in matches) {
        let match = matches[matchName]
        if (match.playersID.length < match.capacity) {
            if (!(id in playerInMatch)) {
                match.playersID.push(id)
                playerInMatch[id] = matchName
                registerPlayer(id, matchName)
                client.send("ok joined match")
                sendUpdateMatches()
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
    if (id in playerInMatch) {
        let name = playerInMatch[id]
        let match = matches[name]
        removePlayer(match, id)
        if (match.playersID.length == 0) {
            delete matches[name]
        }
        delete playerInMatch[id]
        User.getState(id).inmatch = false
        client.send("ok")
        sendUpdateMatches()
    } else {
        client.send("err not in a match")
    }
}
router['leavematch'] = leaveMatch

let setReady = (id, client, args) => {
    if (id in playerInMatch) {
        let name = playerInMatch[id]
        let match = matches[name]
        match.playersReady.push(id)
        client.send("ok")
        match.userInfo[id] = new PlayerState(args)
        console.log(match)
        if (match.playersReady.length === match.capacity) {
            broadcast(match, "! matchbegin")
            match.ready = true
            match.turn = 0
            startMatch(match)
        }
    } else {
        client.send("err not in a match")
    }
}
router['setready'] = setReady

let prepareDeck = (userInfo) => {
    let deck = []
    userInfo.cards.forEach(card => {deck.push(card)})
    // Fisher-Yates
    for(let i = deck.length - 1; i >= 0; i--) {
        let j = Math.floor(Math.random()*(i+1))
        let c = deck[i]
        deck[i] = deck[j]
        deck[j] = c
    }
    userInfo.deck = deck
}

let startMatch = (match) => {
    let objv = (a) => {
        return Object.keys(a).map(k=>a[k])
    }

    objv(match.userInfo).forEach(info => {
        prepareDeck(info)
    })

    match.playersID.forEach(id => {
        drawCards(match, id, 5)
    })
    /*
    let id = match.playersID[match.turn % match.capacity]
    let client = User.getClient(id)
    let name = User.getName(id)
    match.playersID.forEach(id => {
        broadcast(match, `! gamelog Player ${User.getName(id)} cards are: ${match.userInfo[id].cards.join(' ')}`)
        drawCards(match, id)
    });
    client.send("! beginturn")
    broadcast(match, `! gamelog Player ${name} turn begun`)
    */
}

let drawCards = (match, id, n) => {
    for(let i = 0; i < n; i++) {
        let card = match.userInfo[id].deck.pop()
        match.userInfo[id].hand.push(card)
        User.getClient(id).send(`! drawcard ${card}`)
    }
}

let nextTurn = (match) => {
    match.turn = match.turn + 1
    let id = match.playersID[match.turn % match.capacity]
    let client = User.getClient(id)
    let name = User.getName(id)
    client.send("! beginturn")
    broadcast(match, `! gamelog Player ${name} turn begun`)
}

let endTurn = (id, client, args) => {
    if (id in playerInMatch) {
        let name = playerInMatch[id]
        let match = matches[name]
        nextTurn(match)
        client.send("ok")
    } else {
        client.send("err not in a match")
    }
}
router['endturn'] = endTurn

let getNumber = (id, client, args) => {
    let name = playerInMatch[id]
    let match = matches[name]
    let username = User.getName(id)
    broadcast(match, `! gamelog Player ${username} got number ${Math.floor(Math.random() * 100)}`)
    client.send("ok")
}
router['getnumber'] = getNumber

let broadcast = (match, msg) => {
    match.playersID.forEach((id) => {
        let client = User.getClient(id)
        client.send(msg)
    })
}

let removePlayer = (match, id) => {
    match.playersID = match.playersID.filter(x => x !== id)
}

class Match {
    constructor() {
        this.playersID = []
        this.playersReady = []
        this.capacity = 2
        this.ready = false
        this.turn = 0
        this.userInfo = {}
    }
}

class PlayerState {
    constructor(cards) {
        this.cards = cards
        this.deck = []
        this.hand = []
    }
}

(() => {
    module.exports.inject = inject
})()