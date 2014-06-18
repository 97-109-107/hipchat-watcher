var hipchat = require('node-hipchat'),
    _ = require('lodash')
    async = require('async')
    getUrls = require('get-urls')

var hc = new hipchat('56fdd7ceb28f09aa38c6169490c8f2');
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
  var times = rooms.length;

  //counter-cum-callback caller
  var cbinternal = _.after(times, function() {
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


async.series([readRooms, readMessages, getUrlsFlat], function(err, results){
  // console.log(rooms)
  // console.log(history)
  console.log(urls)
});

