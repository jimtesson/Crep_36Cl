// Methods used for Excel file conversion and importation
var sys = require('sys');
var exec = require('child_process').exec;
var path = require('path');
var J = require('j');
var jsonfile =require('jsonfile');
var excelbuilder = require('msexcel-builder');
var fs = require('fs');
var _ = require('lodash');
var bibtexParse = require('bibtex-parse-js');

var iced = require(path.join(__dirname, './iced-api'));
var recalc = require(path.join(__dirname, './recalc'));

//Helper used to 
//Cast data from string to Float Values
var formatGmdbExcel = function(data){
  //Empty array for result
  res= [];
  //store fields 
  keys = Object.keys(data[0]);
  //Iterate trough entries
  for (var i = data.length - 1; i >= 0; i--) {
    //Iterate trough fields
    line = [];
    for (var j = keys.length - 1; j >= 0; j--) {
      // console.log(data[i][keys[j]]);
      line.unshift(parseFloat(data[i][keys[j]]));
    };
    res.unshift(line);
  };
  //Prevent a crash if user send a file
  //with data beginning on first line
  //(entrie with age 0 is omited which causes Matlab Crash)
  if(keys[0]==0){
    var firstLine =[0];
    firstLine.push(parseFloat(keys[1]));
    res.unshift(firstLine);
  }
  return res;
};


// Importation of GMBD data from Excel file
// and conversion to desired format
exports.gmdbImport = function (req, res) {
  console.log(req.file);
  if (req.file){
    filename = req.file.path;
    var cmd = 'j --json ' + filename ;
    //Call j in shell to convert to json 
    child = exec(cmd, function (error, stdout, stderr) {
      //Parse Json
      data = JSON.parse(stdout);
      // Empty Array for formated data
      formated = formatGmdbExcel(data);
      // Send to standard output
      res.send(formated);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }
    });
  }
};

//Importation of Sample Data from Excel File
// ( same as gmdbImport but without formatting)
exports.sampleImport = function (req, res) {
  //console.log("Importing file: ",req.file);
  if (req.file){
    filename = req.file.path;
    var cmd = 'j -J ' + filename ;
    //Call j in shell to convert to json
     // console.log("cmd to import sample file in excel.js",cmd)
    child = exec(cmd, function (error, stdout, stderr) {
      //  console.log("convert to json error:",error)
      //Parse Json to format it
      data = JSON.parse(stdout);
      // Send to standard output
      res.send(data);
     // console.log('stderr: ' + stderr);
      if (error !== null) {
       console.log('exec error: ' + error);
     }
   });
  }
};

var referencesText = function(nucl,scheme,gmdb,atm,publiStr){
  date = new Date().toDateString();
  nuclStr = "3He";
  if(nucl==10)
    nuclStr = "10Be";
  schemeStr="Lal/Stone time dependent";
  if(scheme == 2)
    schemeStr = "LSD";
  if(atm == 0)
    atmStr = "ERA-40";
  else
    atmStr = "standard atmosphere model";
  if(gmdb == 1)
    gmdbStr = "Atmospheric 10Be-based VDM";
  if(gmdb == 2)
    gmdbStr="Lifton 2016 VDM";
  if(gmdb == 3)
    gmdbStr="LSD Framework";

  schemeShorts = [
  "Balco et al., 2008; Lal, 1991; Stone, 2000",
  "Lifton et al., 2008"
  ];
  atmShorts = [
  "Uppala et al., 2005",
  "NOAA, 1976"
  ];
  gmdbShorts = [
  "Muscheler, et al. 2005;Valet et al., 2005",
  "Laj et al., 2004; Lifton, 2016; Pavón-Carrasco et al., 2014; Ziegleret al., 2011",
  "Korte et al., 2003; Korte et al., 2009; Laj et al.,2004; Lifton et al., 2014; Ziegler et al., 2011"
  ];
  exportStr="These cosmogenic "+nuclStr+" exposure ages were calculated on "+ date +",  using the online CREp calculator (crep.crpg.cnrs-nancy.fr; Martin et al., 2016)."+
  "They were computed using the scaling scheme "+ schemeStr+" ("+ schemeShorts[scheme-1]+"),  with the "+atmStr+ " ("+ atmShorts[atm]+"), the geomagnetic record of "+gmdbStr+ " ("+ gmdbShorts[gmdb-1]+") and the production rates calibrated by "+publiStr +"."

  return exportStr;
};


// generate short format string for publi Array in bibtex 
var publicationPR = function(publi){
  publiStr = [];
  _.each(publi,function(p){
    publiObject = bibtexParse.toJSON(p.bibtex_record)[0]['entryTags'];
    author = publiObject['author'].split(',')[0] + ' et al. ';
    year = publiObject['year'];
    // console.log(author,publiObject['year']);
    publiStr.push(author + '(' + year + ')');
  });
  // console.log(publiStr);
  return publiStr; 

};
// generate Array of 
//long format string for publi Array in bibtex 
var referencesPR = function(publi){
  refStr = [];
  _.each(publi,function(p){
    itemStr= "", pages = null;
    publiObject = bibtexParse.toJSON(p.bibtex_record)[0]['entryTags'];
    author = publiObject['author']+ ', ';
    year = publiObject['year']+ ', ';
    title = publiObject['title']+ '. ';
    journal = publiObject['journal']+ ', ';
    if (publiObject['pages'] != '-' && publiObject['pages'] != undefined)
      pages = publiObject['pages']+ '. ';
    else
      pages = null;
    if (publiObject['volume'] != null && publiObject['volume'] != '-' && publiObject['volume'] != undefined)
      volume = publiObject['volume']+'. ';
    console.log(publiObject);
    _.each([author,year,title,journal,volume,pages], function(item){
      if (item != null && item != '-' && item != undefined)
        itemStr= itemStr + item ;
    });
    // refStr.push(author + ',' + year + ',' + title + ',' + journal+ ',' + pages + ',' + volume);
    refStr.push(itemStr);
  });
  console.log(refStr);
  return refStr; 

};

var generateExcelFile = function( obj, inputData, publi, res) {
  data = _.values(obj)[0];
  console.log(inputData);

  //check if nb samples > 1
  var multiSamples = Array.isArray(data.SamplePDF);
  var filename = inputData.execId+'.xlsx';
  // Create a new workbook file in current working-path 
  var workbook = excelbuilder.createWorkbook('./', filename);

  // Create a new worksheet with 10 columns and 12 rows 
  var sheet1 = workbook.createSheet('PDF', data.SamplePDF.length+1, data.TimeV.length+2);
  // Fill First Row
  sheet1.set(1, 1, 'TimeV(ka)');

  //If more than 1 sample
  if(multiSamples){
    for (var i = 1; i < data.SamplePDF.length + 1; i++)
      sheet1.set(i+1, 1, data.SamplePDF[i-1]);
    

    //Fill TimeV
    for (var i = 1; i < data.TimeV.length + 1; i++){
      sheet1.set(1,i+1, data.TimeV[i-1]);
      //And samples PDF
      for (var j = 1; j < data.SamplePDF.length + 1; j++){
        sheet1.set(j+1, i+1, data.PDF[j-1][i-1]);
      }
    }
  }
  //If only 1 sample
  else{
    sheet1.set(2, 1, data.SamplePDF);

    //Fill TimeV
    for (var i = 1; i < data.TimeV.length + 1; i++){
      sheet1.set(1,i+1, data.TimeV[i-1]);
      //And samples PDF
      sheet1.set(2, i+1, data.PDF[i-1]);
    }
  }
  //Create sheet2
  var sheet2 = workbook.createSheet('Ages', 10, data.SamplePDF.length+1);

  var fl = ['Sample','Scaling Factor','Age(ka)','1σ (ka)','1σ without PR error','Status'];
  //Fill first line
  for (var i = 1; i < fl.length + 1; i++)
    sheet2.set(i,1,fl[i-1]);


  //if one sample
  if(!multiSamples){
    sheet2.set(1, 2, data.SamplePDF);
    sheet2.set(2, 2, Math.round(data.ScalFact*100) /100 );
    sheet2.set(3, 2, Math.round(data.Ages*100) /100 );
    sheet2.set(4, 2, Math.round(data.AgesErr*100) /100 );
    sheet2.set(5, 2, Math.round(data.AgesErr2*100) /100 );
    sheet2.set(6, 2, data.Status);
  }
  else{
      //else if more than 1 sample
      //Fill with samples data
      for (var i = 1; i < data.SamplePDF.length + 1; i++){
        sheet2.set(1, i+1, data.SamplePDF[i-1]);
        sheet2.set(2, i+1, Math.round(data.ScalFact[i-1]*100) /100 );
        sheet2.set(3, i+1, Math.round(data.Ages[i-1]*100) /100 );
        sheet2.set(4, i+1, Math.round(data.AgesErr[i-1]*100) /100 );
        sheet2.set(5, i+1, Math.round(data.AgesErr2[i-1]*100) /100 );
        sheet2.set(6, i+1, data.Status[i-1]);
      }
    }
  //Sheet 3 => publication list
  schemeRefs = [
    [
      "Balco, G., Stone, J.O., Lifton, N. a., Dunai, T.J. (). A complete and easily accessible means of calculating surface exposure ages or erosion rates from 10Be and 26Al measurements. Quat. Geochronol. 3, 174–195, 2008.",
      "Lal, D. Cosmic ray labeling of erosion surfaces: in situ nuclide production rates and erosion models. Earth Planet. Sci. Lett. 104, 424–439, 1991.",
      "Stone, J.O. Air pressure and cosmogenic isotope production. J. Geophys. Res. 105, 23753. doi:10.1029/2000JB900181, 2000."
    ],
    [
      "Lifton, N., Sato, T., Dunai, T.J.. Scaling in situ cosmogenic nuclide production rates using analytical approximations to atmospheric cosmic-ray fluxes. Earth Planet. Sci. Lett. 386, 149–160, 2008."
    ]
  ];

  atmRefs = [
    [
      "Uppala, S.M., Kallberg, P.W., Simmons, a. J., Andrae, U., Bechtold, V.D.C., Fiorino, M., Gibson, J.K., Haseler, J., Hernandez, a., Kelly, G. a., Li, X., Onogi, K., Saarinen, S., Sokka, N., Allan, R.P., Andersson, E., Arpe, K., Balmaseda, M. a., Beljaars, a. C.M., Berg, L. Van De, Bidlot, J., Bormann, N., Caires, S., Chevallier, F., Dethof, a., Dragosavac, M., Fisher, M., Fuentes, M., Hagemann, S., Hólm, E., Hoskins, B.J., Isaksen, L., Janssen, P. a. E.M., Jenne, R., Mcnally, a. P., Mahfouf, J.-F., Morcrette, J.-J., Rayner, N. a., Saunders, R.W., Simon, P., Sterl, a., Trenberth, K.E., Untch, a., Vasiljevic, D., Viterbo, P., Woollen, J.,. The ERA-40 re-analysis. Q. J. R. Meteorol. Soc. 131, 2961–3012, 2005."
    ],
    [
      "National Oceanic and Atmospheric Administration, U.S. Standard Atmosphere. US Government Printing Office, 1976"
    ]
  ];

  gmdbRefs = [
    [
      "Muscheler, R., Beer, J., Kubik, P.W., Synal, H.,. Geomagnetic field intensity during the last 60,000 years based on 10Be and 36Cl from the Summit ice cores and 14C. Quat. Sci. Rev. 24, 1849–1860, 2005.",
      "Valet, J.-P., Meynadier, L., Guyodo, Y,. Geomagnetic dipole strength and reversal rate over the past two million years. Nature, 435, 802-805, 2005."
    ],

    [
      "Laj, C., Kissel, C., Beer, J., Channell, J., Kent, D., Lowrie, W., Meert, J. High resolution global paleointensity stack since 75 kyr (GLOPIS-75) calibrated to absolute values. In: Timescales of the Geomagnetic Field, pp. 255–265, 2004.",
      "Lifton, N. Implications of two Holocene time-dependent geomagnetic models for cosmogenic nuclide production rate scaling. Earth Planet. Sci. Lett. 433, 257-268, 2016.",
      "Pavón-Carrasco, F.J., Osete, M.L., Torta, J.M., De Santis, A. A geomagnetic field model for the Holocene based on archaeomagnetic and lava flow data. Earth Planet. Sci. Lett. 388, 98–109, 2014.2016.",
      "Ziegler, L.B., Constable, C.G., Johnson, C.L., Tauxe, L.,. PADM2M: a penalized maximum likelihood model of the 0–2 Ma palaeomagnetic axial dipole moment. Geophys. J. Int. 184, 1069–1089, 2011."
    ],
    
    [
      "Korte, M., Constable, C. Continuous global geomagnetic field models for the past 3000 years. Phys. Earth Planet. Inter.140, 73–89, 2003.",
      "Korte, M., Donadini, F., Constable, C.G. Geomagnetic field for 0–3 ka: 2. A new series of time-varying global models. Geochem. Geophys. Geosyst. 10, 1–24, 2009.",
      "Laj, C., Kissel, C., Beer, J., Channell, J., Kent, D., Lowrie, W., Meert, J. High resolution global paleointensity stack since 75 kyr (GLOPIS-75) calibrated to absolute values. In: Timescales of the Geomagnetic Field, pp. 255–265, 2004.",
      "Lifton, N., Sato, T., Dunai, T.J. Scaling in situ cosmogenic nuclide production rates using analytical approximations to atmospheric cosmic-ray fluxes. Earth Planet. Sci. Lett. 386, 149–160, 2014.",
      "Ziegler, L.B., Constable, C.G., Johnson, C.L., Tauxe, L.,. PADM2M: a penalized maximum likelihood model of the 0–2 Ma palaeomagnetic axial dipole moment. Geophys. J. Int. 184, 1069–1089, 2011."
    ]
  ];

  crepRef =["Martin, L., Blard, P.-H., Balco, G., Lave, J., Delunel,R., Lifton, N., Laurent, V., 2016. The CREp program and the ICE-D production rate calibration database: a fully parameterizable and updated online tool to compute cosmic-ray exposure ages. Quat. Geochronol. XX, XX-XX."];

  publiRef = 0;
  //if publi != custom
  if(Array.isArray(publi)){
    //generate shorts reference for production rate
    publiStr=publicationPR(publi);
    
    //generate long ones
    publiRef=referencesPR(publi);
  }

  // Merge Array of complete references
  publiStrArray  = _.union(publiRef, crepRef, atmRefs[inputData.atm], gmdbRefs[inputData.gmdb -1], schemeRefs[inputData.Scheme - 1]);

  var sheet3 = workbook.createSheet('References', 10,300);
  // sheet3.set(1,1, "nucl");
  // sheet3.set(1,2, inputData.Nucl);
  // sheet3.set(2,1, "scaling scheme");
  // sheet3.set(2,2, inputData.Scheme);
  // sheet3.set(3,1, "Gmdb");
  // sheet3.set(3,2, inputData.GMDB);
  // sheet3.set(4,1, "Atm");
  // sheet3.set(4,2, inputData.Atm);

  console.log("short PR ref",publiStr);
  sheet3.set(1, 2, referencesText(inputData.Nucl,inputData.Scheme, inputData.GMDB, inputData.Atm ,publiStr));

  sheet3.set(1,8, "References");
  publiStrArray = publiStrArray.sort();
  // console.log(publiStrArray);

  for (var refCount = 1; refCount < publiStrArray.length + 1; refCount++)
    sheet3.set(1,(refCount+9),publiStrArray[refCount-1]);
  
  // console.log(bibtexParse.toJSON(publiStr));

  opt ={
    root: './',
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true,
      'Content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      "Content-disposition": "attachment; filename="+filename
    }
  }

  // Save it 
  workbook.save(function(ok){
    res.sendFile(filename,opt, function (err) {
      if (err) {
        console.log(err);
        res.status(err.status).end();
      }
      else {
        console.log('Sent:', filename);
      }
    });
  });
};
//Create PDF Excel table
exports.pdfExport = function(req,res){
  var id = req.params.id;
  var octavePath =(path.join(__dirname, '../Octave/'));
  var prOutputFile = octavePath+'data/ages/'+id+'out';
  var prInputFile = octavePath+'data/ages/'+id+'in';

  jsonfile.readFile(prInputFile, function(err,inputData){
    if(err){
      // res.status(err.status).end();
      res.send("Error while reading the results.(wrong id ?)");
      console.log(err);
    }
    else{
      jsonfile.readFile(prOutputFile,function(err, outData){
        if(err){
          // res.status(err.status).end();
          res.send("Error while reading the results.(wrong id ?)");
          console.log(err);
        }
        else{
          //PrMode 3 => custom Pr
          if (inputData.prMode == 3){
            publiStr = "User";
            generateExcelFile(outData,inputData,publiStr,res);
          }

          //Prmode 0 => world mean
            //get all publications related to 3He / 10be
            if (inputData.prMode == 0){
              //get all localities for regions
              i=0;
              localities = [];
              recalc.getRegionsGroups(function(groups){
                _.each(groups,function(regionSelected){
                //Each region group selected, fetch object
                g = regionSelected;

                //get all localities ids for this region
                recalc.getLocalitiesIdForRegionGroup(g,inputData.Nucl, function(l){
                  // console.log("g",g);
                  // console.log('l',l);
                  Array.prototype.push.apply(localities,l);

                  i++;
                  //if last iteration
                  //Then list of localities is complete
                  if(i == groups.length){  
                    iced.getLocalitiesPublications(localities,function(publi){
                      // console.log(publi,g);
                      generateExcelFile(outData,inputData,publi,res);
                    });
                  }
                });
              });
              });
            }

          //Prmode 2 => regions
          if(inputData.prMode ==2){
            //get all localities for regions
            i=0;
            localities = [];
            recalc.getRegionsGroups(function(groups){
              _.each(inputData.selectedMarkers,function(regionSelected){
                //Each region group selected, fetch object
                g = (_.find(groups,{id: regionSelected}));

                //get all localities ids for this region
                recalc.getLocalitiesIdForRegionGroup(g,inputData.Nucl, function(l){
                  // console.log("g",g);
                  // console.log('l',l);
                  Array.prototype.push.apply(localities,l);

                  i++;
                  //if last iteration
                  //Then list of localities is complete
                  if(i == inputData.selectedMarkers.length){  
                    iced.getLocalitiesPublications(localities,function(publi){
                      // console.log(publi,g);
                      generateExcelFile(outData,inputData,publi,res);
                    });
                  }
                });
              });
            });
          }

          //Prmode 1 => localities
          if(inputData.prMode==1){
            //get all publications for localities ids
            iced.getLocalitiesPublications(inputData.selectedMarkers,function(publi){
              // console.log(publi);
              generateExcelFile(outData,inputData,publi,res);
              
            });
          }
        }
      });
    }

  })
};



