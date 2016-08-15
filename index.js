'use strict';

var cv = require('opencv');
//var tesseract = require('node-tesseract');
var async = require('async');
var sprintf = require('sprintf');
var minArea = 10000;
var maxArea = 2500;
var BLUE  = [0, 255, 0]; // B, G, R
var RED   = [0, 0, 255]; // B, G, R
var GREEN = [0, 255, 0]; // B, G, R
var WHITE = [255, 255, 255]; // B, G, R
var filename = (process.argv[2] || "1.jpg");
var clrFileName = filename.replace(/\.(jpg|png|jpeg)/g, '');

cv.readImage(__dirname + "/images/" + filename, function(err, im){
  if (err) throw err;

  im.detectObject(__dirname + "/data/haarcascade_russian_plate_number.xml", {}, function(err, faces){
    if (err) throw err;

    var i = 0;
    async.compose.apply(async, faces.map(function(face){
      return function(next){
        parseFace(im, i++, face)
          .then(function(result){
            console.log(result);
            next();
          });
      };
    }))(function(err){
      if(err){
        console.error(err);
      }

      console.log("Done");
    });

  });

});

function findPlate(cp, range, dilate, im, i)
{
  var cn  = cp.copy();
  var src = cp.copy();

  // down-scale and upscale the image to filter out the noise
  cn.normalize(0, 255);
  cn.pyrDown();
  cn.pyrUp();
  cn.convertGrayscale();
  cn.canny(range[0], range[1]);
  cn.dilate(dilate);

  var contours = cn.findContours(0, 2);

  for(var x = 0; x < contours.size(); x++) {

    if(contours.area(x) > minArea) {
      contours.approxPolyDP(x, contours.arcLength(x, true) * 0.030, true);
      cp.drawContour(contours, x, GREEN);

      var length = contours.cornerCount(x);

      if(length === 4){
        var points = [
          contours.point(x,0),
          contours.point(x,1),
          contours.point(x,2),
          contours.point(x,3)
        ];

        var pos = getPos(points);
        var a1  = Math.atan2(pos.rt.y - pos.lt.y, pos.rt.x - pos.lt.x) * 180.0 / Math.PI;
        var a2  = Math.atan2(pos.rb.y - pos.lb.y, pos.rb.x - pos.lb.x) * 180.0 / Math.PI;

        if(a1 > (a2+2) || a1 < (a2-2)){
          console.info("%d :: %d", a1, a2);
          continue;
        }

        var ma  = (a1 + a2) / 2;

        if(ma < 0){
          // /
          // very diffrent angles, wrong reqtangle
          if(a1 > (a2+1) || a1 < (a2-1)){

          }
        } else if(ma > 0) {
          // \
          if(a1 > (a2+1) || a1 < (a2-1)){

          }
        }

        var lowerTopPoint    = pos.lt.y > pos.rt.y ? pos.lt : pos.rt;
        var lowerBottomPoint = pos.lb.y > pos.rb.y ? pos.lb : pos.rb;

        var srcArray = [
          pos.lt.x,  pos.lt.y, 
          pos.rt.x,  pos.rt.y, 
          pos.rb.x,  pos.rb.y, 
          pos.lb.x,  pos.lb.y
        ];

        var dstArray = [
          pos.lt.x, lowerTopPoint.y, 
          pos.rt.x, lowerTopPoint.y, 
          pos.rb.x, lowerBottomPoint.y, 
          pos.lb.x, lowerBottomPoint.y
        ];

        var tmp = src.copy();

        console.info("Transform...");
        var xfrmMat = tmp.getPerspectiveTransform(srcArray, dstArray);
        tmp.warpPerspective(xfrmMat, tmp.width(), tmp.height(), [255, 255, 255]);

        var plate = tmp.crop(pos.lt.x, lowerTopPoint.y, (pos.rt.x - pos.lt.x), (lowerBottomPoint.y - lowerTopPoint.y));
        
        plate.convertGrayscale();
        //plate.canny(50, 200);
        
        var arr = [];
        for(var w = 0; w < plate.width(); w++){
          var empty = 0;
          for(var h = 0; h < plate.height(); h++){
            arr.push(plate.pixel(h, w));
          }
        }
        
        var min = Math.min.apply(null, arr);
        var max = Math.max.apply(null, arr);
        var mid = ((max - min) / 2) + min;
        //console.info("min: %d, max: %d, mid: %d", min, max, mid);
        
        var values = [];
        for(var w = 0; w < plate.width(); w++){
          var empty = 0;
          for(var h = 0; h < plate.height(); h++){
            var val = plate.pixel(h, w);
            
            if(val > mid){
              empty++;
            }
          }

          values.push(empty);
        }

        var max = Math.max.apply(null, values);
        var height = plate.height();
        var current = [];
        var splits = [];
        values.forEach(function(val, index){
          //console.info("%d => %d", index, val);
          var p = (val * 100 / max);
          if(p >= 85){
            current.push(index);
          } else {
            if(current.length > 0){
              splits.push(current);
            }
            current = [];
          }

          //plate.line([index, 0], [index, (height * p / 100)], WHITE);
        });

        plate.save("./tmp/ready[" + clrFileName + "][" + i + "][" + range[0] + "-" + range[1] + "][" + dilate + "].png");

        if(current.length > 0){
          splits.push(current);
        }

        var last = 0;
        splits.forEach(function(current, n){
          var index = Math.ceil(current[0] + ((current[current.length - 1] - current[0]) / 2));
          //console.info("index: [%d: %d => %d]", plate.width(), last, index);
          var w = index-last;
          if(w <= 20){
            last = index + 1;
            return;
          }
          var letter = plate.crop(last, 0, w, plate.height());
          letter.save("./tmp/letter[" + clrFileName + "][" + i + "][" + range[0] + "-" + range[1] + "][" + dilate + "][" + n + "].png");
          //files.push(__dirname + "/tmp/letter-" + clrFileName + "-" + i + "-" + x + "-" + t + "-" + n + ".png");
          
          last = index + 1;
        });

        //files.push(__dirname + "/tmp/ready-" + i + "-" + x + "-" + t + ".png");
      }
    }
  }

  cp.save("./tmp/cp[" + clrFileName + "][" + i + "][" + range[0] + "-" + range[1] + "][" + dilate + "].png");
  cn.save("./tmp/cn[" + clrFileName + "][" + i + "][" + range[0] + "-" + range[1] + "][" + dilate + "].png");

}

function parseFace(im, i, face)
{
  console.log("face[%d]: ", i, face);

  var files = [];
  var plate = im.crop(face.x,face.y,face.width,face.height);
  plate.save("./tmp/plate[" + clrFileName + "][" + i + "].png");
  for(var t = 1; t <= 3; t++){

    var cp = plate.copy();

    //im.line([face.x,face.y], [face.x+face.width, face.y]);
    //im.line([face.x+face.width,face.y], [face.x+face.width, face.y+face.height]);
    //im.line([face.x+face.width,face.y+face.height], [face.x, face.y+face.height]);
    //im.line([face.x,face.y+face.height], [face.x, face.y]);

    if(face.width < 500){
      var w = face.width;
      var h = face.height;
      cp.resize(500, (500 * 100 / w) * h / 100);
    }

    [
      [0, 100],
      [0, 255],
      [50, 100],
      [50, 200],
      [100, 200]
    ].forEach(function(range){
      findPlate(cp, range, t, im, i);
    });

  }

  im.save("./tmp/original[" + clrFileName + "].png");

  return new Promise(function(resolve){

    return resolve();

    var result = [];
    async.compose.apply(async, files.map(function(file){
      return function(next){
        tesseract.process(file,function(err, text) {
          if(err) {
            console.error(err);
          } else {
            console.info("text[%s]: %s", file, text);
            result.push(text);
          }

          next();
      });
      };
    }))(function(err){
      if(err){
        console.error(err);
      }

      return resolve(result);
    });
  });
}

function getPos(points)
{
  var top  = [],
    bottom = [],
    left   = [],
    right  = [];

  var ySort = points.sort(function(p1, p2){
    if(p1.y === p2.y) return 0;
    return p1.y > p2.y ? 1 : -1;
  });

  /*
  var xSort = points.sort(function(p1, p2){
    if(p1.x === p2.x) return 0;
    return p1.x > p2.x ? 1 : -1;
  });

  left.push(xSort[0]);
  left.push(xSort[1]);
  right.push(xSort[3]);
  right.push(xSort[2]);
  */

  top.push(ySort[0]);
  top.push(ySort[1]);
  bottom.push(ySort[3]);
  bottom.push(ySort[2]);  

  return {
    lt: top[0].x    < top[1].x    ? top[0]    : top[1],
    rt: top[0].x    < top[1].x    ? top[1]    : top[0],
    lb: bottom[0].x < bottom[1].x ? bottom[0] : bottom[1],
    rb: bottom[0].x < bottom[1].x ? bottom[1] : bottom[0]
  };
}

/*
function maxLeftTop(points)
{
  var left = points.sort(function(p1, p2){
    if(p1.x == p2.x){
      return 0;
    }

    return p1.x < p2.x ? -1 : 1;
  }).shift();


  return points.sort(function(p1, p2){
    var max = left.x + 10;
    var min = left.x - 10;

    if(p1.x < max && p1.x > min){
      return p1.y < p2.y ? -1 : 1;
    }

    return 1;

  }).shift();
}

function maxLeftBottom(points)
{
  var left = points.sort(function(p1, p2){
    if(p1.x == p2.x){
      return 0;
    }

    return p1.x < p2.x ? -1 : 1;
  }).shift();


  return points.sort(function(p1, p2){
    var max = left.x + 10;
    var min = left.x - 10;

    if(p1.x < max && p1.x > min){
      return p1.y < p2.y ? 1 : -1;
    }

    return 1;

  }).shift();
}

function maxRightTop(points)
{
  var right = points.sort(function(p1, p2){
    if(p1.x == p2.x){
      return 0;
    }

    return p1.x < p2.x ? 1 : -1;
  }).shift();


  return points.sort(function(p1, p2){
    var max = right.x + 10;
    var min = right.x - 10;

    if(p1.x < max && p1.x > min){
      return p1.y < p2.y ? -1 : 1;
    }

    return 1;

  }).shift();
}

function maxRightBottom(points)
{
  var right = points.sort(function(p1, p2){
    if(p1.x == p2.x){
      return 0;
    }

    return p1.x < p2.x ? 1 : -1;
  }).shift();


  return points.sort(function(p1, p2){
    var max = right.x + 10;
    var min = right.x - 10;

    if(p1.x < max && p1.x > min){
      return p1.y < p2.y ? 1 : -1;
    }

    return 1;

  }).shift();
}
*/

/*
function angleBetweenTwoVectors(vector1, vector2) {
    // скалярное произведение векторов
    var scalMultVectors = vector1.reduce(function(sum, current, i) {
        return sum + (current * vector2[i])
    }, 0);
    // модуль вектора равен квадратному корню из суммы квадратов его координат
    var moduleVector = function(v) {
        // Находим квадраты слагаемых
        var step1 = v.map(function(currentValue) {
            return Math.pow(currentValue, 2)
        });
        // Складываем их
        var step2 = step1.reduce(function(sum, current) {
            return sum + current
        });
        // Вычисляем квадратный корень
        return Math.sqrt(step2, 2)
    };
    // Вычисляем косинус угла между векторами
    var cosA = scalMultVectors / (moduleVector(vector1) * moduleVector(vector2));
    //console.log("cos(" + cosA + ")");
    return Math.acos(cosA);

}
*/
