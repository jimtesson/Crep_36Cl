var sys = require('sys')
var exec = require('child_process').exec;
var jsonfile = require('jsonfile');
var path = require('path');
var _=require('lodash');
var octavePath =(path.join(__dirname, '../Octave/'));
var octaveCmd='octave-cli --no-window-system --exec-path '+octavePath+' --silent  --eval ';
//const octavePath =('../Octave/');
//const octaveCmd='octave-cli  -W  --exec-path '+octavePath+' --silent --eval ';


exports.processAges = function(req, res){
  //get json data
  var obj= req.body;
  pr = obj.PR;
  obj.PR = [pr[0],pr[1]];
  var execId = obj.execId;
  var prInputFile = octavePath+'data/ages/'+execId+ 'in';
     // console.log('processing ages prInputFile:',prInputFile);
  var prOutputFile = octavePath+'data/ages/'+execId+'out';

  //var prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetAgesf('"+prInputFile+"')"+'"';
  let prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetAgesf('"+prInputFile+"')"+'"';
  jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
      if(err)
      console.error(err);
    else{
     // console.log('req stored in file ' +prInputFile );
      var childCalc =exec(prCmd, function(err, stdout, stderr){
        if (err){
          throw err;
          res.err(500);
          res.send("Failed to Calculate Ages. Please check your data.");
        } 
        else{
          jsonfile.readFile(prOutputFile, function(err, obj) {
           // console.log('file ' + prOutputFile + ' was read' );
            //console.dir(obj);
            // Sending to res to close the request
            res.type('json');
            res.send(obj);
          });
        }
      });
    }
  });
};

exports.processUserPr = function(req, res){
  //get json data 
  var obj= req.body;
  var execId = obj.execId;
  var prInputFile = octavePath+'data/pr/'+execId+ 'in';
  var prOutputFile = octavePath+'data/pr/'+execId+'out';
  var prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetUserPRf('"+prInputFile+"')"+'"';

  jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
    if(err)
      console.error(err);
    else{
      console.log('req stored in file ' +prInputFile );
      var childCalc =exec(prCmd, function(err, stdout, stderr){
        if (err){
          throw err;
          res.err(500);
          res.send("Failed to Calculate PR. Please check your data.");
        } 
        else{
          jsonfile.readFile(prOutputFile, function(err, obj) {
            console.log('file ' + prOutputFile + ' was written' );
            console.dir(obj);
            // Sending to res to close the request
            res.type('json');
            res.send(obj);
          });
        }
      });
    }
  });
};



