var markerSelectedIcon = L.icon({
  shadowSize : [0,0],
  popupAnchor:[0,-35],
  iconUrl: 'img/marker.png'
});
var markerSampleIcon = {
  iconUrl: 'img/marker-sample.png',
  iconSize: [25,40],
  popupAnchor:[0,-35],
  iconAnchor:[12,40]
};
var markerDefaultIcon = L.icon({
  popupAnchor:[0,-35],
  shadowSize : [0,0],
  iconUrl: 'img/marker-default.png'
});
// prArray : [[pr,1s], [pr,1s]...]
// weightedMeanCalc => [pr,1s]
function weightedMeanCalc(prArray){
  valSum = 0;
  weights = [];
  weightsSum = 0;
  weightedSum = 0;
  swds=[];
  swdsSums = 0;
  unsNumer= 0;
  unsDenom=0;
  resUns=0;
  unsType = "Weighted Standard Deviation";
  //Non zero weights
  nzw=0;
  //First loop
  _.each(prArray,function(val){
    pr = val[0];
    uns = val[1];
    w = 1 / (uns *uns);
    if(w!==0)
      nzw++;
    weights.push(w);
    weightsSum = weightsSum + w;
    valSum = valSum + pr;
  });

  //calculate Mean value
  moy = valSum / prArray.length;
  //Second loop
  _.each(prArray,function(val){
    pr = val[0];
    uns = val[1];
    swd = (pr - moy) / uns;
    swd = swd*swd;
    swds.push(swd);
    swdsSums =swdsSums + swd;
  });

  // //Calculate mswd
  mswd =  swdsSums / (prArray.length - 1);

  //Calculate Weighted Mean 
  _.each(prArray, function(val,key){
    weightedSum = weightedSum + val[0] * weights[key];    
  });
  weightedMean = weightedSum / weightsSum;


  //Calculate WSTD
  unsDenom = (nzw -1) * weightsSum / nzw;
  _.each(prArray,function(val,key){
    a = (val[0]-weightedMean);
    a = a*a;
    unsNumer = unsNumer + (a*weights[key]);

  });


  if(prArray.length >1){
    resUnsMSWD = Math.sqrt(1/weightsSum);
    if (mswd > 1){
      resUnsMSWD *= Math.sqrt(mswd);
    }
    resUns= Math.sqrt(unsNumer/unsDenom);

    //Take highest uncert
    if(resUnsMSWD>resUns){
      resUns = resUnsMSWD;
      unsType = "Error of the weighted mean";
    }
  }
  else{
    resUns = prArray[0][1];
    unsType= null;
  }

  console.log("weighted mean : "+ weightedMean,",", resUns);
  return [weightedMean, resUns,mswd, unsType]; 
}
//var baseUrl = "http://vps221926.ovh.net:443/";
var baseUrl = "https://crep.otelo.univ-lorraine.fr/";
var app = angular.module('app', ['ui.bootstrap', 'ui.router',
  'nvd3ChartDirectives', 'angularRangeSlider','zingchart-angularjs', 'ui-leaflet' 
  ]);


app.config(
  function($stateProvider,$urlRouterProvider) {
    $stateProvider
    .state('home', {
      url: "/",
      templateUrl: "partials/home.html"
    })
    .state('parameters', {
      url: "/init",
      templateUrl: "partials/init.html"
    })
    .state('production-rate', {
      url: "/production-rate",
      templateUrl: "partials/pr-custom.html"
    })
    .state('samples', {
      url: "/samples",
      templateUrl: "partials/samples.html"
    })
    .state('db-error', {
      url: "/db-error",
      templateUrl: "partials/db-error.html"
    })
    .state('crep-error', {
      url: "/crep-error",
      templateUrl: "partials/crep-error.html"
    })
    .state('calculation', {
      url: "/calculation",
      templateUrl: "partials/calc.html",
      controller: "testController"
    });
    $urlRouterProvider.otherwise('/');
  });
app.controller('mainController', function($scope, $http, $timeout, $window, $location, $filter, $state,leafletData) {
    //Parent Object with all fields
    // Extend to globalData
    $scope.parentParams = {
      Name: 'Testing',
      gdbName : "Muscheler et al., 2005",
      execId: Math.floor((Math.random() * 10000) + 1),
      Nucl: 10,
      Scheme: 1,
      Atm: 0,
      GMDB: 1,
        //PR Calculated
        PR: [0, 0], //Sample Names
        Samples: [], //PR Data
        Age: [0, 0],
        Lat: [0],
        Lon: [0],
        Alt: [0],
        Thick: [0],
        Shield: [0],
        Dens: [0],
        Eros: [0],
        NuclCon: [0],
        NuclErr: [0],
        NuclNorm: [""], //Note Variables, special cases and errors
        Notes: -9999
      };
      $scope.isArray = angular.isArray;
      $scope.isString = angular.isString;

      $scope.parseInt = parseInt;
      // Generates a db Field name for Mean value
      // for int params
      // Scal 1 LAL, 2 LSD
      // Atm 0 ERA, 1 STD
      // GDB 1 Muscheler, 2 Lifton, 3 LSD
      // example : LSDERAL
      var fieldName = function(scal,atm,gdb){
        var name ="";
        scalStr =['LAL','LSD'];
        atmStr  =['ERA','STD'];
        gdbStr  =['M','G', 'L'];
        name = name + scalStr[parseInt(scal)-1] + atmStr[parseInt(atm)] + gdbStr[parseInt(gdb)-1];
        return name;
      };
      $scope.genFieldName = function(){
        $scope.fieldStr = fieldName($scope.params.globalData.Scheme,$scope.params.globalData.Atm,$scope.params.globalData.GMDB);
        console.log($scope.fieldStr);
      };
      var initParams = function() {
        $scope.params = {
          globalData: _.clone($scope.parentParams),
          prData: {},
          prRes: [],
          ageData: {},
          ageRes: {}
        };
        // initGlobal();
        initPrData();
        initAgeData();
        $scope.prToggle = 0;
      };
      $scope.resetParams = function(){
        $window.location.reload();
        initParams();
        $scope.tabChange();
        $scope.loadGmdb($scope.params.globalData.GMDB);
        $scope.prToggle = 0;
        $scope.agesPDF = [];
        $scope.go('init');
      };
    // var initGlobal = function(){
    //   $scope.params.globalData = _.extend($scope.parentParams);
    // };
    var initPrData = function() {
      $scope.params.prData = _.extend($scope.params.globalData);
    };
    var initAgeData = function() {
      $scope.params.ageData = {};
      $scope.params.ageData = _.extend($scope.params.globalData);
    };
    initParams();
    $scope.apiUrl = baseUrl;
    $scope.getLocalities = function() {
      $scope.localities = [];
      console.log("getting localities");
      $http({
        url: baseUrl+"markers/"+$scope.params.globalData.Nucl,
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(function successCallback(response) {
        markers = {};
            // when the response is available
            $scope.markers= response.data;
            // $scope.markersFiltered = $scope.markers.concat($scope.samplesMarkers);
             //console.log($scope.samplesMarkers);
            $scope.updateMarkers(0,90000);
          }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            // alert("Could not fetch samples from DB");
            $scope.go('db-error');
            console.log(response);
          });
    };
    $scope.getAllLocalitiesMarkers = function(){
      $http({
        url: baseUrl+"markers/all",
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(function successCallback(response) {
            // when the response is available
            $scope.allMarkers= response.data;
          }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            $scope.go('db-error');
            console.log(response);
          });
    };

    $scope.getRegions = function(){
      $scope.regionsMean = [];
      $scope.regions = [];
      nucl = $scope.params.globalData.Nucl;
      if ( nucl == 10)
        nuclStr = '10be';
      else
        nuclStr = '3he';

        // Get geojson data from a JSON
        $http.get("geo-json/regions-"+nuclStr+".json").success(function(data, status) {
          angular.extend($scope, {
            regions: {
              data: data,
              style: {
                fillColor: "green",
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
              }
            }
          });
          //Get Regional Mean data for nucl
          $http({
            url: baseUrl+"regions/mean/" +nucl,
            method: "GET",
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(function successCallback(response) {
            $scope.regionsMean = response.data;
          }, function errorCallback(response) {
            console.log("Failed to retrieve Regional Mean");
          });

        });

      };

    //get PR World Value for params (nucl, scal, atm, gmdb) 
    $scope.getWorldMean = function(nucl,scal,atm,gmdb){
      $http({
        url: baseUrl+"world/mean/" +nucl,
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(function successCallback(response) {
        if (Number.isInteger($scope.params.globalData.GMDB)){
          //Generate name of the field (LSDSTDL)
          f = $scope.fieldStr;
          //Get the value from the data
          value = response.data[f];
          //Split string to [pr,1s]
          prStr = value.split(",");
          //set parsed value as user pr
          $scope.params.globalData.PR = [parseFloat(prStr[0]),parseFloat(prStr[1])];
        }
      }, function errorCallback(response) {
        console.log("Failed to retrieve World Mean");
      });
    };

    function getMeanForMarker(marker,field){
      //console.log("getMeanForMarker",field);
      value = marker[field];
      //Split string to [pr,1s]
      prStr = value.split(",");
      //return parsed value
      return [parseFloat(prStr[0]),parseFloat(prStr[1])];
    }
    $scope.getMeanForMarker = getMeanForMarker;

    function getMeanForRegion(region,field){
      // console.log(field);
      id = region.id;
      // console.log('Region', region);
      // console.log($scope.regionsMean);
      m = _.find($scope.regionsMean,{'regional_id':id});
      if(m){
        value = m[field];
        //Split string to [pr,1s]
        prStr = value.split(",");
        //return parsed value
        return [parseFloat(prStr[0]),parseFloat(prStr[1])];
      }
      else
        return [0,0];
    }
    $scope.getMeanForRegion = getMeanForRegion;
    //Tab of Selected Markers
    $scope.selectedMarkers = [];
    $scope.customPrInput = {
      Age: []
    };
    $scope.agesLoading = 0;
    $scope.prInputs = [];
    $scope.slhlInput = [];
    $scope.min = 1;
    $scope.max = 600;
    $scope.gdbTab = true;
    $scope.customPr = false;
    $scope.customPrToggle = 0;
    $scope.customGdb = false;
    $scope.browsePr = true;
    $scope.prTab = false;
    $scope.gdbData = [{
      "key": "Series 1",
      "values": []
    }];
    $scope.sampleHelp = false;
    $scope.agesPDF = [];
    // Fonction used to fetch and load Geomagnetic data for @id in list
    // 1 -> Muscheler
    // 2 -> Lifton 2016
    // 3 -> LSD
    $scope.loadGmdb = function(id) {
        // check if no data was imported by user 
        if (id === 1 || id === 2 || id === 3) {
          var filenameTab = ["GMDBMUSCH","GMDBLIFTON","GMDBLSD"];
          var filename = filenameTab[id-1] + ".json";
          var nameTab = ["Muscheler et al., 2005","LiftonVDM2016","LSD Framework"];
          $scope.params.globalData.gdbName = nameTab[id-1];
          $http.get('js/' + filename).success(function(response) {

            //Find index of 1000ka data
            lastIndex = _.findLastIndex(response,function(p){
              return Math.round(p[0]) <= 100;
            });
             //Slice VDM data to [0,1000ka] range
             slicedVDM = _.slice(response, 0, lastIndex +1);

             //Display sliced data
             $scope.gdbData[0].values = slicedVDM;
           });
        }
      };
    // Function used to import an excel file, 
    //send data to server for json conversion,
    //and set returned data as Geomagnetic Database
    $scope.uploadGmdbFile = function(files) {
      var fd = new FormData();
      var uploadUrl = baseUrl + "xlsjs/gmdb";
        //Take the first selected file
        fd.append("gmdbFile", files[0]);
        $http.post(uploadUrl, fd, {
          withCredentials: false,
          headers: {
            'Content-Type': undefined
          },
          transformRequest: angular.identity
        }).success(function(data) {
            //Update graph data
            $scope.gdbData[0].values = data;
            // console.log(data);
            //Transpose data into 2D Matrix and Update GMDB data
            $scope.params.globalData.GMDB = transposeMatrix(
              data);
            $scope.params.globalData.gdbName = "Custom";
          }).error("error");
      };
    //Add listener for GMDB Change
    $scope.$watch('params.globalData.GMDB', $scope.loadGmdb($scope.params
      .globalData.GMDB));
    $scope.$watchGroup(['params.globalData.GMDB','params.globalData.Scheme','params.globalData.Atm'],$scope.genFieldName);

    // Function used to import an excel file, 
    //send it to server for json conversion,
    //and use data received as the sample data for calculation
    $scope.uploadSampleFile = function(files) {
        //console.log("file details",files)

        var fd = new FormData();
        var uploadUrl = baseUrl + "xlsjs/sample";
        //console.log("uploadUrl",uploadUrl)
        //Take the first selected file
        fd.append("sampleFile", files[0]);

        $http.post(uploadUrl, fd, {
          withCredentials: false,
          headers: {
            'Content-Type': undefined
          },
          transformRequest: angular.identity
        }).success(function(data) {
          $scope.sampleData = formatSample(data);
          $scope.genSamplesMarkers();
        }).error("error");
      };

      $scope.checkSamples= function(){
        $scope.outside = 0;
        _.each($scope.samplesMarkers,function(val){
          // console.log(val, leafletPip.pointInLayer([val.lng,val.lat], L.geoJson($scope.regions.data)));
          if(!(leafletPip.pointInLayer([val.lng,val.lat], L.geoJson($scope.regions.data))).length)
            $scope.outside++;
        });
      };
      $scope.samplesMarkers = [];
      $scope.genSamplesMarkers=function(){
        $scope.samplesMarkers = [];
        var id=1000;
        _.each($scope.sampleData,function(s,k){
          // console.log(s);
          id = id++;
          m = {'id':id, 'message':s.Sample, 'clickable':false,'icon':markerSampleIcon,'name': s.Sample ,'lng':s.Lon, 'lat':s.Lat};
          $scope.samplesMarkers.push(m);
        });
        $scope.toggleView('localities');
        $scope.checkSamples();
      };

    //Rename all fields from data to resKeys Array
    var formatSample = function(data) {
      var resKeys = ["Sample", "Lat", "Lon", "Alt", "NuclCon", "NuclErr", "Shield", "Dens", "Thick", "Eros"];
        //Generate Map Object
        var keys = Object.keys(data[0]); //read first input to get file keys
        var map = {};
        var i = 0;
        _.each(keys, function(value, key) {
          map[value] = resKeys[i];
          i++;
        });
        var res={};
        var rename =function(value, key) {
          key = map[key] || key;
          res[key] = value;
        };
        //Output variable
        var resArr = [];
        for (i = 0; i < data.length; i++) {
          res = {};
          _.each(data[i], rename);
            // resArr.Dens = 0;
            resArr.push(res);
          }
          return(resArr);

        };
        $scope.addPrInput = function(input) {
        //Duplicates PR input, parse inputs to float numbers, 
        //and store res in prInputs Array
        var i=0;
        var resInput = _.cloneDeep(input);
        _.each(resInput, function(value,key){
          if(!i){
            resInput[key][0] = parseFloat(value[0]) * 1000;
            resInput[key][1] = parseFloat(value[1]) * 1000;
          }
          else{
            resInput[key]= parseFloat(value);
          }
          i++;
        });
        if(!$scope.prInputs.length) 
          $scope.prInputs.push(resInput);
        //Clear input object
        $scope.customPr = {};
      };
      $scope.addSlhlInput = function(input) {
        var slhl = _.cloneDeep(input);
        slhl[0] = parseFloat(slhl[0]);
        slhl[1] = parseFloat(slhl[1]);
        $scope.params.globalData.PR = slhl;
        $scope.slhlInput = [];
      };
      $scope.resetInputs = function() {
        $scope.prInputs = [];
      };

    //function used to fire resize event
    //Fixes display issues
    $scope.tabChange = function() {
      $timeout(function() {
        var evt = $window.document.createEvent(
          'UIEvents');
        evt.initUIEvent('resize', true, false, $window,
          0);
        $window.dispatchEvent(evt);
      });
    };
    //Production Rate Calculation using user values
    //If multiple values, server returns a weighted mean of the values
    $scope.processCustomPr = function() {
      if($scope.prInputs.length)
        urlStr = "process/userpr/";
      else
        urlStr = "process/multipr/";
      $http({
        url: baseUrl + urlStr,
        method: "POST",
        data: forgePrData($scope.params),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(function successCallback(response) {
            // when response is available
            //store PR in globalData
            // console.log(_.values(response.data)[0]);
            $scope.params.globalData.prRes = _.values(response
              .data)[0];
          }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            // alert("Error, Open console to debug");
            $scope.go('crep-error');
            console.log(response);
          });
    };

    $scope.loadPr = function(){
      $scope.params.globalData.PR= $scope.params.globalData.prRes.SLHLPR;
    };
    //Fonction used to update params.prData object before processing
    // Takes params object
    var forgePrData = function(params) {
      if($scope.prInputs.length < 2){
        //Update params.prData with prInputs
        //get prInputs
        inputs = _.cloneDeep($scope.prInputs[0]);
        // console.log(inputs);
        params.prData = _.merge(params.prData, inputs);
        // console.log(params.prData);
        //get Global Parameters
        var pr = _.extend(params.globalData);
        //Add Pr Fields
        pr = _.merge(pr, params.prData);
        //Return created Object
        return (pr);
      }
      else{
        var prObj = _.cloneDeep(params.globalData);
        prObj.prTab = [];
        _.each($scope.prInputs,function(value, key){
          //Update params.prData with prInputs
          //get prInputs
          inputs = _.cloneDeep($scope.prInputs[key]);
          // console.log(inputs);
          params.prData = _.merge(params.prData, inputs);
          // console.log(params.prData);
          //get Global Parameters
          var pr = _.extend(params.globalData);
          //Add Pr Fields
          pr = _.merge(pr, params.prData);
          //Return created Object
          prObj.prTab.push(pr);
        });
        return(prObj);
      }
    };
    //

    $scope.setPrMode=function(id){
      $scope.prMode = id;
    };
    var  forgeAgeData = function(params) {
        //update params.ageData with sampleData (imported from file)
        sampleMatrix=transposeMatrix($scope.sampleData);
        params.ageData.Samples =sampleMatrix[0] ;
        params.ageData.Lat = sampleMatrix[1];
        params.ageData.Lon = sampleMatrix[2];
        params.ageData.Alt = sampleMatrix[3];
        params.ageData.NuclCon = sampleMatrix[4];
        params.ageData.NuclErr = sampleMatrix[5];
        params.ageData.Shield = sampleMatrix[6];
        params.ageData.Dens =sampleMatrix[7];
        params.ageData.Thick = sampleMatrix[8];
        params.ageData.Eros = sampleMatrix[9];

        // Add info about selected localities /regions
        params.ageData.selectedMarkers = [];
        
        prMode = 0;
        _.each($scope.selectedMarkers,function(marker){
          //Add each marker id 
          params.ageData.selectedMarkers.push(marker.model.id);

          if($scope.prMode == 1 && !marker.model.site_id)
            $scope.prMode = 2;
        });
        

        params.ageData.prMode = $scope.prMode;


        //Merge with global params
        age = _.merge(params.globalData, params.ageData);
        return (age);
      };
      $scope.go = function (path) {
        $location.path(path);
        $scope.tabChange();
      };
    //Age Calculation 
    $scope.processAges = function() {
      $scope.agesLoading = 1;
      console.log("inside fction processage of build.js")
      $scope.agesPDF = [];
      $http({
        url: baseUrl + "process/ages",
        method: "POST",
        data: forgeAgeData($scope.params),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(function successCallback(response) {
            // when the response is available
            $scope.params.ageRes = _.values(response.data)[0];
            $scope.agesLoading = 0;
            agesSuccess($scope.params.ageRes);
            // $scope.resetMarkers();
            
          }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            $scope.agesLoading = 0;
            // alert("Error, Open console to debug");
            $scope.go('crep-error');
            console.log(response);
          });
    };
    var agesSuccess = function(ages){
      $scope.resetMarkers();
      //If more than 1 sample
      if(!angular.isString(ages.Samples)){

        _.each(ages.Samples, function(value, key){
          samplePDF = {"key": value,"values": []};
          samplePDF.values = ages.PDFdisp[key];
          //Push to Graph data
          $scope.agesPDF.push(samplePDF);
          console.log(samplePDF);
        });     
      }
      else{

        samplePDF = {"key": ages.Samples,"values": []};

        samplePDF.values = ages.PDFdisp;
        //Push to Graph data
        $scope.agesPDF.push(samplePDF);
        console.log(samplePDF);
      }
    };

    $scope.exportPDF = function(){
      $http({
        url: baseUrl + 'export',
        method: 'GET',
        responseType: 'arrayBuffer',
        data: $scope.params,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      }).then(function successCallback(data,status,headers,config) {
        var blob = new Blob([data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, 'export'+ '.xlsx');

      }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
        
            $scope.go('crep-error');
            console.log(response);
          });
    };
    var transposeMatrix = function(arr) {
      return Object.keys(arr[0]).map(function(c) {
        return arr.map(function(r) {
          return r[c];
        });
      });
    };

    $scope.map = {
      center: {
        latitude: 3,
        longitude: 7
      },
      zoom: 6
    };
  //Leaflet map

  angular.extend($scope, {
    layers: {
      baselayers: {
        topo: {
          name: "World Topographic",
          type: "agsBase",
          layer: "Topographic",
          visible: false
        },
        shadedrelief: {
          name: "ShadedRelief",
          type: "agsBase",
          layer: "ShadedRelief",
          visible: false
        },
        terrain: {
          name: "Terrain",
          type: "agsBase",
          layer: "Terrain",
          visible: false
        }
      }
    },
    // events: {
    //   markers: {
    //     enable: [ 'click','mouseover','mouseout' ],
    //         logic: 'emit'
    //       },
    //       geojson :{
    //         enable : ['click']
    //       }
    //     },
    noEvents: {
      markers: {
        enable: []
      },
      geojson :{
        disable : ['click']
      }
    }
  });

  angular.extend($scope, {
    homeMapSettings: {
      doubleClickZoom: false,
      wheelZoom : false,
      zoom:5

    }
  });

  $scope.$on("leafletDirectiveMarker.click", function(event, args){
    id = args.model.id;
    f = $scope.fieldStr;
   // console.log("id,f",id,f);
    mean = getMeanForMarker(args.model,f);
    //console.log(id,f, mean,args);
    $scope.toggleMarkerIcon(args);
  });

  $scope.$on("leafletDirectiveMarker.mouseover", function(event, args){
    args.leafletObject.openPopup();
  });
  $scope.$on("leafletDirectiveMarker.mouseout", function(event, args){
    //Disabled to prevent infinite Open/close loop
    // args.leafletObject.closePopup();
  });
  $scope.toggleMarkerIcon = function(markerObject){
    //Change Marker Style
    // And push / remove marker from selection
    if(markerObject.leafletObject._icon){
      elem = angular.element(markerObject.leafletObject._icon);
      sel = elem.hasClass('selected');
      if(!sel){
        markerObject.leafletObject.setIcon(markerSelectedIcon);
        $scope.pushMarker(markerObject);
        elem.addClass('selected');
      }
      else{
        markerObject.leafletObject.setIcon(markerDefaultIcon);
        $scope.popMarker(markerObject);
        elem.removeClass('selected');
      }
    }
  };
  $scope.toggleRegion = function(regionObject){
    //Change Region Style
    // And push /remove region from selection
    elem = angular.element(regionObject.leafletObject._path);
    sel = elem.hasClass('selected');
    regionObject.model.name = "";
    //console.log("regionObj", regionObject);
    if(!sel){
      regionObject.leafletObject.setStyle({fillColor:'red'});
      $scope.pushMarker(regionObject);
      elem.addClass('selected');
    }
    else{
      regionObject.leafletObject.setStyle({fillColor:'green'});
      $scope.popMarker(regionObject);
      elem.removeClass('selected');
    }
  };

  $scope.pushMarker=function(marker){
    $scope.selectedMarkers.push(marker);
    //console.log("push",marker);
  };
  $scope.popMarker=function(marker){
    //console.log(marker);
    $scope.selectedMarkers = _.reject($scope.selectedMarkers,function(m){
      return m.model.id==marker.model.id;
    });
  };
  $scope.round = Math.round;
  $scope.ceil = Math.ceil;
  $scope.log10 = Math.log10;
  $scope.selectAllMarkers = function(){
    markers = $scope.markers;
    f = $scope.fieldStr;
    _.each(markers, function(m){
      $scope.selectedMarkers.push({'model':m});
    });
  };
  $scope.resetMarkers=function(){
      // $scope.selectedMarkers = [];
      _.each($scope.selectedMarkers,function(v){
        if(v.model.age)
          $scope.toggleMarkerIcon(v);
        else
          $scope.toggleRegion(v);
      });
    };
    var resetMarkers = $scope.resetMarkers;

    $scope.updatePrOnMarkerChange =function(newLength){
      if($scope.selectedMarkers.length && newLength){
        //console.log("Markers Selection Changed");
        f =$scope.fieldStr;
        meanInput = [];
        _.each($scope.selectedMarkers,function(m){
            //Check if input is site or region
            if(m.model.age)
              pr = getMeanForMarker(m.model,f);
            else
              pr = getMeanForRegion(m.model,f);
            console.log(pr,m.model);
            meanInput.push(pr);
          });
        $scope.params.globalData.PR =weightedMeanCalc(meanInput);
        console.log($scope.params.globalData.PR);
      }
      else{
        $scope.params.globalData.PR =[0,0];
      }
    };
    $scope.$watch('selectedMarkers.length',$scope.updatePrOnMarkerChange);
    $scope.$watch('prToggle',function(value){
      if (!$scope.prToggle){
        $scope.getWorldMean($scope.params.globalData.Nucl,$scope.params.globalData.Scheme,$scope.params.globalData.Atm,$scope.params.globalData.GMDB);
      }
      else{
        $scope.params.globalData.PR = [0,0];
      }
    });

    // $scope.$watch('prToggle', $scope.resetPr);
    $scope.resetPr = function(){
      // if($scope.prToggle)
      $scope.params.globalData.PR = [0,0];
    };
    $scope.$watchGroup(['params.globalData.GMDB','params.globalData.Scheme','params.globalData.Atm','params.globalData.Nucl'],function(){
      //if world mean mode, get value
      if(!$scope.prToggle)
        $scope.getWorldMean($scope.params.globalData.Nucl,$scope.params.globalData.Scheme,$scope.params.globalData.Atm,$scope.params.globalData.GMDB);
    });
    $scope.$watch('params.globalData.Nucl',function(){
      $scope.getLocalities();

      $scope.getRegions();
      $scope.resetMarkers();
    });

    $scope.$on("leafletDirectiveGeoJson.click", function(event, args){
      console.log('click on Region ', args);
      f = $scope.fieldStr;
      pr = getMeanForRegion(args.model,f);
      $scope.toggleRegion(args);
    });
    $scope.markers= [];
    $scope.filterSelectedMarkers = function(value,index,array){
      return (value.model.age);
    };
    $scope.filterSelectedRegions = function(value,index,array){
      return value.model.type === "Feature";
    };

    $scope.toggleView = function(view){
      $scope.mapView = view;
      $scope.resetMarkers();
      if(view == 'localities'){
        // $scope.updateMarkers($scope.min,$scope.max);
        leafletData.getMap().then(function(map){
          map.eachLayer(function(l){
            if(l._icon && l.options){
              if(l.options.age)
                angular.element(l._icon).removeClass('hidden');
            }
            if(l.feature){
              console.log(l);
              angular.element(l._container).addClass('hidden');
              // l.setStyle({"fillOpacity":0});
            }
          });
        });
        $scope.markersDisplayed = $scope.markersFiltered.concat($scope.samplesMarkers);
      }
      else{
        if(view == 'regions'){
          $scope.geojson = $scope.regions;
          leafletData.getMap().then(function(map){
            map.eachLayer(function(l){
              if(l.feature)
                // l.setStyle({"fillOpacity":0.7});
              angular.element(l._container).removeClass('hidden');
              if(l._icon  && l.options){
                // // l.options.clickable=false;
                // _.each($scope.markersDisplayed,function(v){
                //   v.clickable =false;
                // });
                if(l.options.age){
                  angular.element(l._icon).addClass('hidden');
                }
              }
            });
          });
        }
      }
    };
    $scope.mapView ='localities';
    function range(items, from, to) {
      var result = [];
      from = from *1000;
      to  = to *1000;
      for (var i = 0; i < items.length; i++) {
        var age = items[i].age;
        if (age >= from && age <= to) {
          result.push(items[i]);
        }
      }
      return result;
    }
    $scope.range = range;
    $scope.updateMarkers = function(min,max){
      // $scope.markersFiltered = $scope.range($scope.markers,$scope.min,$scope.max);
      $scope.markersFiltered = range($scope.markers,min,max);
      $scope.markersDisplayed = $scope.markersFiltered.concat($scope.samplesMarkers);
    };
    $scope.$on("$stateChangeSuccess", $scope.tabChange);    
  });
app.controller('testController', function($scope) {
  // alert("testController");
});



