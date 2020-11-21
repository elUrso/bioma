let socket = 0

let connect = (onopen) => {
    if(socket == 0) {
        socket = new WebSocket("ws://192.168.0.7:7832")
        socket.onopen = (e) => {
            socket.send("Hello")
        }
        socket.onmessage = (e) => { console.log(e) }
        socket.onclose = (e) => {
            console.log("Disconnected")
            socket = 0
        }
    } else {
        console.log("a connection is already open")
    }
}