const _ = require('lodash');
// const recalc = require('./recalc');
exports.splitAndParseFloat = function(inputs){
	res = [];
	_.each(inputs, function(i){
		pr = i.split(",");
		slhl = parseFloat(pr[0]);
		uns = parseFloat(pr[1]);
 		// console.log(slhl,uns);
 		res.push([slhl,uns]);
 	});
	return res;
};

// Normalize Conc from std to 07KNSTD
exports.normalize10BeConc = function(conc,inputStd){
	STD = ['07KNSTD', 'KNSTD', 'NIST_Certified', 'NIST_30000', 'NIST_30200', 'NIST30_300', 'NIST_30600', 'NIST_27900', 'BEST433', 'S555', 'S2007', 'BEST433N', 'S555N', 'S2007N', 'LLNL31000', 'LLNL10000', 'LLNL3000', 'LLNL1000', 'LLNL300'];
	facteur = [1, 0.9042, 1.0425, 0.9313, 0.9251, 0.9221, 0.9130, 1, 0.9124, 0.9124, 0.9124, 1, 1, 1, 0.8761, 0.9042, 0.8644, 0.9313, 0.8562];
	stdIndex = STD.indexOf(inputStd);
    // console.log(stdIndex);
    if(stdIndex >= 0)
    	return conc * facteur[stdIndex];
    else
    	return -1;
};

exports.prToMatrix= function(prArray){
	//transfom input array to 2 col matrix
	prInput =[];
	uncertInput = [];
	_.each(prArray, function(prTab){
		prInput.push([prTab[0]]);
		uncertInput.push([prTab[1]]);
	});
	return [prInput,uncertInput];
};

exports.paramsMatches = [
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


	var webCalObj = {"Name":"","Nucl":10,"Scheme":0,"Atm":0,"GMDB":1,"Age":[0,0],"Lat":[],
	"Lon":[],"Alt":[],"Thick":[],"Shield":[],"Dens":[],"Eros":[],"NuclCon":[],"NuclErr":[],
	"NuclNorm":[],"Notes":-9999};

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
				pushAliquot10ToLocality(locality,sample,sample.aliquots10[0]);
			}
			else{
				pushAliquot3ToLocality(locality,sample,sample.aliquots3[0]);
			}
		});
		return(_.omit(_.cloneDeep(thisObj), _.isFunction));
	};
	exports.webCalObj = webCalObj;
