var express = require('express'); 
var app = express(); 
var server = require('http').Server(app); 
var io = require('socket.io')(server); 
var fs = require('fs'); 
var sys = require('util'); 
var exec = require('child_process').exec;

var comando;
var MongoClient = require('mongodb').MongoClient;
var raspberry;

function createConnection(onCreate){

    MongoClient.connect('mongodb://127.0.0.1:27017/raspberry', function(err, db) {
        if(err)
            throw err;
        console.log("Conectado a MongoDB!");
        raspberry = db.collection('raspberry');
        onCreate();
    });
}


function tempRaspberry(onAdded){

    comando = exec("cat /sys/class/thermal/thermal_zone0/temp", function (error, stdout, stderr) {

       if (error !== null) {
            console.log('Error con el comando cat : ' + error);
       } else {

            var temp = parseFloat(stdout)/1000;
            var date = new Date().getTime();
            onAdded(temp,date);
       }
    });
}

function insertRaspberry(temp,date,datos) {


    raspberry.insertOne({temperatura: temp, tiempo: date}, function(err, result) {

        console.log(result.ops[0].temperatura);
        console.log(result.ops[0].tiempo);
        console.log(result.ops[0]._id);
    });

    datos(temp,date);

}

function mostrarVariables(temp,date,datos){

    var cursor = raspberry.find().limit(1).sort({ _id : -1 });

    cursor.toArray(function(err, results) {
        if (err) throw err;
        console.log('%j', results);
        var date = results[0].tiempo;
        var temp = results[0].temperatura;
        datos(temp,date);
    });


}

//app.use(methodOverride());
//app.use(bodyParser.json());
//app.use(express.static('/'));

app.get('/', function(req, res) {
    console.log('Entrando en GET');
    fs.readFile('index.html', function(err, data) {
     if (err) {
     //Si hay error, mandaremos un mensaje de error 500
         console.log(err);
         res.writeHead(500);
         return res.end('Error loading index.html');
       }
       console.log("ok");
       res.writeHead(200);
       res.end(data);
     });

});


//Escuchamos en el puerto 5000
server.listen(5000, function() {
    console.log('Escuchando puerto 5000');
});

//Cada 5 segundos mandaremos al cliente los valores.
io.sockets.on('connection', function(socket) {
    console.log("Entrando en sockets.io");
    setInterval(function(){

        createConnection(function(){
            tempRaspberry(function(temp,date){
                insertRaspberry(temp,date,function(){
                    mostrarVariables(temp,date,function(){
                        socket.emit('temperatureUpdate', date, temp);

                    });
                });
           });
       });

    //Fin setInterval
    }, 10000);


});
