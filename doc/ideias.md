Cliente->Servidor
`commando argumentos`
sempre tem resposta (ok, err)

Servidor->Cliente
Repostas e mensagens
`resposta`
`! evento`

Cliente
rpc(mensagem, handler)


ping()
timeout {
    se recebeu o pong
        ping
        gera outro timeout
    senão matar a conexão
}
pong() <- recebi um pong

Tasks do dia 1:

deve fazer:
* [X] `setusername` -> "login" do usuário
* [X] `getplayers` -> lista os usuários conectados
* [x] `creatematch` -> cria uma partida
* [x] `getmatches` -> lista as partidas
* [x] `joinmatch` -> ingressar numa partida
* [x] `leavematch` -> sair de uma partida
* [x] `setready` -> define que está pronto
* [x] `matchbegin` -> a partida começa

extra:
* [x] `getnumber` -> gera um numero aleatorio e envia para todos os jogadores (teste)
* [x] `endturn` -> encerra o turno

terreno {
    criatura
    nivel
    tipo
}

criatura {
    poder
    nome
    id
    nivel
    terreno
    alcance
    poder
    critico
    life
    resistencia
    velocidade
}