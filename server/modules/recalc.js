const octavePath =('../Octave/');
const octaveCmd='octave-cli  -W  --exec-path '+octavePath+' --silent --eval ';
const jsonfile = require('jsonfile');
const request = require("request");
const exec = require('child_process').exec;
const _ = require('lodash');
const crepdb = require('./crepdb-api');
const iced = require('./iced-api');
const utils = require('./utils');
const waterfall = require('./waterfall');

//const apiUrl = "http://localhost:55581/";
//const apiUrl = 'http://crep.crpg.cnrs-nancy.fr:443/'
const apiUrl = 'https://crep.otelo.univ-lorraine.fr/'

let samplesConcData = {};
let regionsData = {3:{},10:{}};
// let pushAliquot10ToLocality = utils.pushAliquot10ToLocality;
// let pushAliquot3ToLocality = utils.pushAliquot3ToLocality;
let paramsMatches = utils.paramsMatches;
let webCalObj = utils.webCalObj;
let WaterfallOver = waterfall.WaterfallOver;
let WaterfallOverSamples = waterfall.WaterfallOverSamples;
let WaterfallOverRegions = waterfall.WaterfallOverRegions;


pushAliquot10ToLocality = function(locality,sample){
	if(samplesConcData[sample.sample_name]){
		// console.log(samplesConcData[sample.sample_name]);
		conc = samplesConcData[sample.sample_name];
		// console.log("Aliquot N10 : " , alqt.N10_atoms_g);
		thisObj.Lat.push(sample.lat_DD);
		thisObj.Lon.push(sample.lon_DD);
		thisObj.Alt.push(sample.elv_m);
		thisObj.Thick.push(sample.thick_cm);
		thisObj.Shield.push(sample.shielding);
		thisObj.Dens.push(sample.density);
		thisObj.Eros.push(locality.erosional_relief_cm/locality.site_truet_cor);
		thisObj.NuclCon.push(conc[0]);
		thisObj.NuclErr.push(conc[1]);
		thisObj.NuclNorm.push('07KNSTD');
	}
};
pushAliquot3ToLocality = function(locality,sample,alqt){
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


const localityMean = function(locality,callback,param){
	let field = crepdb.fieldName(param.Scheme,param.Atm,param.GMDB);
	//Define input and output files
	let localityInputObj = webCalObj.fillWithLocality(locality,param);
	let nucl = param.Nucl;
	let scal = param.Scheme;
	let atm = param.Atm;
	let gdb = param.GMDB;
	let prInputFile = octavePath+'data/pr/localities/'+locality.id+'-'+nucl+field+'in';
	let prOutputFile = octavePath+'data/pr/localities/'+locality.id+'-'+nucl+field+'out';
	//Define processing command
	let prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWebPRf('"+prInputFile+"')"+'"';

	//Write input file then compute Production Rate
	jsonfile.writeFile(prInputFile, localityInputObj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			// console.log('Input file for locality mean processing  : ' +prInputFile );
			let childCalc =exec(prCmd, function(err, stdout, stderr){
				if (err){
					console.log(err);
					throw err;
					callback();
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						// console.log('output saved in  ' + prOutputFile);
						let slhl = _.values(obj)[0].SLHLPR;
						crepdb.pushLocalityMean(locality.id,locality.short_name,nucl,scal,atm,gdb,slhl);
						callback();

					});
				}
			});
		}
	}); 
};
let samples; 
const samplesConc = function(callback){
	request({
		uri: apiUrl+"samples",
		method: "GET"
	}, function(error, response, body) {
		if( !error && response.statusCode == 200 ){
			samples=JSON.parse(body);
			WaterfallOver(samples,sampleConcIterator,callback);
		}
		else
			console.log("Failed to Get samples from server.");
	});
}

// Function that loops on samples, and calculate 
// PR for each sample, for @param
const localitiesMean = function(param,callback){
	let nuclStr;
	param.Nucl == 10 ? nuclStr = "10Be" : nuclStr = "3He";
	// Get list of localities
	request({
		uri: apiUrl+"localities"+nuclStr,
		method: "GET"
	}, function(error, response, body) {
		if(!error && response.statusCode ==200){
			let localities=JSON.parse(body);
			WaterfallOver(localities,localitiesIterator,callback,param);
		}
		else
			console.log("Failed to Get Localities from server.");
	});
};

let skipped=0;
function sampleConcIterator(sample,nextSample){
	const calc = function(l,concMatrix){
		if(!concMatrix[0].length){
			nextSample();
			console.log("Skipped sample " , sample.id);
			skipped++;
		}
		else{
			OctaveAliquotsWM(sample.sample_name,concMatrix,function(conc){
				console.log(sample.sample_name, conc );
				samplesConcData[sample.sample_name] = conc;
				nextSample();
			});
		}
	};
	if(sample.aliquots10.length || sample.aliquots3.length ){
		let concMatrix=[[],[]];
		if(sample.aliquots10.length){
			WaterfallOverSamples(sample.aliquots10,function(al,report){
				if(al.N10_atoms_g){
					concMatrix[0].push(utils.normalize10BeConc(al.N10_atoms_g,al.Be10_std));
					concMatrix[1].push(utils.normalize10BeConc(al.delN10_atoms_g,al.Be10_std));//incertitude
				}
				else{
					console.log("Invalid aliquot10 at sample  ", sample.sample_name, sample.id);
				}
				report(concMatrix);
			},calc);
		}
		else{
			WaterfallOverSamples(sample.aliquots3,function(al,report){
				if(al.N3c_atoms_g){
					concMatrix[0].push(al.N3c_atoms_g);
					concMatrix[1].push(al.delN3c_atoms_g);
				}
				else{
					console.log("Invalid aliquot3 at sample  ", sample.sample_name, sample.id);
				}
				report(concMatrix);
			},calc);
		}

		console.log(_.keys(samplesConcData).length + " done, " + skipped+" skipped");
		
		// console.log(concMatrix,sample);
	}
	else{
		nextSample();
		console.log("Skipped sample with no aliquots. Sample Id: ",sample.id);
		skipped++;
	}
	
	// console.log(sample);
}
function localitiesIterator(locality,report,param){
	if(locality.site_truet_cor === null || locality.samples.length < 2 ){
		report();
		if(locality.site_truet_cor === null)
			console.log("Skippped locality " + locality.short_name+". ( age undefined in ICED ) ", locality.site_truet);
		else
			console.log("Skippped locality " + locality.short_name+". ( Only one("+locality.samples.length+") or no sample) ");
	}
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



let execId = 1;
function OctaveWorldWM(prMatrix,nucl, field, callback){
	let obj = {
		"PRval": prMatrix[0],
		"PRerr": prMatrix[1],
		// "NbSig": 10,
		"Filter":0,
		"Wstdval":1
	};
	let prInputFile = octavePath+'data/pr/world/'+nucl+'-'+execId+ 'in';
	let prOutputFile = octavePath+'data/pr/world/'+nucl+'-'+execId+'out';
	let prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWMf('"+prInputFile+"')"+'"';

	jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			// console.log('req stored in file ' +prInputFile );
			let childCalc = exec(prCmd, function(err, stdout, stderr){
				if (err){
					throw err;
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						// console.log('file ' + prOutputFile + ' was read' );
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

function OctaveRegionWM(prMatrix,nucl, field, g, callback,next){
	let obj = {
		"PRval": prMatrix[0],
		"PRerr": prMatrix[1],
		// "NbSig": 2,
		"Filter":1,
		"Wstdval":1
	};
	let prInputFile = octavePath+'data/pr/regions/'+nucl+'-'+_.kebabCase(g.name)+ field+'in';
	let prOutputFile = octavePath+'data/pr/regions/'+nucl+'-'+_.kebabCase(g.name)+field+'out';
	let prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWMf('"+prInputFile+"')"+'"';

	jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			// console.log('req stored in file ' +prInputFile );
			let childCalc = exec(prCmd, function(err, stdout, stderr){
				if (err){
					console.log(obj);
					throw err;
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						// console.log('file ' + prOutputFile + ' was read' );
			            // Sending to res to close the request
			            mean = _.values(obj)[0].WM.toString();
			            // console.log(_.values(obj));
			            //Execute Callback function to save result to Database
			            // console.log(nucl,field,g.name,mean);
			            callback(nucl,field,g,mean);
			            next();
			            // console.log(id,mean);
			        });
				}
			});
		}
	});
	execId++;
}

const saveRegionField = function (nucl,f, g, m ){
	// console.log(nucl,f,g,m);
	if(regionsData[nucl][g.id])
		regionsData[nucl][g.id][f] =m;
	else{
		regionsData[nucl][g.id] = {regional_id:g.id,regional_name:g.name};
		regionsData[nucl][g.id][f] =m;
	}
};

function OctaveAliquotsWM(id,concMatrix,callback){
	let obj = {
		"PRval": concMatrix[0],
		"PRerr": concMatrix[1],
		// "NbSig": 2,
		"Filter":1,
		"Wstdval":0
	};
	let prInputFile = octavePath+'data/conc/'+id+ 'in';
	let prOutputFile = octavePath+'data/conc/'+id+'out';
    let prCmd= 'cd '+octavePath+' && '+ octaveCmd + '"'+"GetWMf('"+prInputFile+"')"+'"';
   // let prCmd= "cd "+octavePath+" && "+ octaveCmd + "'"+'GetWMf("'+prInputFile+'")'+"'";

	jsonfile.writeFile(prInputFile, obj, {spaces: 4}, function(err) {
		if(err)
			console.error(err);
		else{
			//console.log('req stored in file ' +prInputFile );
           // console.log('prcmd:<<',prCmd,'>>')
			let childCalc = exec(prCmd, function(err, stdout, stderr){
				if (err){
					throw err;
				} 
				else{
					jsonfile.readFile(prOutputFile, function(err, obj) {
						// console.log('file ' + prOutputFile + ' was read' );
			            // Sending to res to close the request
			            let conc = _.values(obj)[0].WM.toString();
			            conc = conc.split(",");
			            let val = parseFloat(conc[0]);
			            let uns = parseFloat(conc[1]);
			            callback([val,uns]);
			        });
				}
			});
		}
	});

}


function worldMeanBe(){
	const nucl = 10;
	//For each field, so each params match
	_.each(crepdb.fields, function (field){
	 	//fetch mean value of each locality
	 	//where value not null
	 	new crepdb.siteMeanBe()
	 	.fetchAll()
	 	.then(function(model){
	 		let input = utils.prToMatrix(utils.splitAndParseFloat(model.pluck(field)));
	 		OctaveWorldWM(input,nucl,field,crepdb.pushWorldMean);
	 	});
	 });
}

function worldMeanHe(){
	const nucl = 3;
	//For each field, so each params match
	_.each(crepdb.fields, function (field){
	 	//fetch mean value of each locality
	 	//where value not null
	 	new crepdb.siteMeanHe()
	 	.fetchAll()
	 	.then(function(model){
	 		let input = utils.prToMatrix(utils.splitAndParseFloat(model.pluck(field)));
	 		OctaveWorldWM(input,nucl,field,crepdb.pushWorldMean);
	 	});
	 });
}


console.time("PR-calculation");

function fillCrepRegions(){
	new iced.Locality.fetchAll()
	.then(function(model){
		let regions;
		console.log(model.pluck(region).toJSON());
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


const getRegionsGroups =
function getRegionsGroups(callback){
	new crepdb.regionsGroup()
	.fetchAll({withRelated: "regions"})
	.then(function(m){
		callback(m.toJSON());
	})
};


function filterLocalities10Be(l){
	let count = 0;
	_.each(l.samples, function(s){
		count = count + s.aliquots10.length;
	});
	return count;
}
function filterLocalities3He(l){
	let count = 0;
	_.each(l.samples, function(s){
		count = count + s.aliquots3.length;
	});
	return count;
}

// return array of localities IDs for @r region
function regionIterator(r,nucl,report){
	let related = ["samples"];
	let localities;
	related.push("samples.aliquots"+nucl);
	const icedRegion = r.name;
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
		let siteMeans= m.toJSON();
		getRegionsGroups(function(groups){
			//For Each Region Group
			WaterfallOver(groups, function(g, nextGroup){
				//For Each Iced Regions that belongs to Region Group
				//We fetch Ids of all the localities with matching region name
				//And with 10Be Production Rates
				WaterfallOverRegions(g.regions,10,regionIterator,function(l){
					if(l.length){
						let groupMeans = _.filter(siteMeans,function(means){
							if((_.indexOf(l,means.site_id) + 1))
							return true;
						});
						WaterfallOver(crepdb.fields,function(f,nextField){
							let meansFiltered = _.map(groupMeans,function(v){
								return v[f];
							});
							if(meansFiltered.length){
								let input = utils.prToMatrix(utils.splitAndParseFloat(meansFiltered));
								OctaveRegionWM(input,10,f,g,saveRegionField,nextField);

							}
							else
								nextField();
						},function(l){
							nextGroup();
						});
					}
					else
						nextGroup();
				});
			}, function(l){
				console.log("FINISHED 10Be regions", l);
				console.log(regionsData);
				saveRegionsBe();
				callback();
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
		let siteMeans= m.toJSON();
		
		getRegionsGroups(function(groups){
			//For Each Region Group

			WaterfallOver(groups, function(g, nextGroup){
				//For Each Iced Regions that belongs to Region Group
				//We fetch Ids of all the localities with matching region name
				//And with 3He Production Rates
				WaterfallOverRegions(g.regions,3,regionIterator,function(l){
					if(l.length){
						let groupMeans = _.filter(siteMeans,function(means){
							if((_.indexOf(l,means.site_id) + 1))
							return true;
						});
						WaterfallOver(crepdb.fields,function(f,nextField){
							let meansFiltered = _.map(groupMeans,function(v){
								return v[f];
							});
							if(meansFiltered.length){
								let input = utils.prToMatrix(utils.splitAndParseFloat(meansFiltered));
								OctaveRegionWM(input,3,f,g,saveRegionField,nextField);

							}
							else
								nextField();
						},function(l){
							nextGroup();
						});
					}
					else
						nextGroup();
				});
			}, function(l){
				console.log("FINISHED 3He regions. Start saving to DB");
				callback();
				console.log(regionsData[3]);
				saveRegionsHe();
			});
		});
	})
	.catch(function(err){
		console.log(err);
		console.log("Regional Mean : Failed to get Sites Data from Crep Database");
	});

}
 function saveRegionsHe(){
 	let regions = regionsData[3];
 	regions = _.values(regions);
 	console.log(regions);
 	WaterfallOver(regions,function(r, next){
 		crepdb.pushRegionalMean(3,r,next);
 	}, function(l){
 		console.log("Saved "+ l + " regions for nucl 3He" );
 	});
 };
  function saveRegionsBe(){
 	let regions = regionsData[10];
 	regions = _.values(regions);
 	console.log(regions);
 	WaterfallOver(regions,function(r, next){
 		crepdb.pushRegionalMean(10,r,next);
 	}, function(l){
 		console.log("Saved "+ l + " regions for nucl 10Be" );
 	});
 };


// worldMeanBe();
// worldMeanHe();
// regionsMeanBe();
// regionsMeanHe();
// samplesMeanAllParams();
// localitiesMeanAllParams();

function worldMean(){
	worldMeanHe();
	worldMeanBe();
}
function localitiesCallback(){
	regionsMeanBe( function(){
		regionsMeanHe(worldMean);
	});
	// regionsMeanHe(worldMeanHe);
}
function recalc(){
	localitiesMeanAllParamsCallback(localitiesCallback);
};

// regionsMeanHe();
// localitiesCallback();

// samplesConc(recalc);
exports.samplesConc = samplesConc;
exports.recalc =recalc;

exports.getRegionsGroups = getRegionsGroups;
exports.getLocalitiesIdForRegionGroup = getLocalitiesIdForRegionGroup;
exports.pushAliquot3ToLocality = pushAliquot3ToLocality;
exports.pushAliquot10ToLocality = pushAliquot3ToLocality;
//exports.pushAliquot10ToLocality = pushAliquot10ToLocality;
// getRegionsGroups(function(groups){
// 	i=3;
// 	getLocalitiesIdForRegionGroup(groups[1],3, console.log);
// });


//crepdb.pushRegions_grp(3,"High Tropical Andes")
//crepdb.pushRegions_grp(9,"Europe")
//crepdb.pushRegions_grp(7,"Western USA")
// crepdb.pushRegions_grp(10,"Arctic - NE")
// crepdb.pushRegions_grp(1,"Iceland  North Atlantic")
// crepdb.pushRegions_grp(2,"Tropical Atlantic  North Africa")
// crepdb.pushRegions_grp(4,"Patagonia")
//crepdb.pushRegions_grp(5,"Hawaii  Central Pacific")
//crepdb.pushRegions_grp(8,"Mediterranean")
// crepdb.pushRegions_grp(6,"New Zealand  SW Pacific")

//crepdb.pushRegion(208,1,"Iceland")
//crepdb.pushRegion(203,2,"Canary Islands")
//crepdb.pushRegion(206,2,"Fogo Island, Cabo Verde")
//crepdb.pushRegion(207,5,"Hawaii, USA")
//crepdb.pushRegion(199,3,"Altiplano, Tropical Andes, Bolivia")
//crepdb.pushRegion(204,3,"Cordillera Blanca, Tropical Andes, Peru ")
//crepdb.pushRegion(219,3,"Quelccaya Ice Cap, Tropical Andes, Peru ")
//crepdb.pushRegion(300,3,"Altiplano, Tropical Andes, Chile")
//crepdb.pushRegion(210,4,"Lago Argentino, Patagonia, Argentina")
//crepdb.pushRegion(211,4,"Lago Buenos Aires, Patagonia, Argentina")
//crepdb.pushRegion(215,6,"New Zealand")
//crepdb.pushRegion(200,7,"Arizona, USA")
//crepdb.pushRegion(202,7,"California, USA")
//crepdb.pushRegion(209,7,"Idaho, USA")
//crepdb.pushRegion(217,7,"Oregon, USA")
//crepdb.pushRegion(223,7,"Utah, USA")
//crepdb.pushRegion(225,7,"Wyoming, USA")
//crepdb.pushRegion(205,8,"Etna volcano, Italy")
//crepdb.pushRegion(216,9,"Norway")
//crepdb.pushRegion(220,9,"Scotland")
//crepdb.pushRegion(221,9,"Sweden")
//crepdb.pushRegion(222,9,"Switzerland")
//crepdb.pushRegion(201,10,"Baffin Island")
//crepdb.pushRegion(212,10,"Massachusetts, USA")
//crepdb.pushRegion(213,10,"New Hampshire, USA")
//crepdb.pushRegion(214,10,"New York, USA")
//crepdb.pushRegion(224,10,"West Greenland")
//crepdb.pushRegion(219,3,"Quelccaya Ice Cap, Tropical Andes, Peru ")




//fillCrepRegions()
