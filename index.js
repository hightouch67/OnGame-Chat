var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var redis = require('redis');
var client = '';
client = redis.createClient(process.env.REDIS_URL);

client.once('ready', function () {

    // Flush Redis DB
    client.flushdb();
    client.get('chat_users', function (err, reply) {
        if (reply) {
            chatters = JSON.parse(reply);
        }
    });

    client.get('chat_app_messages', function (err, reply) {
        if (reply) {
            messages = JSON.parse(reply)
            chat_messages = messages.slice(messages.length-20,messages.length)
        }
    });
});

var port = process.env.PORT || 8080;

http.listen(port, function () {
    console.log('Server Started. Listening on *:' + port);
});

var chatters = [];
var chat_messages = [];
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function (req, res) {
    res.json({ hello: 'world' });
});

app.post('/join', function (req, res) {
    var username = req.body.username;
    if (chatters.indexOf(username) === -1) {
        chatters.push(username);
        client.set('chat_users', JSON.stringify(chatters));
        res.send({
            'chatters': chatters,
            'status': 'OK'
        });
    } else {
        res.send({
            'status': 'FAILED'
        });
    }
});

app.post('/leave', function (req, res) {
    var username = req.body.username;
    chatters.splice(chatters.indexOf(username), 1);
    client.set('chat_users', JSON.stringify(chatters));
    res.send({
        'status': 'OK'
    });
});

app.post('/send_message', function (req, res) {
    var room = req.body.room;
    var username = req.body.username;
    var message = req.body.message;
    var date = new Date().toUTCString()
    chat_messages.push({
        'room': room,
        'sender': username,
        'message': message,
        'date': date
    });
    client.set('chat_app_messages', JSON.stringify(chat_messages));
    res.send({
        'status': 'OK'
    });
});

app.get('/get_messages', function (req, res) {
    res.send(chat_messages);
});

app.get('/get_chatters', function (req, res) {
    res.send(chatters);
});

io.on('connection', function (socket) {
    socket.on('message', function (data) {
        io.emit('send', data);
    });
    socket.on('update_chatter_count', function (data) {
        io.emit('count_chatters', data);
    });

});
