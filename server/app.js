var express = require('express');
var sys = require('sys')
var exec = require('child_process').exec;
var J = require('j');
var multer  = require('multer');
var bodyParser = require('body-parser');
var cors = require('cors');
var upload = multer({ dest: 'uploads/' });
var jsonfile = require('jsonfile');
var util = require('util');
var app = express();
var path = require('path');
var _ = require('lodash');
//Enable cross-origin resource sharing
app.use(cors({credentials: true, origin: true}));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
//App Modules
var excel = require(path.join(__dirname, './modules/excel'));
var iced = require(path.join(__dirname, './modules/iced-api'));
var crepdb = require(path.join(__dirname,'./modules/crepdb-api'));
var octave = require(path.join(__dirname,'./modules/octave'));
//Environnement 

// create application/json parser 
var jsonParser = bodyParser.json();
// app.set('view engine', 'jade');
// app.use(express.favicon());
// app.use(express.logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded());
// app.use(express.methodOverride());
// app.use(express.cookieParser()); // read cookies (needed for auth)

// create application/x-www-form-urlencoded parser 
var urlencodedParser = bodyParser.urlencoded({ extended: false });
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.session({ secret: 'CREP calculator' }));


var octavePath =(path.join(__dirname, 'Octave/'));
var octaveCmd='octave  --no-window-system --exec-path '+octavePath+' --silent --eval ';



//ROUTES
app.get('/',function(req,res){
  res.send('CREP API');
});

app.get('/samples/:id', iced.getSampleById);
app.get('/samples', iced.getSamples);
app.get('/samplesBe', iced.getSamples10Be);
app.get('/samplesHe', iced.getSamples3He);
app.get('/localities/:id', iced.getLocalityById);

app.get('/publi', iced.getAllPubliMatch);

// app.get('/publi/:sampleId', iced.getPubliforSamples);
// app.get('/localities/:name', iced.getLocalityByName);
app.get('/localities', iced.getLocalities);
app.get('/localities10Be', iced.getLocalities10Be);
app.get('/localities3He', iced.getLocalities3He);
app.get('/markers/3', crepdb.getMarkers3He);
app.get('/markers/10', crepdb.getMarkers10Be);
app.get('/markers/all', crepdb.getAllMarkers);

app.get('/samples/:sampleId/mean/', crepdb.getSampleMeanById);
app.get('/samples/mean/:nucl', crepdb.getSamplesMean);
app.get('/localities/:locality/mean',crepdb.getLocalityMeanById);
app.get('/localities/mean/:nucl',crepdb.getLocalitiesMean);
app.get('/regions',crepdb.getRegionsGroups);
app.get('/regions/mean/:nucl',crepdb.getRegionalMean);
app.get('/world/mean/:nucl',crepdb.getWorldMean);

// Geo Magnetic importation from Excel file
app.post('/xlsjs/gmdb', upload.single('gmdbFile'),excel.gmdbImport);

// Sample Data importation from Excel file
app.post('/xlsjs/sample', upload.single('sampleFile'),excel.sampleImport);

//Production Rate Calculation using user values
app.post('/process/userpr',jsonParser, octave.processUserPr);

//Ages Calculation 
app.post('/process/ages',jsonParser, octave.processAges);

//PDF Export to Excel file
app.get('/export/:id', excel.pdfExport);
app.enable('trust proxy');

var server = app.listen(55581,function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App is listening at port', port);
});
