let router = {}
let matches = {}
let playerInMatch = {}
let User = {}

const { match } = require('assert');
var fs = require('fs');
const { format } = require('path');
const { exit } = require('process');
const { inherits } = require('util');
var cards = JSON.parse(fs.readFileSync('client/cards.json', 'utf8'));

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
    for(let match in matches) {
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
            match.turn = 1
            startMatch(match)
        }
    } else {
        client.send("err not in a match")
    }
}
router['setready'] = setReady

let discardCardHandler = (cardIndex, playerID, match) => {
    let hand = match.userInfo[playerID].hand
    let discard = match.userInfo[playerID].discard

    hand.splice(hand.indexOf(cardIndex), 1)
    discard.push(cardIndex)
}

let discardCard = (id, client, args) => {
    let name = playerInMatch[id]
    let match = matches[name]

    let hand = match.userInfo[id].hand
    let discard = match.userInfo[id].discard

    hand.splice(hand.indexOf(args[0]), 1)
    discard.push(args[0])

    client.send("ok")
}
router['discard_card'] = discardCard

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

    broadcast(match, `! score (${User.getName(match.playersID[0])}) ${match.pt0} x ${match.pt1} (${User.getName(match.playersID[1])})`)

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
        if(match.userInfo[id].deck.length == 0) {
            let len = match.userInfo[id].discard.length
            for(let j = 0; j < len; j++)
                match.userInfo[id].deck.push(match.userInfo[id].discard.pop())
            let deck = match.userInfo[id].deck
            // Yates
            for(let k = deck.length - 1; k >= 0; k--) {
                let m = Math.floor(Math.random()*(k+1))
                let c = deck[k]
                deck[k] = deck[m]
                deck[m] = c
            }
        }
        let card = match.userInfo[id].deck.pop()
        match.userInfo[id].hand.push(card)
        User.getClient(id).send(`! drawcard ${card}`)
    }
}

let nextTurn = (match) => {
    while(match.dead0.length > 0) {
        let c = match.dead0.pop()
        match.arena[c.origem].criatura = 0
        User.getClient(match.playersID[0]).send(`! set_terreno_empty ${c.origem-8}`)
    }

    while(match.dead1.length > 0) {
        let c = match.dead1.pop()
        match.arena[c.origem].criatura = 0
        User.getClient(match.playersID[1]).send(`! set_terreno_empty ${(c.origem-7)*-1}`)
    }

    for(let i = 0; i < match.battle.length; i++) {
        if(match.battle[i].criatura !== 0) {
            let c = match.battle[i].criatura
            match.arena[c.origem].criatura.life = c.life
            let tgt = c.origem-8
            if(c.side === 1)
                tgt = (c.origem-7)*-1
            User.getClient(match.playersID[c.side]).send(`! set_terreno_criatura ${tgt} ${describeCreature(match.arena[c.origem].criatura)}`)
        }
    }

    let id0 = match.playersID[0]
    let id1 = match.playersID[1]

    let d0 = 5 - match.sp0 - match.userInfo[id0].hand.length
    let d1 = 5 - match.sp1 - match.userInfo[id1].hand.length

    if(d0 > 0) drawCards(match, id0, d0)
    if(d1 > 0) drawCards(match, id1, d1)

    broadcast(match, `! endbattle`)
    broadcast(match, `! score (${User.getName(id0)}) ${match.pt0} x ${match.pt1} (${User.getName(id1)})`)

    if(match.pt0 === 3) {
        broadcast(match, `! endmatch ${User.getName(id0)} wins`)
    }

    if(match.pt1 === 3) {
        broadcast(match, `! endmatch ${User.getName(id1)} wins`)
    }

    for(key of Object.keys(match.userInfo)) {
        match.userInfo[key].ready = false
    }
}

let endTurn = (id, client, args) => {
    if (id in playerInMatch) {
        let name = playerInMatch[id]
        let match = matches[name]
        match.userInfo[id].ready = true
        client.send("ok")

        if(bothPlayersReady(match)) {
            initBattle(match)
            sendArena(match)
            broadcast(match, `! cleanlog`)
            broadcast(match, `! gamelog Batalha ${match.turn} começou`)
            broadcast(match, `! showbattle`)
            setTimeout(() => { runBattle(match)}, 1000)
        }
    } else {
        client.send("err not in a match")
    }
}
router['endturn'] = endTurn

let initBattle = (match) => {
    match.battle = []
    match.alive0 = 0
    match.alive1 = 0
    match.dead0 = []
    match.dead1 = []
    for(let i = 0; i < 16; i++) {
        match.battle.push(deriveFrom(match, match.arena[i], i))
        if(match.battle[i].criatura !== 0) {
            if(match.battle[i].criatura.side == 0) {
                match.alive0++
            } else {
                match.alive1++
            }
        }
    }
}

let runBattle = (match) => {
    if(match.alive0 === 0 && match.alive1 === 0) {
        broadcast(match, "! gamelog Empate!")
        match.sp0 = 0
        match.sp1 = 0
        User.getClient(match.playersID[0]).send("! playlosesound")
        User.getClient(match.playersID[0]).send("! playlosesound")
        setTimeout(()=>{nextTurn(match)}, 3000)
    } else if(match.alive0 === 0) {
        match.pt1++
        match.sp1++
        match.sp0 = 0
        broadcast(match, `! gamelog ${User.getName(match.playersID[1])} ganhou o turno!`)
        User.getClient(match.playersID[0]).send("! playlosesound")
        User.getClient(match.playersID[1]).send("! playwinsound")
        setTimeout(()=>{nextTurn(match)}, 3000)
    } else if(match.alive1 === 0) {
        match.pt0++
        match.sp0++
        match.sp1 = 0
        broadcast(match, `! gamelog ${User.getName(match.playersID[0])} ganhou o turno!`)
        User.getClient(match.playersID[1]).send("! playlosesound")
        User.getClient(match.playersID[0]).send("! playwinsound")
        setTimeout(()=>{nextTurn(match)}, 3000)
    } else {
        let actor = getNextActor(match)
        match.battle[actor].criatura.movement -= 100
        act(match, actor)
        sendArena(match)
        setTimeout(() => {runBattle(match)}, 1000)
    }
}

let getNextActor = (match) => {
    let next = []
    for(let i = 0; i < 16; i++) {
        if(match.battle[i].criatura !== 0) {
            if(match.battle[i].criatura.movement >= 100) {
                next.push(match.battle[i].criatura)
            }
        }
    }
    if(next.length == 0) {
        for(let i = 0; i < 16; i++) {
            if(match.battle[i].criatura !== 0) {
                match.battle[i].criatura.movement += match.battle[i].criatura.velocidade
            }
        }
        return getNextActor(match)
    }
    let max = 0
    let cur = []
    for(let i = 0; i < next.length; i++) {
        if(next[i].movement === max) {
            cur.push(next[i])
        }
        if(next[i].movement > max) {
            max = next[i].movement
            cur = [next[i]]
        }
    }

    if(cur.length == 1)
        return cur[0].position
    else
        return cur[Math.floor(cur.length*Math.random())].position
}

let act = (match, actor) => {
    console.log(match)
    if(canAttack(match, actor)) {
        attack(match, actor)
    } else if(canMove(match, actor)) {
        move(match, actor)
    } else {
        charge(match, actor)
    }
}

let attack = (match, actor) => {
    let c = match.battle[actor].criatura
    let ph = inRange(match, actor, c.side, c.alcance)

    let min = 99999999999
    let hit = []
    for(let p of ph) {
        if((p.life + p.escudo) < min) {
            min = (p.life + p.escudo)
            hit = [p]
        } else if((p.life + p.escudo) === min) {
            hit.push(p)
        }
    }

    if(hit.length === 1) {
        deferAttack(match, actor, hit[0].position)
    } else {
        deferAttack(match, actor, hit[Math.floor(Math.random()*hit.length)].position)
    }
}

let deferAttack = (match, attack, defense) => {
    let crit = false
    let dead = false

    let chance = Math.random
    let a = match.battle[attack].criatura
    let d = match.battle[defense].criatura
    let ataque = a.poder
    
    if(chance < a.charge) {
        ataque = ataque * 2
        crit = true
        a.charge = a.critico
    }
    if(d.escudo > 0) {
        d.escudo -= ataque
        if(d.escudo < 0) {
            d.life += d.escudo
            d.escudo = 0
        }
    } else {
        d.life -= ataque
    }
    if(d.life <= 0) {
        if(d.side === 0) {
            match.dead0.push(d)
            match.alive0 -= 1
        } else {
            match.dead1.push(d)
            match.alive1 -= 1
        }
        match.battle[defense].criatura = 0
        dead = true
    }

    if(crit) {
        broadcast(match, `! gamelog ${a.nome} (${a.jogador}) acertou um CRíTICO! ☄️`)
        broadcast(match, `! gamelog ${a.nome} (${a.jogador}) causou ${ataque} de dano em ${d.nome} (${d.jogador})!`)
    }
    else
        broadcast(match, `! gamelog ${a.nome} (${a.jogador}) causou ${ataque} de dano em ${d.nome} (${d.jogador})`)

    if(dead)
        broadcast(match, `! gamelog ${d.nome} (${d.jogador}) morreu`)
}

let inRange = (match, position, side, alcance) => {
    let ret = []
    let x = position % 4;
    let y = Math.floor(position / 4)

    for(let i = 0; i < 16; i++) {
        let t = match.battle[i]
        if(t.criatura !== 0 && t.criatura.side !== side) {
            let ex = i%4
            let ey = Math.floor(i / 4)
            let dis = dist(x, y, ex, ey)
            if(dis <= alcance)
                ret.push(t.criatura)
        }
    }

    return ret
}

let canAttack = (match, actor) => {
    let c = match.battle[actor].criatura
    let md = mdte(match, actor, c.side)
    if(md <= c.alcance)
        return true
    return false
}

let canMove = (match, actor) => {
    let x = actor % 4;
    let y = Math.floor(actor / 4)

    if(y > 0 && match.battle[actor-4].criatura === 0)
        return true
    if(x > 0 && match.battle[actor-1].criatura === 0)
        return true
    if(y < 3 && match.battle[actor+4].criatura === 0)
        return true
    if(x < 3 && match.battle[actor+1].criatura === 0)
        return true
    
    return false
}

let move = (match, actor) => {
    let c = match.battle[actor].criatura

    let x = actor % 4;
    let y = Math.floor(actor / 4)

    canMoveTo = []

    if(y > 0 && match.battle[actor-4].criatura === 0)
        canMoveTo.push([actor-4, mdte(match, actor-4, c.side)])
    if(x > 0 && match.battle[actor-1].criatura === 0)
        canMoveTo.push([actor-1, mdte(match, actor-1, c.side)])
    if(y < 3 && match.battle[actor+4].criatura === 0)
        canMoveTo.push([actor+4, mdte(match, actor+4, c.side)])
    if(x < 3 && match.battle[actor+1].criatura === 0)
        canMoveTo.push([actor+1, mdte(match, actor-1, c.side)])

    let min = 999
    let minP = []

    for(let v of canMoveTo) {
        if(v[1] < min) {
            min = v[1]
            minP = [v[0]]
        } else if(v[1] === min) {
            minP.push(v[0])
        }
    }

    console.log(minP)
    if(minP.length === 1) {
        moveTo(match, actor, minP[0])
    } else {
        moveTo(match, actor, minP[Math.floor(Math.random()*minP.length)])
    }
}

let moveTo = (match, oldp, newp) => {
    let x = (newp % 4) + 1
    let y = Math.floor(newp / 4) + 1
    let c = match.battle[oldp].criatura
    console.log(oldp)
    console.log(newp)
    match.battle[oldp].criatura = 0
    match.battle[newp].criatura = c
    c.position = newp
    broadcast(match, `! gamelog ${c.nome} (${c.jogador}) moveu para ${x}x${y}`)
}

// minimal distance to enemy
let mdte = (match, position, side) => {
    let x = position % 4;
    let y = Math.floor(position / 4)

    let min = 999

    for(let i = 0; i < 16; i++) {
        let t = match.battle[i]
        if(t.criatura !== 0 && t.criatura.side !== side) {
            let ex = i%4
            let ey = Math.floor(i / 4)
            let dis = dist(x, y, ex, ey)
            if(dis < min)
                min = dis
        }
    }

    return min
}

let dist = (x, y, ex, ey) => {
    return (x < ex ? ex - x : x - ex) + (y < ey ? ey - y : y - ey)
}

let charge = (match, actor) => {
    let c = match.battle[actor].criatura
    c.charge += c.critico
    broadcast(match, `! gamelog ${c.nome} (${c.jogador}) critico aumentou para ${Math.floor(c.charge*100)}%`)
}

let deriveFrom = (match, terreno, index) => {
    let nt = new Terreno()
    nt.tipo = terreno.tipo
    nt.nivel = terreno.nivel
    if(terreno.criatura === 0)
        nt.criatura = 0
    else
        nt.criatura = deriveCreature(terreno.criatura, index, match)
    return nt
}

let deriveCreature = (criatura, index, match) => {
    let nc = new Criatura(criatura.id)
    for(key of Object.keys(criatura)) {
        nc[key] = criatura[key]
    }
    if(index < 8)
        nc.side = 1
    else
        nc.side = 0

    nc.jogador = User.getName(match.playersID[nc.side])
    nc.origem = index
    nc.position = index
    nc.escudo = nc.resistencia

    nc.movement = 0
    nc.charge = nc.critico * match.arena[index].nivel

    return nc
}

let sendArena = (match) => {
    for(let i = 0; i < 16; i++) {
        sendTerreno(match, match.battle[i], i)
    }
}

let sendTerreno = (match, terreno, index) => {
    broadcast(match, `! set_t_lv ${index} ${terreno.nivel}`)
    broadcast(match, `! set_t_tipo ${index} ${terreno.tipo}`)
    if(terreno.criatura === 0)
        broadcast(match, `! set_t_empty ${index}`)
    else
        broadcast(match, `! set_t_criatura ${index} ${describeCreature(terreno.criatura)}`)
}

let bothPlayersReady = (match) => {
    let i = 0
    for(key of Object.keys(match.userInfo)) {
        console.log(match.userInfo[key])
        if(match.userInfo[key].ready)
            i++
    }
    if(i === 2)
        return true
    
    return false
}

let getNumber = (id, client, args) => {
    let name = playerInMatch[id]
    let match = matches[name]
    let username = User.getName(id)
    broadcast(match, `! gamelog Player ${username} got number ${Math.floor(Math.random() * 100)}`)
    client.send("ok")
}
router['getnumber'] = getNumber

let playCard = (id, client, args) => {
    let cardIndex = args.shift()
    let card = cards[cardIndex]

    // user index
    let iU = Number(args.shift())
    // match index
    let iM = iU + 1
    let name = playerInMatch[id]
    let match = matches[name]
    if(id !== match.playersID[0])
        iM = -iM
    if(iM < 0)
        iM += 8
    else
        iM += 7

    let terreno = match.arena[iM]

    if(card.tipo === "criatura") {
        let criatura = new Criatura(cardIndex)
        terreno.criatura = criatura
        if(terreno.tipo === criatura.terreno && terreno.nivel < 3) {
            terreno.nivel += 1
            client.send(`! set_terreno_lv ${iU} ${terreno.nivel}`)
        } else if(terreno.nivel === 0) {
            terreno.nivel = 1
            terreno.tipo = criatura.terreno
            client.send(`! set_terreno_tipo ${iU} ${terreno.tipo}`)
            client.send(`! set_terreno_lv ${iU} ${terreno.nivel}`)
        } else {
            terreno.nivel -= 1
            if(terreno.nivel == 0) {
                terreno.tipo = "vazio"
                client.send(`! set_terreno_tipo ${iU} ${terreno.tipo}`)
            }
            client.send(`! set_terreno_lv ${iU} ${terreno.nivel}`)
        }
        
        client.send(`! set_terreno_criatura ${iU} ${describeCreature(criatura)}`)
    } else if(card.tipo === "efeito") {
        if(card.command === "cont incvel 5") {
            terreno.criatura.velocidade += 5
            client.send(`! set_terreno_criatura ${iU} ${describeCreature(terreno.criatura)}`)
        }
    } else {
        console.log("TODO this bit")
        exit(1)
    }
    
    discardCardHandler(cardIndex, id, match)
    client.send(`! discard ${cardIndex}`)
    client.send('ok')

    console.log(match)
}
router['play_card'] = playCard

let describeCreature = (criatura) => {
    if("side" in criatura)
        return `${criatura.id} ${criatura.alcance} ${criatura.poder} ${criatura.critico} ${criatura.life} ${criatura.resistencia} ${criatura.velocidade} ${criatura.side}`
    else
        return `${criatura.id} ${criatura.alcance} ${criatura.poder} ${criatura.critico} ${criatura.life} ${criatura.resistencia} ${criatura.velocidade}`

}

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
        this.turn = 1
        this.userInfo = {}
        this.arena = []
        this.pt0 = 0
        this.pt1 = 0
        this.sp0 = 0
        this.sp1 = 0
        for(let i = 0; i < 16; i++) {
            this.arena.push(new Terreno())
        }
        this.battle = []
    }
}

class PlayerState {
    constructor(cards) {
        this.cards = cards
        this.deck = []
        this.hand = []
        this.discard = []
        this.ready = false
    }
}

class Terreno {
    constructor() {
        this.criatura = 0
        this.nivel = 0
        this.tipo = "vazio"
    }
}

class Criatura {
    constructor(id) {
        let card = cards[id]
        this.nome = card.nome
        this.id = id
        this.nivel = card.nivel
        this.terreno = card.terreno
        this.alcance = card.alcance
        this.poder = card.poder
        this.critico = card.critico
        this.life = card.life
        this.resistencia = card.resistencia
        this.velocidade = card.velocidade
    }
}

(() => {
    module.exports.inject = inject
})()