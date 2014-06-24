var hipchat = require('node-hipchat'),
    CronJob = require('cron').CronJob,
    _ = require('lodash'),
    async = require('async'),
    docopt = require('docopt').docopt,
    getUrls = require('get-urls'),
    unirest = require('unirest');

doc = " \
Usage: \n\
  app.js <apikey> <wwwasitRoomId>\n\
"
var opts = docopt(doc)
var apikey = opts['<apikey>']
var destinationRoom = opts['<wwwasitRoomId>']

var hc = new hipchat(apikey);

var rooms = []
var history = []
var urls = []

//Get a list of all the rooms under this api key
var readRooms = function(cb){
  hc.listRooms(function(data) {
    data = data.rooms;
    _.forEach(data, function(r){
      rooms.push({room_id: r.room_id});
    })
    cb();
  });
}

//Read all the rooms into a flattened message collection
var readMessages = function(cb){
  //counter-cum-callback caller
  var cbinternal = _.after(rooms.length, function() {
    cb();
  });

  _.forEach(rooms, function(room){
    hc.getHistory(room, function(h){
      _.forEach(h.messages, function(msg){
        history.push({msg: msg.message,from: msg.from.name})
      })
      cbinternal();
    })
  })
}

//extract urls
var getUrlsFlat = function(cb){
  _.forEach(history, function(m){
    msgUrls = getUrls(m.msg);
    if(msgUrls.length >= 1){
      urls.push(msgUrls)
    }
  })
  urls = _.flatten(urls)
  cb()
}

function main(){
  async.series([readRooms, readMessages, getUrlsFlat], function(err, results){

    var payload = { 
      "command": "add",
      "room": destinationRoom,
      "urls": JSON.stringify(urls)
    }


    unirest.post('http://localhost:1337/api/control')
    .headers({ 'Accept': 'application/json' })
    .send(payload)
    .end(function (response) {
      console.log("Server will proceed with these urls ", response.body);
    });

    //flush for next reload
    urls = [];
    history = [];
    rooms = []
  });
}

main();

var job = new CronJob({
  cronTime: '*/6 * * * *',
  onTick: function() {
    main();
  },
  start: true
});
