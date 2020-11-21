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
* [ ] `creatematch` -> cria uma partida
* [ ] `joinmatch` -> ingressar numa partida
* [ ] `getmatches` -> lista as partidas
* [ ] `setready` -> define que está pronto
* [ ] `matchbegin` -> a partida começa

extra:
* [ ] `getnumber` -> gera um numero aleatorio e envia para todos os jogadores (teste)
* [ ] `endturn` -> encerra o turno