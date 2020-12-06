# API

## Client

## Server

All server messages begin with `! ` and they do not require reply.
They are send from the server and are handled using the router mechanism on the
client side.

`! drawcard ${cardid}`

`! message USER msg`

`! update_matches` : update client side match list due to any change