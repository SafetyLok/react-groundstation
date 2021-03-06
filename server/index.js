'use strict';
/*
* Groundstation backend
*-----------------------
*/

const app = require('./app');
const dgram = require('dgram');
var updateClientWithDatalogs = true;
var listeningForUdp = false;

/*
* UDP data sender
*/
var SENDPORT = 3003; // This points to the Pod's UDP listener port
var SENDHOST = '127.0.0.1';

function sendMessageToPod(messageStr){
    var message = new Buffer(messageStr);
    var client = dgram.createSocket('udp4');
    client.send(message, 0, message.length, SENDPORT, SENDHOST, function(err, bytes) {
        if (err) throw err;
        console.log("GROUNSTATION UDP - SENT: " +  SENDHOST + ':' + SENDPORT +' - ' + message);
        client.close();
    });
}

/*
* UDP data receiver
*/
var udpPORT = 3002; // Groundsation's udp port
var udpHOST = '127.0.0.1';

var udpServer = dgram.createSocket('udp4');
udpServer = udpServer.bind(udpPORT, udpHOST);



const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
});

const io = require('socket.io')(server);


// socket.io demo
io.on('connection', function (socket) {
  socket.emit('server event', { foo: 'bar' });

  if(!listeningForUdp)
    startListening();

  function startListening(){
    listeningForUdp = true;
    udpServer.on('message', function (message, remote) {
        console.log("GROUNSTATION UDP - RECEIVED: " + remote.address + ':' + remote.port +' - ' + message);
        sendMessageToPod("Thanks Pod, message received")

        if(updateClientWithDatalogs)
        {
          socket.emit('udp event', {
            log: remote.address + ':' + remote.port +' - ' + message
          });
        }
    });
  }

  socket.on('stop:Pod', function (data) {
    sendMessageToPod('STOP');
  });

  socket.on('client event', function (data) {
    socket.broadcast.emit('update label', data);
  });

  socket.on('stop:dataLogs', function () {
    updateClientWithDatalogs = false;
  });

  socket.on('start:dataLogs', function () {
    updateClientWithDatalogs = true;
  });

  socket.on('sendParameter', function (data) {
    sendMessageToPod(JSON.stringify(data))
  });

  socket.on('setIpAndPort', function (data) {
    udpPORT = data.port;
    udpHOST = data.ip;
    udpServer.close(function(){
      listeningForUdp = false;
      udpServer = dgram.createSocket('udp4');
      udpServer = udpServer.bind(udpPORT, udpHOST);
      if(!listeningForUdp)
        startListening()
    });

    sendMessageToPod(JSON.stringify(data))
  });
});





// Always return the main index.html, so react-router render the route in the client
app.get('/websocketTest', function(req, res) {
	console.log('/websocketTest')
});

app.post('/sendParameter', function(req, res){
    console.log('POST /');
    console.dir(req.body);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('sendParameter');
});

app.post('/setIpAndPort', function(req, res){
    console.log('POST /');
    console.dir(req.body);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('setIpAndPort');
});