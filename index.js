'use strict';

var cv = require('opencv');
var minArea = 2000;
var BLUE  = [0, 255, 0]; // B, G, R
var RED   = [0, 0, 255]; // B, G, R
var GREEN = [0, 255, 0]; // B, G, R
var WHITE = [255, 255, 255]; // B, G, R

cv.readImage(__dirname + "/test.jpg", function(err, im){
  if (err) throw err;

  im.detectObject(__dirname + "/haarcascade_russian_plate_number.xml", {}, function(err, faces){
    if (err) throw err;

    for (var i = 0; i < faces.length; i++){

      var face = faces[i];

      var cp  = im.crop(face.x,face.y,face.width,face.height);
      var tmp = cp.copy();

      tmp.convertGrayscale();
      tmp.canny(0, 100);
      tmp.dilate(2);

      var contours = tmp.findContours();

      for (i = 0; i < contours.size(); i++) {

        if (contours.area(i) < minArea) {
          continue;
        }

        var arcLength = contours.arcLength(i, true);
        contours.approxPolyDP(i, 0.05 * arcLength, true);

        switch(contours.cornerCount(i)) {
          case 3:
            cp.drawContour(contours, i, GREEN);
            break;
          case 4:
            cp.drawContour(contours, i, RED);
            break;
          default:
            cp.drawContour(contours, i, WHITE);
        }
      }

      /*
      var lines = tmp.houghLinesP();

      if(lines.length === 0){
        continue;
      }

      var rotate = [];

      lines.forEach(function(tmp, i){

        var x1 = tmp[0], 
            y1 = tmp[1],
            x2 = tmp[2],
            y2 = tmp[3];

        cp.line([x1,y1], [x2, y2]);
        cp.line([x1,y1], [x2, y1]);

        var a = angleBetweenTwoVectors([x2, y2], [x2 + (x1*-1), y2 + (y1*-1)]) * 180 / Math.PI;
        rotate.push(a);
      });

      var a = rotate.reduce(function(v, c){ return v + c; }, 0) / rotate.length;
      console.log("rotate: ", a);

      cp.resize(300, 300);

      var mat = cv.Matrix.getRotationMatrix2D(a*-1, cp.width()/2, cp.height()/2, 1);
      cp.warpAffine(mat);

      //cp.rotate();
      */

      cp.save("./tmp/warp-image-" + i + ".png");
      console.log('Image saved to ./tmp/warp-image-' + i + '.png');

      //im.line([face.x,face.y], [face.x + face.width, face.y]);
      //im.line([face.x + face.width,face.y], [face.x + face.width, face.y + face.height]);
      //im.line([face.x + face.width,face.y + face.height], [face.x, face.y + face.height]);
      //im.line([face.x,face.y + face.height], [face.x, face.y]);
      //
      //im.ellipse(face.x + face.width / 2, face.y + face.height / 2, face.width / 2, face.height / 2);
    }

    //im.save('./tmp/face-detection.png');
    //console.log('Image saved to ./tmp/face-detection.png');
  });


});

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