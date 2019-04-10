var octavePath =('../Octave/');
var octaveCmd='octave  --no-window-system --exec-path '+octavePath+' --silent --eval ';
var jsonfile = require('jsonfile');
var request = require("request");
var exec = require('child_process').exec;
var _ = require('lodash');

var crepdb = require('./crepdb-api');

var iced = require('./iced-api');

//var apiUrl = "http://localhost:55581/"
var apiUrl="https://crep.otelo.univ-lorraine.fr"
var pushAliquot10ToSample = function(sample,alqt){
	if(!Number.isNaN(parseInt(alqt.N10_atoms_g))){
			// console.log("Aliquot N10 : " , alqt.N10_atoms_g);
			thisObj.Lat.push(sample.lat_DD);
			thisObj.Lon.push(sample.lon_DD);
			thisObj.Alt.push(sample.elv_m);
			thisObj.Thick.push(sample.thick_cm);
			thisObj.Shield.push(sample.shielding);
			thisObj.Dens.push(sample.density);
			thisObj.Eros.push(sample.parentSite.erosional_relief_cm/sample.parentSite.site_truet_cor);
			thisObj.NuclCon.push(alqt.N10_atoms_g);
			thisObj.NuclErr.push(alqt.delN10_atoms_g);
			thisObj.NuclNorm.push(alqt.Be10_std);
		}
	};
	var pushAliquot3ToSample = function(sample,alqt){
		// //R-Factor Correction
		// rFactor = parseFloat(alqt.R_factor);
		// if(!Number.isNaN(rFactor)){
		// 	N3cor = alqt.N3c_atoms_g / rFactor;
		// 	console.log(" corrected! ", N3cor ,rFactor);
		// }
		// else{
		// 	N3cor = alqt.N3c_atoms_g;
		// 	console.log(" not corrected! ", N3cor );
		// }
		if(!Number.isNaN(parseInt(alqt.N3c_atoms_g))){
			thisObj.Lon.push(sample.lon_DD);
			thisObj.Lat.push(sample.lat_DD);
			thisObj.Alt.push(sample.elv_m);
			thisObj.Thick.push(sample.thick_cm);
			thisObj.NuclCon.push(alqt.N3c_atoms_g);
			thisObj.Shield.push(sample.shielding);
			thisObj.Dens.push(sample.density);
			thisObj.Eros.push(sample.parentSite.erosional_relief_cm/sample.parentSite.site_truet_cor);
			thisObj.NuclErr.push(alqt.delN3c_atoms_g);
		}
	};
	var pushAliquot10ToLocality = function(locality,sample,alqt){
		if(!Number.isNaN(parseInt(alqt.N10_atoms_g))){
			// console.log("Aliquot N10 : " , alqt.N10_atoms_g);
			thisObj.Lat.push(sample.lat_DD);
			thisObj.Lon.push(sample.lon_DD);
			thisObj.Alt.push(sample.elv_m);
			thisObj.Thick.push(sample.thick_cm);
			thisObj.Shield.push(sample.shielding);
			thisObj.Dens.push(sample.density);
			thisObj.Eros.push(locality.erosional_relief_cm/locality.site_truet_cor);
			thisObj.NuclCon.push(alqt.N10_atoms_g);
			thisObj.NuclErr.push(alqt.delN10_atoms_g);
			thisObj.NuclNorm.push(alqt.Be10_std);
		}
	};
	var pushAliquot3ToLocality = function(locality,sample,alqt){
		// //R-Factor Correction
		// rFactor = parseFloat(alqt.R_factor);
		// if(!Number.isNaN(rFactor)){
		// 	N3cor = alqt.N3c_atoms_g / rFactor;
		// 	console.log(" corrected! ", N3cor );
		// }
		// else{
		// 	N3cor = alqt.N3c_atoms_g;
		// 	console.log(" not corrected! ", N3cor, rFactor );
		// }
		if(!Number.isNaN(parseInt(alqt.N3c_atoms_g))){
			// console.log("Aliquot N10 : " , alqt.N10_atoms_g);
			thisObj.Lat.push(sample.lat_DD);
			thisObj.Lon.push(sample.lon_DD);
			thisObj.Alt.push(sample.elv_m);
			thisObj.Thick.push(sample.thick_cm);
			thisObj.Shield.push(sample.shielding);
			thisObj.Dens.push(sample.density);
			thisObj.NuclCon.push(alqt.N3c_atoms_g);
			thisObj.Eros.push(locality.erosional_relief_cm/locality.site_truet_cor);
			thisObj.NuclErr.push(alqt.delN3c_atoms_g);
		}
	};



	var webCalObj = {"Name":"","Nucl":10,"Scheme":0,"Atm":0,"GMDB":1,"Age":[0,0],"Lat":[],
	"Lon":[],"Alt":[],"Thick":[],"Shield":[],"Dens":[],"Eros":[],"NuclCon":[],"NuclErr":[],
	"NuclNorm":[],"Notes":-9999};


	var paramsMatches = [
	{"Nucl":10,"Scheme":2,"Atm":0,"GMDB":3},
	{"Nucl":10,"Scheme":2,"Atm":0,"GMDB":1},
	{"Nucl":10,"Scheme":2,"Atm":0,"GMDB":2},
	{"Nucl":10,"Scheme":2,"Atm":1,"GMDB":3},
	{"Nucl":10,"Scheme":2,"Atm":1,"GMDB":1},
	{"Nucl":10,"Scheme":2,"Atm":1,"GMDB":2},
	{"Nucl":10,"Scheme":1,"Atm":0,"GMDB":3},
	{"Nucl":10,"Scheme":1,"Atm":0,"GMDB":1},
	{"Nucl":10,"Scheme":1,"Atm":0,"GMDB":2},
	{"Nucl":10,"Scheme":1,"Atm":1,"GMDB":3},
	{"Nucl":10,"Scheme":1,"Atm":1,"GMDB":1},
	{"Nucl":10,"Scheme":1,"Atm":1,"GMDB":2},

	{"Nucl":3,"Scheme":2,"Atm":0,"GMDB":3},
	{"Nucl":3,"Scheme":2,"Atm":0,"GMDB":1},
	{"Nucl":3,"Scheme":2,"Atm":0,"GMDB":2},
	{"Nucl":3,"Scheme":2,"Atm":1,"GMDB":3},
	{"Nucl":3,"Scheme":2,"Atm":1,"GMDB":1},
	{"Nucl":3,"Scheme":2,"Atm":1,"GMDB":2},
	{"Nucl":3,"Scheme":1,"Atm":0,"GMDB":3},
	{"Nucl":3,"Scheme":1,"Atm":0,"GMDB":1},
	{"Nucl":3,"Scheme":1,"Atm":0,"GMDB":2},
	{"Nucl":3,"Scheme":1,"Atm":1,"GMDB":3},
	{"Nucl":3,"Scheme":1,"Atm":1,"GMDB":1},
	{"Nucl":3,"Scheme":1,"Atm":1,"GMDB":2}
	];
//Fill webCalObj with data from a sample
webCalObj.fillWithSample = function(sample,param){
	thisObj = _.cloneDeep(this);
	thisObj.Scheme = param.Scheme;
	thisObj.Atm = param.Atm;
	thisObj.GMDB = param.GMDB;
	thisObj.Name = sample.sample_name;
	thisObj.Age = [sample.parentSite.site_truet_cor,sample.parentSite.site_del_truet];

	//Set Nucleide
	//for each aliquot, fill all matrix with data
	if(sample.aliquots10){
		thisObj.Nucl = 10;
		_.each(sample.aliquots10, function(val,key){
			pushAliquot10ToSample(sample,val);
		});
	}
	else{
		thisObj.Nucl = 3;
		_.each(sample.aliquots3, function(val,key){
			pushAliquot3ToSample(sample,val);
		});
	}
	return(_.omit(_.cloneDeep(thisObj), _.isFunction));
};

var sampleMean = function(sample,callback,param){
	field = crepdb.fieldName(param.Scheme,param.Atm,param.GMDB);
	//Define input and output files
	sampleInputObj = webCalObj.fillWithSample(sample,param);
	nucl = sampleInputObj.Nucl;
	scal = sampleInputObj.Scheme;
	atm = sampleInputObj.Atm;
	gdb = sampleInputObj.GMDB;
	prInputFile = octavePath+'data/pr/samples/'+sample.id+'-'+nucl+field+'in';
	prOutputFile = octavePath+'data/pr/samples/'+sample.id+'-'+nucl+field+'out';
	//Define processing command
	prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWebPRf('"+prInputFile+"')"+'"';
	// console.log(sample);
	// console.log(sampleInputObj);
	jsonfile.writeFile(prInputFile, sampleInputObj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			console.log('Input file for sample mean processing  : ' +prInputFile );
			childCalc =exec(prCmd, function(err, stdout, stderr){
				if (err){
					throw err;
					callback();
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						console.log('output saved in  ' + prOutputFile);
						slhl = _.values(obj)[0].SLHLPR;
						crepdb.pushSampleMean(sample.id,sample.sample_name,nucl,scal,atm,gdb,slhl);
						callback();

					});
				}
			});
		}
	});
};

webCalObj.fillWithLocality = function(locality,param){
	thisObj = _.cloneDeep(this);
	thisObj.Scheme = param.Scheme;
	thisObj.Atm = param.Atm;
	thisObj.GMDB = param.GMDB;
	thisObj.Name = locality.short_name;
	thisObj.Age = [locality.site_truet_cor,locality.site_del_truet];
	thisObj.Nucl = param.Nucl;

	_.each(locality.samples, function(sample){
		if(thisObj.Nucl == 10){
			_.each(sample.aliquots10, function(val,key){
				pushAliquot10ToLocality(locality,sample,val);
			});
		}
		else{
			_.each(sample.aliquots3, function(val,key){
				pushAliquot3ToLocality(locality,sample,val);
			});
		}
	});
	return(_.omit(_.cloneDeep(thisObj), _.isFunction));
};


var localityMean = function(locality,callback,param){
	field = crepdb.fieldName(param.Scheme,param.Atm,param.GMDB);
	//Define input and output files
	localityInputObj = webCalObj.fillWithLocality(locality,param);
	nucl = param.Nucl;
	scal = param.Scheme;
	atm = param.Atm;
	gdb = param.GMDB;
	prInputFile = octavePath+'data/pr/localities/'+locality.id+'-'+nucl+field+'in';
	prOutputFile = octavePath+'data/pr/localities/'+locality.id+'-'+nucl+field+'out';
	//Define processing command
	prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWebPRf('"+prInputFile+"')"+'"';
	jsonfile.writeFile(prInputFile, localityInputObj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			console.log('Input file for locality mean processing  : ' +prInputFile );
			childCalc =exec(prCmd, function(err, stdout, stderr){
				if (err){
					throw err;
					callback();
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						console.log('output saved in  ' + prOutputFile);
						slhl = _.values(obj)[0].SLHLPR;
						crepdb.pushLocalityMean(locality.id,locality.short_name,nucl,scal,atm,gdb,slhl);
						callback();

					});
				}
			});
		}
	}); 
};
// Function that loops on samples, and calculate 
// PR for each sample, for @scale, @gdmb, and @Atm
var samplesMean = function(param,callback){
	if(param.Nucl == 10 )
		nuclStr = "Be";
	else
		nuclStr = "He";
	request({
		uri: apiUrl+"samples"+nuclStr,
		method: "GET"
	}, function(error, response, body) {
		if(!error && response.statusCode ==200){
			samples=JSON.parse(body);
			WaterfallOver(samples,sampleIterator,callback,param);
		}
		else
			console.log("Failed to Get samples from server.");
	});
};
// Function that loops on samples, and calculate 
// PR for each sample, for @param
var localitiesMean = function(param,callback){
	if(param.Nucl == 10 )
		nuclStr = "10Be";
	else
		nuclStr = "3He";
	// Get list of localities
	request({
		uri: apiUrl+"localities"+nuclStr,
		method: "GET"
	}, function(error, response, body) {
		if(!error && response.statusCode ==200){
			localities=JSON.parse(body);
			WaterfallOver(localities,localitiesIterator,callback,param);
		}
		else
			console.log("Failed to Get Localities from server.");
	});
};


function WaterfallOver(list, iterator, callback, param) {

    var nextItemIndex = 0;  //keep track of the index of the next item to be processed
    
    function report() {

    	nextItemIndex++;

        // if nextItemIndex equals the number of items in list, then we're done
        if(nextItemIndex === list.length)
        	callback(list.length);
        else{
            // otherwise, call the iterator on the next item
            if(!param)
            	iterator(list[nextItemIndex], report);
            else
            	iterator(list[nextItemIndex], report,param);
        }
        
    }
    
    // instead of starting all the iterations, we only start the 1st one
    if(!param)
    	iterator(list[0], report);
    else
    	iterator(list[0], report,param);
}
function WaterfallOverRegions(list,nucl, iterator, callback) {

    var nextItemIndex = 0;  //keep track of the index of the next item to be processed
    var resIds = [];
    function report(ids) {
    	resIds =resIds.concat(ids);
    	nextItemIndex++;

        // if nextItemIndex equals the number of items in list, then we're done
        if(nextItemIndex === list.length)
        	callback(resIds);
        else{
            // otherwise, call the iterator on the next item
            iterator(list[nextItemIndex],nucl, report);

        }
        
    }
    // instead of starting all the iterations, we only start the 1st one
    iterator(list[0], nucl,report);
}
function sampleIterator(sample,report,param){
	new iced.Locality({'short_name':sample.site})
	.fetch()
	.then(function(model){
		if(model){
			sample.parentSite = model.toJSON();
			if(sample.parentSite.site_truet_cor === null)
				report();
			else
				sampleMean(sample,report,param);
		}
		else
			sample.parentSite = {};
	});
	// console.log(sample);
}
function localitiesIterator(locality,report,param){
	if(locality.site_truet_cor === null || locality.samples.length < 2 )
		report();
	else{
		localityMean(locality,report,param);
	}

}
function sampleCallback(nSamples){
	console.log("Done for "+ nSamples + " Samples.");
}

function paramCallback(nParams){
	console.log("Done for "+ nParams + " Params.");
	console.timeEnd("PR-calculation");
}
function paramIterator(param,report){
	// report();
	samplesMean(param,report);
}
function paramLocalitiesIterator(param,report){
	localitiesMean(param,report);
}

function endProcess(){
	crepdb.destroy();
	process.exit();
}

function samplesMeanAllParams(){
	WaterfallOver(paramsMatches,paramIterator,paramCallback);
}
function samplesMeanAllParamsCallback(callback){
	WaterfallOver(paramsMatches,paramIterator,callback);
}

function localitiesMeanAllParams(){
	WaterfallOver(paramsMatches,paramLocalitiesIterator,paramCallback);
}
function localitiesMeanAllParamsCallback(callback){
	WaterfallOver(paramsMatches,paramLocalitiesIterator,callback);
}

function prToMatrix(prArray){
	//transfom input array to 2 col matrix
	prInput =[];
	uncertInput = [];
	_.each(prArray, function(prTab){
		prInput.push([prTab[0]]);
		uncertInput.push([prTab[1]]);
	});
	return [prInput,uncertInput];
}

var execId = 1;
function OctaveWorldWM(prMatrix,nucl, field, callback){
	obj = {
		"PRval": prMatrix[0],
		"PRerr": prMatrix[1],
		// "NbSig": 10,
		"Filter":0,
		"Wstdval":1
	}
	var prInputFile = octavePath+'data/pr/world/'+nucl+'-'+execId+ 'in';
	var prOutputFile = octavePath+'data/pr/world/'+nucl+'-'+execId+'out';
	var prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWMf('"+prInputFile+"')"+'"';

	jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			console.log('req stored in file ' +prInputFile );
			var childCalc = exec(prCmd, function(err, stdout, stderr){
				if (err){
					throw err;
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						console.log('file ' + prOutputFile + ' was read' );
			            // Sending to res to close the request
			            mean = _.values(obj)[0].WM.toString();
			            //Execute Callback function to save result to Database
			            callback(nucl,field,mean);
			        });
				}
			});
		}
	});
	execId++;
}

function OctaveRegionWM(prMatrix,nucl, field, g, callback){
	obj = {
		"PRval": prMatrix[0],
		"PRerr": prMatrix[1],
		// "NbSig": 2,
		"Filter":1,
		"Wstdval":1
	}
	var prInputFile = octavePath+'data/pr/mean/'+nucl+'-'+execId+ 'in';
	var prOutputFile = octavePath+'data/pr/mean/'+nucl+'-'+execId+'out';
	var prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWMf('"+prInputFile+"')"+'"';

	jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			console.log('req stored in file ' +prInputFile );
			var childCalc = exec(prCmd, function(err, stdout, stderr){
				if (err){
					throw err;
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						console.log('file ' + prOutputFile + ' was read' );
			            // Sending to res to close the request
			            mean = _.values(obj)[0].WM.toString();
			            //Execute Callback function to save result to Database
			            callback(nucl,field,g,mean);
			            // console.log(id,mean);
			        });
				}
			});
		}
	});
	execId++;
}
function splitAndParseFloat(inputs){
	res = [];
	_.each(inputs, function(i){
		pr = i.split(",");
		slhl = parseFloat(pr[0]);
		uns = parseFloat(pr[1]);
 		// console.log(slhl,uns);
 		res.push([slhl,uns]);
 	});
	return res;
}


function worldMeanBe(){
	nucl = 10;
	//For each field, so each params match
	_.each(crepdb.fields, function (field){
	 	//fetch mean value of each locality
	 	//where value not null
	 	new crepdb.siteMeanBe()
	 	.fetchAll()
	 	.then(function(model){
	 		input = prToMatrix(splitAndParseFloat(model.pluck(field)));
	 		OctaveWorldWM(input,nucl,field,crepdb.pushWorldMean);
	 	});
	 });
}

function worldMeanHe(){
	nucl = 3;
	//For each field, so each params match
	_.each(crepdb.fields, function (field){
	 	//fetch mean value of each locality
	 	//where value not null
	 	new crepdb.siteMeanHe()
	 	.fetchAll()
	 	.then(function(model){
	 		console.log(model.pluck(field));
	 		input = prToMatrix(splitAndParseFloat(model.pluck(field)));
	 		OctaveWorldWM(input,nucl,field,crepdb.pushWorldMean);
	 	});
	 });
}


console.time("PR-calculation");

function fillCrepRegions(){
	new iced.Locality.fetchAll()
	.then(function(model){
		// console.log(model.pluck(region).toJSON());
		regions = model.pluck("region");
		regions = _.uniq(regions);
		regions = _.sortBy(regions);
		_.each(regions, function(r, key){
			new crepdb.Region({"name":r})
			.save()
			.then(function(){
				console.log(r, ' saved');
			})
			.catch(function(err){
				console.log(err);
			});
		});
	});
}



function getRegionsGroups(callback){
	new crepdb.regionsGroup()
	.fetchAll({withRelated: "regions"})
	.then(function(m){
		callback(m.toJSON());
	})
};


function filterLocalities10Be(l){
	count = 0;
	_.each(l.samples, function(s){
		count = count + s.aliquots10.length;
	});
	return count;
}
function filterLocalities3He(l){
	count = 0;
	_.each(l.samples, function(s){
		count = count + s.aliquots3.length;
	});
	return count;
}


function regionIterator(r,nucl,report){
	related = ["samples"];
	related.push("samples.aliquots"+nucl);
	icedRegion = r.name;
	new iced.Locality()
	.where('region',icedRegion)
	.fetchAll({
		withRelated: related
	})
	.then(function(model){
		//Filter to exclude localities with no aliquots for nucl
		//And with only 1 sample
		if(nucl == 10){
			localities =_.filter(model.toJSON(), filterLocalities10Be);
			localities =_.filter(localities,function(l){
				return l.samples.length -1;
			});
		}
		if(nucl == 3){
			localities =_.filter(model.toJSON(), filterLocalities3He);
			localities =_.filter(localities,function(l){
				return l.samples.length -1;
			});
		}
		localitiesIds = _.map(localities,function(l){
			return l.id;
		});
		report(localitiesIds);
	});
}
function getLocalitiesIdForRegionGroup(regionGroup,nucl,callback){
	WaterfallOverRegions(regionGroup.regions,nucl,regionIterator,callback);
}
function regionsMeanBe(callback){
	//Get 10Be Localities Means
	new crepdb.siteMeanBe()
	.fetchAll()
	.then(function(m){
		siteMeans= m.toJSON();
		getRegionsGroups(function(groups){
			//For Each Region Group
			_.each(groups,function(g){
				//For Each Iced Regions that belongs to Region Group
				//We fetch Ids of all the localities with matching region name
				//And with 10Be Aliquots
				WaterfallOverRegions(g.regions,10,regionIterator,function(l){
					if(l.length){
						groupMeans = _.filter(siteMeans,function(means){

							if((_.indexOf(l,means.site_id) + 1))
								// console.log(means.site_id);
								return true;
						});
						WaterfallOver(crepdb.fields,function(f,report){
								meansFiltered = _.map(groupMeans,function(v){
									return v[f];
								});
								if(meansFiltered.length){
									input = prToMatrix(splitAndParseFloat(meansFiltered));
			 						OctaveRegionWM(input,10,f,g,crepdb.pushRegionalMean);

								}
								report();
						},callback);
					}
				});
			});

		});
	})
	.catch(function(err){
		console.log(err);
		console.log("Regional Mean : Failed to get Sites Data from Crep Database");
	});

}

function regionsMeanHe(callback){
	//Get 3He Localities Means
	new crepdb.siteMeanHe()
	.fetchAll()
	.then(function(m){
		siteMeans= m.toJSON();
		
		getRegionsGroups(function(groups){
			//For Each Region Group
			_.each(groups,function(g){
				//For Each Iced Regions that belongs to Region Group
				//We fetch Ids of all the localities with matching region name
				//And with 3He Aliquots
				WaterfallOverRegions(g.regions,3,regionIterator,function(l){
					if(l.length){
						groupMeans = _.filter(siteMeans,function(means){

							if((_.indexOf(l,means.site_id) + 1))
								// console.log(means.site_id);
								return true;
						});
						WaterfallOver(crepdb.fields,function(f,report){
								meansFiltered = _.map(groupMeans,function(v){
									return v[f];
								});
								if(meansFiltered.length){
									input = prToMatrix(splitAndParseFloat(meansFiltered));
			 						OctaveRegionWM(input,3,f,g,crepdb.pushRegionalMean);

								}
								report();
						},callback);
					}
				});
			});

		});
	})
	.catch(function(err){
		console.log(err);
		console.log("Regional Mean : Failed to get Sites Data from Crep Database");
	});

}



// worldMeanBe();
// worldMeanHe();
// regionsMeanBe();
// regionsMeanHe();
// samplesMeanAllParams();
// localitiesMeanAllParams();

function localitiesCallback(){
	regionsMeanBe(console.log);
	regionsMeanHe(console.log);
	// regionsMeanHe(worldMeanHe);
	worldMeanHe();
	worldMeanBe();
}
function recalc(){
	localitiesMeanAllParamsCallback(localitiesCallback);
};

function end(id){
	console.log(id);
}



// recalc();
localitiesCallback();

