'use strict';

var cv = require('opencv');
var brain = require('brain.js');
var async = require('async');
var fs = require('fs');
var net = new brain.NeuralNetwork();

var data = [];
var files = [
  //{name: 'letter-0-100-2-0.png', val: ''},
  {name: 'letter-0-100-2-1.png', val: 'X'},
  {name: 'letter-0-100-2-2.png', val: '7'},
  {name: 'letter-0-100-2-3.png', val: '7'},
  {name: 'letter-0-100-2-4.png', val: '1'},
  {name: 'letter-0-100-2-5.png', val: 'X'},
  {name: 'letter-0-100-2-6.png', val: '0'},
  //{name: 'letter-0-104-2-0.png', val: ''},
  {name: 'letter-0-104-2-10.png', val: '3'},
  {name: 'letter-0-104-2-11.png', val: '8'},
  //{name: 'letter-0-104-2-12.png', val: ''},
  //{name: 'letter-0-104-2-1.png', val: ''},
  {name: 'letter-0-104-2-2.png', val: 'X'},
  //{name: 'letter-0-104-2-3.png', val: ''},
  {name: 'letter-0-104-2-4.png', val: '7'},
  {name: 'letter-0-104-2-5.png', val: '7'},
  {name: 'letter-0-104-2-6.png', val: '1'},
  {name: 'letter-0-104-2-7.png', val: 'X'},
  {name: 'letter-0-104-2-8.png', val: 'O'},
  //{name: 'letter-0-104-2-9.png', val: ''},
  //{name: 'letter-0-119-1-0.png', val: ''},
  {name: 'letter-0-119-1-1.png', val: 'X'},
  {name: 'letter-0-119-1-2.png', val: '7'},
  {name: 'letter-0-119-1-3.png', val: '7'},
  {name: 'letter-0-119-1-4.png', val: '1'},
  {name: 'letter-0-119-1-5.png', val: 'X'},
  {name: 'letter-0-119-1-6.png', val: '0'},
  //{name: 'letter-0-122-1-0.png', val: ''},
  {name: 'letter-0-122-1-10.png', val: '3'},
  {name: 'letter-0-122-1-11.png', val: '8'},
 // {name: 'letter-0-122-1-12.png', val: ''},
  //{name: 'letter-0-122-1-1.png', val: ''},
  {name: 'letter-0-122-1-2.png', val: 'X'},
  //{name: 'letter-0-122-1-3.png', val: ''},
  {name: 'letter-0-122-1-4.png', val: '7'},
  {name: 'letter-0-122-1-5.png', val: '7'},
  {name: 'letter-0-122-1-6.png', val: '1'},
  {name: 'letter-0-122-1-7.png', val: 'X'},
  {name: 'letter-0-122-1-8.png', val: 'O'},
  //{name: 'letter-0-122-1-9.png', val: ''},
  //{name: 'letter-0-34-3-0.png', val: ''},
  {name: 'letter-0-34-3-10.png', val: '8'},
  //{name: 'letter-0-34-3-11.png', val: ''},
  //{name: 'letter-0-34-3-1.png', val: ''},
  {name: 'letter-0-34-3-2.png', val: 'X'},
  {name: 'letter-0-34-3-3.png', val: '7'},
  {name: 'letter-0-34-3-4.png', val: '7'},
  {name: 'letter-0-34-3-5.png', val: '1'},
  {name: 'letter-0-34-3-6.png', val: 'X'},
  {name: 'letter-0-34-3-7.png', val: 'O'},
  //{name: 'letter-0-34-3-8.png', val: ''},
  {name: 'letter-0-34-3-9.png', val: '3'}
];

var letters = 'A,B,C,E,H,K,M,O,P,T,X,Y,0,9,8,7,6,5,4,3,2,1'.split(',');

async.compose.apply(async, files.map(function(file){

  return function(next){
    cv.readImage(__dirname + "/tmp/" + file.name, function(err, im){
      if (err) {
        return next();
      }

      im.convertGrayscale();
      im.resize(46, 88);

      var arr = [];
      for(var w = 0; w < im.width(); w++){
        var empty = 0;
        for(var h = 0; h < im.height(); h++){
          arr.push(im.pixel(h, w));
        }
      }
      
      var min = Math.min.apply(null, arr);
      var max = Math.max.apply(null, arr);
      var mid = ((max - min) / 2) + min;
      // max == 100
      // col == x
      // x = 

      var input = [];
      for(var x = 0; x < im.width(); x++){
        for(var y = 0; y < im.height(); y++){
          var col = im.pixel(x, y);
          var val = (col * 100 / max) / 100;
          input.push(val);
        }
      }

      var output = Array.apply(null, Array(letters.length)).map(Number.prototype.valueOf, 0);
      var index  = letters.indexOf(file.val);
      output[index] = 1;

      // console.info("push image: %s [%d]", file.name, input.length);
      
      var res = {input: input, output: output};

      data.push(res);

      next();
    });
  };
}))(function(err){
  if(err){
    console.log(err);
  }

  net.train(data, {
    errorThresh: 0.025,
    log: true,
    logPeriod: 1,
    learningRate: 0.1
  });

  var wstream = fs.createWriteStream('./data/train.json');
  wstream.write(JSON.stringify(net.toJSON(),null,2));
  wstream.end();

  /*
  net.fromJSON(require('./data/train'));
  var rnd = Math.floor(Math.random() * (data.length));
  var output = net.run(data[rnd].input);
  console.log(output);
  */
});

