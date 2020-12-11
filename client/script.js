let socket = 0
let hanlderQueue = []
let router = {}
let messageSound = new Audio('audio/clearly-602.mp3')
let matchStartSound = new Audio('audio/confirm_style_5_echo_004.wav')
let drawSound = new Audio('audio/draw.mp3')
let eventSound = new Audio('audio/sound.wav')

let winSound = new Audio('audio/win.wav')
let loseSound = new Audio('audio/lose.mp3')

let Gamestate = {}
Gamestate.inmatch = false
let Username = ""

// add enter detection on login

document.querySelector("#usernameInputField").onkeydown = (e) => {
    if(e.key === "Enter") connect()
}

document.querySelector("#messageField").onkeydown = (e) => {
    if(e.key === "Enter") sendMessage()
}

// retrieve username

(() => {
    let name = localStorage.getItem("Username")
    if(name != null)
        document.querySelector("#usernameInputField").value = name
})();


// dev helper
(() => {
    document.querySelector("#loginView").style.display = "none"
    document.querySelector("#sessionView").style.display = "none"
    document.querySelector("#matchView").style.display = "flex"
});

// pull cards

let fetchCards = async () => {
    let content = await fetch("cards.json")
    let res = await content.json()
    cards = res
}

fetchCards()

let cards = 0

// update server name to current location

document.querySelector("#serverInputField").value = window.location.hostname

let connect = () => {
    let server = document.querySelector("#serverInputField").value
    let username = document.querySelector("#usernameInputField").value.replace(" ", "_")
    if(username === "") {
        alert("Insira um nome de usuário")
        return
    }
    if (socket == 0) {
        socket = new WebSocket(`ws://${server}:7234`)
        socket.onopen = (e) => {
            rpc(`setusername ${username}`, (e) => {
                let reply = e.data
                if (reply.startsWith("err")) {
                    alert(reply)
                    socket.close()
                } else {
                    let slices = reply.split(" ")
                    Username = slices[4]
                    localStorage.setItem("Username", Username)
                    loginComplete()
                }
            })
        }
        socket.onmessage = (e) => { consume(e) }
        socket.onclose = (e) => {
            resetUIState()
            console.log("Disconnected")
            socket = 0
        }
        socket.onerror = (e) => {
            console.log("Could not connect")
            alert("Não foi possível se conectar ao servidor")
        }
    } else {
        alert("a connection is already open")
    }
}

let loginComplete = () => {
    updateMatches()
    showLobby()
}

let showLobby = () => {
    document.querySelector("#loginView").style.display = "none"
    document.querySelector("#sessionView").style.display = "flex"
    document.querySelector("#lobby").style.display = "flex"
    document.querySelector("#matchSetup").style.display = "none"
    document.querySelector("#matchView").style.display = "none"
    document.querySelector("#logoutIcon").onclick = logout
}

let showMatchSetup = () => {
    document.querySelector("#loginView").style.display = "none"
    document.querySelector("#sessionView").style.display = "flex"
    document.querySelector("#lobby").style.display = "none"
    document.querySelector("#matchSetup").style.display = "flex"
    document.querySelector("#logoutIcon").onclick = leaveMatch
    document.querySelector("#matchPlayer1").innerHTML = "Esperando pelo jogador..."
    document.querySelector("#matchPlayer2").innerHTML = "Esperando pelo jogador..."
    document.querySelector("#matchView").style.display = "none"
    updateCardList()
    resetDeck()
}

let showMatchView = () => {
    document.querySelector("#loginView").style.display = "none"
    document.querySelector("#sessionView").style.display = "none"
    document.querySelector("#matchView").style.display = "flex"
}

let updateCardList = () => {
    let list = document.querySelector("#cardList .list")
    list.innerHTML = ""
    renderCards(cards, list)
}

let renderCards = (cards, list) => {
    for(index in cards) {
        let div = renderCard(cards[index])
        let i = index
        div.onclick = () => {
            addToDeck(i)
        }
        list.appendChild(div)
    }
}

let creatureDiv = document.createElement("div")
creatureDiv.classList.add("cardView")
creatureDiv.innerHTML = '<img src="res/blank.png" alt="Card Art"><div class="detail"><div class="title"><div class="name"></div><div class="kind"></div><div class="type"></div></div><div class="specs"><div class="range"></div><div class="power"></div><div class="critical"></div><div class="life"></div><div class="resistance"></div><div class="speed"></div></div></div>'

let effectDiv = document.createElement("div")
effectDiv.classList.add("cardView")
effectDiv.innerHTML = `<img src="res/skeleton-x4.gif" alt="Card Art"><div class="detail"><div class="title"><div class="name"></div><div class="kind"></div><div class="type"></div></div><div class="text"></div></div>`

let renderCard = (card) => {
    let div
    if(card.tipo == "criatura") {
        div = creatureDiv.cloneNode(true)
        div.querySelector(".name").innerHTML = card.nome
        if(card.nivel == 1) {
            div.querySelector(".kind").innerHTML = "(Lv. 1)"
        } else {
            div.querySelector(".kind").innerHTML = `(${cards[card.base].nome} Lv. ${card.nivel})`
        }
        div.querySelector(".type").innerHTML = `[${card.terreno}]`

        div.querySelector(".range").innerHTML = `${card.alcance}`
        div.querySelector(".power").innerHTML = `${card.poder}`
        div.querySelector(".critical").innerHTML = `${Math.floor(card.critico * 100)}%`
        div.querySelector(".life").innerHTML = `${card.life}`
        div.querySelector(".resistance").innerHTML = `${card.resistencia}`
        div.querySelector(".speed").innerHTML = `${card.velocidade}`
    } else {
        div = effectDiv.cloneNode(true)
        div.querySelector(".name").innerHTML = card.nome
        div.querySelector(".kind").innerHTML = "(Efeito)"
        div.querySelector(".text").innerHTML = card.desc
    }

    if('pic' in card)
        div.querySelector("img").src = card.pic

    return div
}

// Deck related stuff

let deck = []

let resetDeck = () => {
    deck = []
    renderDeck()
}

let renderDeck = () => {
    let check = document.querySelector("#deckList button")
    check.innerHTML = `Começar (${deck.length}/26 cards)`

    if(deck.length == 26)
        check.disabled = false
    else
        check.disabled = true

    let list = document.querySelector("#deckList ul")
    list.innerHTML = ""
    for(i in deck) {
        let j = deck[i]
        let li = document.createElement("li")
        li.innerHTML = `${cardName(j)} <a href="#" onclick="removeFromDeck(${i})">remove</a>`
        list.appendChild(li)
    }
}

let removeFromDeck = (i) => {
    deck.splice(i, 1)
    renderDeck()
}

let cardName = (i) => {
    let card = cards[i]
    if(card.tipo == "criatura") {
        if(card.nivel == 1)
            return `${card.nome} (Lv. 1) [${card.terreno}]`
        else
            return `${card.nome} (${cards[card.base].nome} Lv. ${card.nivel}) [${card.terreno}]`         
    } else {
        return `${card.nome} (Efeito)`
    }
}

let addToDeck = (index) => {
    let count = 0
    for(i of deck) if(i == index) count += 1
    if(deck.length == 26) {
        alert("Você já tem 26 cartas no seu deck")
    } else if(count > 3) {
        alert("Você já tem 4 cópias desta carta no seu deck")
    } else {
        deck.push(index)
        renderDeck()
    }
}

let storeDeck = () => {
    localStorage.setItem("deck", JSON.stringify(deck))
    alert("Deck salvo no navegador")
}

let restoreDeck = () => {
    let ret = localStorage.getItem("deck")
    if(ret == null) alert("Não há decks salvos")
    else {
        deck = JSON.parse(ret)
        renderDeck()
    }
}

let rpc = (msg, handler) => {
    if (socket != 0) {
        socket.send(msg)
        hanlderQueue.push(handler)
    }
}

let consume = (e) => {
    console.log(e)
    let split = e.data.split(" ")
    if (split.shift() != "!") {
        let handler = hanlderQueue.shift()
        handler(e)
    } else {
        dispatch(split)
    }
}

let dispatch = (args) => {
    let command = args.shift()
    if (command in router) {
        router[command](args)
    } else {
        alert(`err unknown command sent from server: ${command}`)
        console.log(args)
    }
}

let getPlayers = () => {
    if (socket != 0) {
        let ul = document.querySelector("#usersList")
        rpc("getplayers", (e) => {
            let players = e.data.split(" ")
            players.shift()
            players.sort()
            ul.innerHTML = renderPlayerList(players.sort())
        })
    } else {
        alert("Please, login before")
    }
}

let renderPlayerList = (players) => {
    let ret = ""
    players.forEach(username => {
        ret = `${ret}<li>${username}</li>`
    })
    return ret
}

let createMatch = () => {
    if (socket != 0) {
        let name = document.querySelector("#matchInputField").value
        rpc(`creatematch ${name}`, (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                showMatchSetup()
            }
        })
    } else {
        alert("Please, login before")
    }
}

let getMatches = () => {
    if (socket != 0) {
        let ul = document.querySelector("#matchList")
        rpc(`getmatches`, (e) => {
            let matches = e.data.split(" ")
            matches.shift()
            console.log(renderMatchList(matches))
            ul.innerHTML = renderMatchList(matches)
        })
    } else {
        alert("Please, login before")
    }
}

let renderMatchList = (matches) => {
    let ret = ""
    pair(matches).forEach((x) => {
        if(x[1] == "2") {
            ret = `${ret}<li>${x[0]} (${x[1]}/2)`
        } else {
            ret = `${ret}<li>${x[0]} (${x[1]}/2) <a href="#" onclick="joinMatch('${x[0]}')">join</a></li>`
        }
    })
    return ret
}

let pair = (list) => {
    let ret = []
    let i = 0
    while (i + 1 < list.length) {
        ret.push([list[i], list[i + 1]])
        i = i + 2
    }
    return ret
}

let joinMatch = (match) => {
    if (socket != 0) {
        rpc(`joinmatch ${match}`, (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                showMatchSetup()
            }
        })
    } else {
        alert("Please, login before")
    }
}

let leaveMatch = () => {
    if (socket != 0) {
        rpc("leavematch", (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                showLobby()
            }
        })
    } else {
        alert("Please, login before")
    }
}

let setReady = () => {
    if (socket != 0) {
        let cards = deck.join(" ")
        rpc(`setready ${cards}`, (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                document.querySelector("#matchPlayer1").innerHTML = `${Username} pronto`
                document.querySelector("#deckList button").disabled = true
                document.querySelector("#logoutIcon").style.display = "none"
            }
        })
    } else {
        alert("Please, login before")
    }
}

let matchBegin = (_) => {
    matchStartSound.play()
    document.querySelector("#globalChatIcon").style.display = "none"
    prepareMatchView()
    showMatchView()
    resetGame()
}
router["matchbegin"] = matchBegin

let prepareMatchView = () => {
    let fields = document.querySelectorAll("#halfField .field")
    fields.forEach(field => {
        field.classList = "field"
        field.innerHTML = ""
    })

    let handView = document.querySelector("#handView")
    handView.innerHTML = ""
}

let beginTurn = (_) => {
    let commands = document.querySelector("#commands")
    commands.style.display = "block"
}
router["beginturn"] = beginTurn

let endTurn = () => {
    if (socket != 0) {
        rpc("endturn", (e) => {
            document.querySelector("#waitingForPlayer").style.display = "flex"
        })
    } else {
        alert("Please, login before")
    }
}

let getNumber = () => {
    if (socket != 0) {
        rpc("getnumber", (_) => { })
    } else {
        alert("Please, login before")
    }
}

// setup card detail

let showDetail = (e) => {
    document.querySelector("#carddetail").style.display = "block"
    document.querySelector("#carddetail").innerHTML = e.toElement.innerHTML
}

let hideDetail = (e) => {
    document.querySelector("#carddetail").style.display = "none"
}

document.querySelectorAll(".card").forEach( x => {
    x.onmouseenter = showDetail
    x.onmouseleave = hideDetail
})

// draw card

let drawCard = (args) => {
    Gamestate.hand.push(args[0])
    drawSound.cloneNode(true).play()
    renderCardsInHand()
}
router['drawcard'] = drawCard

let cardInHandNode = document.createElement("div")
cardInHandNode.classList.add("cardOnHand")
cardInHandNode.innerHTML = `<div class="name"></div><img src="res/skeleton-x4.gif" alt="card image preview">`

let renderCardsInHand = () => {
    let renderName = (card) => {
        if(card.tipo === "criatura")
            return `${card.nome} <sup>Lv. ${card.nivel}</sup>`
        else
            return `${card.nome} <sup>⚡️</sup>`
    }

    let hand = document.querySelector("#handView")

    hand.innerHTML = ""

    let i = 0

    for(index of Gamestate.hand) {
        let card = cardInHandNode.cloneNode(true)
        card.childNodes[0].innerHTML=renderName(cards[index])
        if('pic' in cards[index])
            card.querySelector('img').src = cards[index].pic

        let j = i
        let k = index

        card.onclick = () => {
            selectCardOnHand(j, k)
        }

        hand.appendChild(card)

        i++
    }
}

let selectCardOnHand = (handIndex, cardIndex) => {
    renderHalfView()

    let hand = document.querySelector("#handView")
    
    hand.childNodes.forEach(x => {
        x.classList.remove("selected")
    })
    
    hand.childNodes[handIndex].classList.add("selected")

    let detail = document.querySelector("#actionView .detail")
    detail.innerHTML = ""

    let div = renderCardDetailView(cardIndex)

    detail.appendChild(div)
}

let cardDetailView = document.createElement("div")
cardDetailView.classList.add("box")
cardDetailView.innerHTML = `<div class="name"></div><div class="kind"></div><div class="type"></div><img src="res/Sapo_animado.gif"/><div class="spec"><div class="range"></div><div class="power"></div><div class="critical"></div><div class="life"></div><div class="resistance"></div><div class="speed"></div></div><button class="play">Jogar</button><button class="discard">Descartar</button>`

let cardEffectDetailView = document.createElement("div")
cardEffectDetailView.classList.add("box")
cardEffectDetailView.innerHTML = `<div class="name"></div><div class="kind"></div><div class="type"></div><img src="res/sapo_animado.gif"/><div class="text"></div><button class="play">Jogar</button><button class="discard">Descartar</button>`

let renderCardDetailView = (cardIndex) => {
    let div
    let card = cards[cardIndex]
    if(card.tipo == "criatura") {
        div = cardDetailView.cloneNode(true)
        div.querySelector(".name").innerHTML = card.nome
        if(card.nivel == 1) {
            div.querySelector(".kind").innerHTML = "(Lv. 1)"
        } else {
            div.querySelector(".kind").innerHTML = `(${cards[card.base].nome} Lv. ${card.nivel})`
        }
        div.querySelector(".type").innerHTML = `[${card.terreno}]`

        div.querySelector(".range").innerHTML = `${card.alcance}`
        div.querySelector(".power").innerHTML = `${card.poder}`
        div.querySelector(".critical").innerHTML = `${Math.floor(card.critico * 100)}%`
        div.querySelector(".life").innerHTML = `${card.life}`
        div.querySelector(".resistance").innerHTML = `${card.resistencia}`
        div.querySelector(".speed").innerHTML = `${card.velocidade}`
    } else {
        div = cardEffectDetailView.cloneNode(true)
        div.querySelector(".name").innerHTML = card.nome
        div.querySelector(".kind").innerHTML = "(Efeito)"
        div.querySelector(".text").innerHTML = card.desc
    }

    if('pic' in card)
        div.querySelector("img").src = card.pic

    let ci = cardIndex

    if(canPlayCard(cardIndex))
        div.querySelector(".play").onclick = () => {
            queryField(ci)
        }
    else 
        div.querySelector(".play").disabled = true

    div.querySelector(".discard").onclick = () => {
        discardCard(ci)
    }

    return div
}

let canPlayCard = (cardIndex) => {
    let card = cards[cardIndex]
    if(card.tipo === "criatura") {
        if(card.nivel === 1) {
            let lock = false
            Gamestate.arena.forEach(terreno => {
                if(terreno.criatura === 0)
                  lock = true  
            })
            if(lock) return true
        } else {
            let lock = false
            Gamestate.arena.forEach(terreno => {
                if(terreno.criatura !== 0)
                    if(terreno.criatura.id === card.base)
                        lock = true
            })
            if(lock) return true
        }
    }
    if(card.tipo === "efeito") {
        if(card.alvo == "criatura") {
            let lock = false
            Gamestate.arena.forEach(terreno => {
                if(terreno.criatura != 0)
                  lock = true  
            })
            if(lock) return true
        } else if(card.alvo == "criatura 1") {
            let lock = false
            Gamestate.arena.forEach(terreno => {
                if(terreno.criatura != 0 && terreno.criatura.nivel === 1)
                  lock = true  
            })
            if(lock) return true
        } else {
            alert("Este efeito ainda não foi implementado")
        }
    }

    return false
}

let queryField = (cardIndex) => {
    let canPlay = []
    let card = cards[cardIndex]
    for(let i = 0; i < 8; i++) {
        if(card.tipo === "criatura") {
            if(card.nivel === 1) {
                if(Gamestate.arena[i].criatura === 0) {
                    canPlay.push(i)
                }
            } else {
                if(Gamestate.arena[i].criatura !== 0)
                    if(Gamestate.arena[i].criatura.id === card.base)
                        canPlay.push(i)
            }
        }
        if(card.tipo === "efeito") {
            if(card.alvo == "criatura") {
                if(Gamestate.arena[i].criatura != 0) {
                    canPlay.push(i)
                }
            }
            
            if(card.alvo == "criatura 1") {
                if(Gamestate.arena[i].criatura != 0 && Gamestate.arena[i].criatura.nivel === 1) {
                    canPlay.push(i) 
                }
            }
        }
    }

    document.querySelectorAll("#halfField .field").forEach(div => {
        div.classList.remove('canSelect')
        div.onclick = null
    })

    for(i of canPlay) {
        let div = document.querySelectorAll("#halfField .field")[i]
        div.classList.add("canSelect")
        let j = i
        div.onclick = () => {
            playCard(cardIndex, j)
        }
    }
}

let playCard = (cardIndex, terrenoIndex) => {
    document.querySelectorAll("#halfField .field").forEach(div => {
        div.classList.remove('canSelect')
        div.onclick = null
    })

    document.querySelector("#actionView .detail").innerHTML = ""

    console.log(`play_card ${cardIndex} ${terrenoIndex}`)
    rpc(`play_card ${cardIndex} ${terrenoIndex}`, () => {})
}



let discardCard = (ci) => {
    rpc(`discard_card ${ci}`, (e) => {
        let detail = document.querySelector("#actionView .detail")
        detail.innerHTML = ""

        Gamestate.hand.splice(Gamestate.hand.indexOf(ci), 1)
        renderCardsInHand()
    })
}

let discardByPlay = (args) => {
    let index = args.shift()
    Gamestate.hand.splice(Gamestate.hand.indexOf(index), 1)
    
    renderCardsInHand()
}
router['discard'] = discardByPlay

// global chat

let globalIsOpen = false

let showChat = () => {
    document.querySelector("#globalChatIcon").style.backgroundColor = "khaki"
    document.querySelector("#globalChat").style.display = "flex"
    let list = document.querySelector("#globalMessages")
    list.scrollTop = list.scrollHeight
    globalIsOpen = true
}

let hideChat = () => {
    document.querySelector("#globalChat").style.display = "none"
    globalIsOpen = false
}

let sendMessage = () => {
    let field = document.querySelector("#messageField")
    let message = field.value
    rpc(`sendmessage ${message}`, ()=>{})
    field.value = ""
}

let recvMessage = (args) => {
    let name = args.shift()
    let name_entry = document.createElement("div")
    name_entry.classList.add("user")
    name_entry.innerHTML = name

    if(name == "SYSTEM" && args[0] === "User") {
        getPlayers()
    }

    let message = args.join(" ")
    let message_entry = document.createElement("div")
    message_entry.classList.add("message")
    message_entry.innerHTML = message

    let entry = document.createElement("div")
    entry.classList.add("message")
    entry.appendChild(name_entry)
    entry.appendChild(message_entry)

    let list = document.querySelector("#globalMessages")
    list.appendChild(entry)
    list.scrollTop = list.scrollHeight

    if(!globalIsOpen) {
        document.querySelector("#globalChatIcon").style.backgroundColor = "red"
        if(!Gamestate.inmatch)
            messageSound.play()
    }
}
router["message"] = recvMessage

// reset UI state

let resetUIState  = () => {
    document.querySelector("#loginView").style.display = "flex"
    document.querySelector("#sessionView").style.display = "none"
    document.querySelector("#matchView").style.display = "none"
    document.querySelector("#globalMessages").innerHTML = ""
    document.querySelector("#logoutIcon").onclick = logout
}

// logout

let logout = () => {
    socket.close()
}

// handle match update
let updateMatches = (args) => {
    getMatches()
}
router["update_matches"] = updateMatches

// game state

let resetGame = () => {
    Gamestate.hand = []
    Gamestate.arena = []
    for(let i = 0; i < 8; i++) {
        Gamestate.arena.push(new Terreno())
    }
    Gamestate.battle = []
    for(let i = 0; i < 16; i++) {
        Gamestate.battle.push(new Terreno())
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

// Update halfView

let tipoToClass = {
    Floresta: "florest",
    Deserto: "desert",
    Rio: "river",
    Montanha:  "mountain"
}


let renderHalfView = () => {
    let arena = Gamestate.arena
    let divs = document.querySelectorAll("#halfField .field")
    for(let i = 0; i < arena.length; i++) {
        let terreno = arena[i]
        let div = divs[i]
        div.classList = "field"
        if(terreno.nivel > 0)
            div.classList.add(`lv${terreno.nivel}`)
        if(terreno.tipo !== "vazio")
            div.classList.add(tipoToClass[terreno.tipo])
        div.innerHTML = ""
        if(terreno.criatura !== 0) {
            div.innerHTML = `<div class="creature"><img src="res/blank.png"/><div class="life"></div></div>`
            div.querySelector(".life").innerHTML = terreno.criatura.life
            let card = cards[terreno.criatura.id]
            if("pic" in card) {
                div.querySelector("img").src = card.pic
            }
        }

        div.onclick = () => {
            mostraTerreno(terreno, div)
        }
    }
}

let mostraTerreno = (terreno, div) => {
    renderHalfView()

    let detail = document.querySelector("#actionView .detail")
    detail.innerHTML = ""

    if(terreno.criatura !== 0) {
        let div = renderCriaturaDetailView(terreno.criatura)
        detail.appendChild(div)
    }

    let tDiv = document.createElement("div")
    tDiv.classList = "box"
    tDiv.innerHTML = `${terreno.tipo} Lv.${terreno.nivel}`

    detail.appendChild(tDiv)

    div.classList.add("selected")
}

let criaturaDetailView = document.createElement("div")
criaturaDetailView.classList.add("box")
criaturaDetailView.innerHTML = `<div class="name"></div><div class="kind"></div><div class="type"></div><img src="res/sapo_animado.gif"/><div class="spec"><div class="range"></div><div class="power"></div><div class="critical"></div><div class="life"></div><div class="resistance"></div><div class="speed"></div></div>`

let renderCriaturaDetailView = (criatura) => {
    let div = criaturaDetailView.cloneNode(true)
    let card = cards[criatura.id]

    div.querySelector(".name").innerHTML = criatura.nome
    if(criatura.nivel == 1) {
        div.querySelector(".kind").innerHTML = "(Lv. 1)"
    } else {
        div.querySelector(".kind").innerHTML = `(${cards[card.base].nome} Lv. ${criatura.nivel})`
    }
    div.querySelector(".type").innerHTML = `[${criatura.terreno}]`

    div.querySelector(".range").innerHTML = `${criatura.alcance}`
    div.querySelector(".power").innerHTML = `${criatura.poder}`
    div.querySelector(".critical").innerHTML = `${Math.floor(criatura.critico * 100)}%`
    div.querySelector(".life").innerHTML = `${criatura.life}`
    div.querySelector(".resistance").innerHTML = `${criatura.resistencia}`
    div.querySelector(".speed").innerHTML = `${criatura.velocidade}`


    if('pic' in card)
        div.querySelector("img").src = card.pic

    return div
}

let setTerrenoTipo = (args) => {
    let index = Number(args.shift())
    let tipo = args.shift()

    Gamestate.arena[index].tipo = tipo

    renderHalfView()
}
router["set_terreno_tipo"] = setTerrenoTipo

let setTerrenoLv = (args) => {
    let index = Number(args.shift())
    let nivel = Number(args.shift())

    Gamestate.arena[index].nivel = nivel

    renderHalfView()
}
router["set_terreno_lv"] = setTerrenoLv

let setTerrenoCriatura = (args) => {
    let index = Number(args.shift())
    let id = args.shift()
    let extract = ["alcance", "poder", "critico", "life", "resistencia", "velocidade"]
    let criatura = new Criatura(id)
    for(feature of extract) {
        let value = Number(args.shift())
        criatura[feature] = value
    }
    if(args.length == 1) {
        criatura.side = Number(args.shift())
    }
    Gamestate.arena[index].criatura = criatura

    renderHalfView()
}
router["set_terreno_criatura"] = setTerrenoCriatura

let setTerrenoEmpty = (args) => {
    let index = Number(args.shift())
    Gamestate.arena[index].criatura = 0

    renderHalfView()
}
router["set_terreno_empty"] = setTerrenoEmpty


// battle handlers
let showBattleView = () => {
    document.querySelector("#waitingForPlayer").style.display = "none"
    document.querySelector("#battle").style.display = "grid"   
}
router["showbattle"] = showBattleView

let setTTipo = (args) => {
    let index = Number(args.shift())
    let tipo = args.shift()

    Gamestate.battle[index].tipo = tipo

    renderFullView()
}
router["set_t_tipo"] = setTTipo

let setTLv = (args) => {
    let index = Number(args.shift())
    let nivel = Number(args.shift())

    Gamestate.battle[index].nivel = nivel

    renderFullView()
}
router["set_t_lv"] = setTLv

let setTCriatura = (args) => {
    let index = Number(args.shift())
    let id = args.shift()
    let extract = ["alcance", "poder", "critico", "life", "resistencia", "velocidade", "side"]
    let criatura = new Criatura(id)
    for(feature of extract) {
        let value = Number(args.shift())
        criatura[feature] = value
    }
    Gamestate.battle[index].criatura = criatura

    renderFullView()
}
router["set_t_criatura"] = setTCriatura

let setTEmpty = (args) => {
    let index = Number(args.shift())
    Gamestate.battle[index].criatura = 0

    renderFullView()
}
router["set_t_empty"] = setTEmpty

let renderFullView = () => {
    let arena = Gamestate.battle
    let divs = document.querySelectorAll("#fullField .field")
    for(let i = 0; i < arena.length; i++) {
        let terreno = arena[i]
        let div = divs[i]
        div.classList = "field"
        if(terreno.nivel > 0)
            div.classList.add(`lv${terreno.nivel}`)
        if(terreno.tipo !== "vazio")
            div.classList.add(tipoToClass[terreno.tipo])
        div.innerHTML = ""
        if(terreno.criatura !== 0) {
            div.innerHTML = `<div class="creature"><img src="res/blank.png"/><div class="life"></div></div>`
            div.querySelector(".life").innerHTML = terreno.criatura.life
            if("side" in terreno.criatura && terreno.criatura.side == 0) {
                div.querySelector(".life").classList="lifeblue"
            }
            let card = cards[terreno.criatura.id]
            if("pic" in card) {
                div.querySelector("img").src = card.pic
            }
        }
    }
}

// eventlog

let cleanLog = (args) => {
    document.querySelector("#eventlog").innerHTML = ""
}
router["cleanlog"] = cleanLog

let addToLog = (args) => {
    eventSound.cloneNode(true).play()
    let log = document.querySelector("#eventlog")
    log.innerHTML = `${log.innerHTML}<div class="message">${args.join(" ")}</div>`
    log.scrollTop = log.scrollHeight
}
router["gamelog"] = addToLog

// win and lose sound

let playLoseSound = (args) => {
    loseSound.cloneNode(true).play()
}
router["playlosesound"] = playLoseSound


let playWinSound = (args) => {
    winSound.cloneNode(true).play()
}
router["playwinsound"] = playWinSound

// newTurn

let endBattle = (args) => {
    document.querySelector("#battle").style.display = "none"
}

router["endbattle"] = endBattle

// score

let showScore = (args) => {
    document.querySelector("#score").innerHTML = args.join(" ")
}

router["score"] = showScore

// endGame

let endMatch = (args) => {
    leaveMatch()
    alert(args.join(" "))
    document.querySelector("#globalChatIcon").style.display = "block"
    document.querySelector("#logoutIcon").style.display ="block"
}
router["endmatch"] = endMatch