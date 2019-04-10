//Require database instance for ICED Database
var iced = require('../modules/iced-api');
//Require database instance for CREP Database
var CREP = require('../modules/crepdb-conf').bookshelf;
var knex = require('../modules/crepdb-conf').knex;
var _ = require('lodash');

//Export knex instance
// To use destroy() 
exports.destroy = function(){
	knex.destroy(function(){
		console.log("DB instance destroyed");
	});
};
exports.knex = knex;

// *** New objects extending built int bookshelf Model CREP ***
//Models for Production Rate Mean Tables
var sampleMeanBe = CREP.Model.extend({
	tableName: 'Be_sample_mean',
	idAttribute: 'sample_id'
});
var sampleMeanHe = CREP.Model.extend({
	tableName: 'He_sample_mean',
	idAttribute: 'sample_id'
});

var siteMeanBe = CREP.Model.extend({
	tableName: 'Be_site_mean',
	idAttribute: 'site_id'
});
exports.siteMeanBe = siteMeanBe;
var siteMeanHe = CREP.Model.extend({
	tableName: 'He_site_mean',
	idAttribute: 'site_id'
});
exports.siteMeanHe = siteMeanHe;

var regionalMeanBe = CREP.Model.extend({
	tableName: 'Be_regional_mean',
	idAttribute: 'regional_id'
});
var regionalMeanHe = CREP.Model.extend({
	tableName: 'He_regional_mean',
	idAttribute: 'regional_id'
});

var worldMeanBe = CREP.Model.extend({
	tableName: 'Be_world_mean',
	idAttribute: 'id'
});
var worldMeanHe = CREP.Model.extend({
	tableName: 'He_world_mean'
});

//Models for Crep Regions <=> Ice-D regions Matches

//regionGroup = CREP macro regions
var regionsGroup = CREP.Model.extend({
	tableName:'regions_grp',
	idAttribute:'id',
	regions: function(){
		return this.hasMany(Region,'group_id');
	}
});
exports.regionsGroup = regionsGroup;
//Ice-D regions fields on localities
var Region = CREP.Model.extend({
	tableName:'regions',
	idAttribute:'id',
	group: function(){
		return this.belongsTo(regionGroup,'name');
	}
});
exports.Region = Region;


exports.getMarkers3He = function(req,res){
	var markers = [];
	localitiesMeans =[];
	new siteMeanHe()
	.fetchAll()
	.then(function(meanModel){
		localitiesMeans= meanModel.toJSON();
		new iced.Locality()
		.fetchAll({
			withRelated: ["samples","samples.aliquots3"]
		})
		.then(function(model){
			//Filter to exclude localities with no 10Be aliquots
			localities = _.filter(model.toJSON(), function(l){
				count = 0;
				_.each(l.samples, function(s){
					count = count + s.aliquots3.length;
				});
				return count;
			});
			//Exclude localities with only 1 sample
			localities = _.filter(localities,function(l){
				return (l.samples.length > 1 );
			});
			_.each(localities,function(key,val){
				if(key.samples.length && Number.isInteger(key.site_truet_cor)){
					m = {id:key.id,name: key.site, lng:key.samples[0].lon_DD, lat:key.samples[0].lat_DD,
						age: key.site_truet_cor, ageUns: key.site_del_truet, alt:key.samples[0].elv_m,
						message:'<strong>'+key.site +' </strong><br>' +'Age: '+key.site_truet_cor/1000+' &plusmn; '+ key.site_del_truet/1000+' ka</br>'+ 'Elevation: '+Math.round(key.samples[0].elv_m)+' m'};
						meanData = _.find(localitiesMeans,function(v){
							return v.site_id == m.id;
						});
						_.merge(m,meanData);
						markers.push(m);
					}
				});
			res.json(markers);
		});
	}).catch(function(err){
		res.send(err);
	});
}
exports.getMarkers10Be = function(req,res){
	localitiesMeans =[];
	var markers = [];
	new siteMeanBe()
	.fetchAll()
	.then(function(meanModel){
		localitiesMeans= meanModel.toJSON();
		new iced.Locality()
		.fetchAll({
			withRelated: ["samples","samples.aliquots10"]
		})
		.then(function(model){
			//Filter to exclude localities with no 10Be aliquots
			localities = _.filter(model.toJSON(), function(l){
				count = 0;
				_.each(l.samples, function(s){
					count = count + s.aliquots10.length;
				});
				return count;
			});
			//Exclude localities with only 1 sample
			localities = _.filter(localities,function(l){
				return (l.samples.length > 1 );
			});
			_.each(localities,function(key,val){
				if(key.samples.length && Number.isInteger(key.site_truet_cor)){
					m = {id:key.id, name: key.site, lng:key.samples[0].lon_DD, lat:key.samples[0].lat_DD,
						age: key.site_truet_cor, ageUns: key.site_del_truet, alt:key.samples[0].elv_m,
						message:'<strong>'+key.site +' </strong><br>' +'Age: '+key.site_truet_cor/1000+' &plusmn; '+ key.site_del_truet/1000+' ka</br>'+ 'Elevation: '+Math.round(key.samples[0].elv_m)+' m' };
						meanData = _.find(localitiesMeans,function(v){
							return v.site_id == m.id;
						});
						_.merge(m,meanData);
						markers.push(m);
					}
				});
			res.json(markers);
		});
	}).catch(function(err){
		res.send(err);
	});
}


//Get all markers (Be and He) in order to display home map.
//return array of markers {nucl,lat,lng, nbSamples}
exports.getAllMarkers = function(req,res){
	var markers = [];
	new iced.Locality()
	.fetchAll({
		withRelated: ["samples","samples.aliquots10"]
	})
	.then(function(model){
			//Filter to exclude localities with no 10Be aliquots
			localities = _.filter(model.toJSON(), function(l){
				count = 0;
				_.each(l.samples, function(s){
					count = count + s.aliquots10.length;
				});
				return count;
			});
			//Exclude localities with only 1 sample
			localities = _.filter(localities,function(l){
				return (l.samples.length > 1 );
			});
			_.each(localities,function(key,val){
				//Excluding localites with 1 sample or no age defined
				if(key.samples.length && Number.isInteger(key.site_truet_cor)){
					console.log(key.id);
					//get publications for locality
					// iced.getLocalitiesPublications([key.id],function(publi){
					// 	console.log(publi);
					// });
					m = {
						id:key.id,
						nucl:10,
						lng:key.samples[0].lon_DD,
						lat:key.samples[0].lat_DD,
						age: key.site_truet_cor,
						alt:key.samples[0].elv_m,
						nbSamples:key.samples.length,
						icon: {type:'div',className:'beMarker',iconSize:[0.5*Math.sqrt(key.samples[0].elv_m),0.5*Math.sqrt(key.samples[0].elv_m)]},
						message:'<strong>'+key.site +' </strong><br>' +'Age: '+key.site_truet_cor/1000+' &plusmn; '+ key.site_del_truet/1000+' ka</br>'
						+ 'Elevation: '
						+Math.round(key.samples[0].elv_m)+' m' 
						+'<br>'+ key.samples.length+ ' samples'
					};

					markers.push(m);
				}
			});
			
			new iced.Locality()
			.fetchAll({
				withRelated: ["samples","samples.aliquots3"]
			})
			.then(function(model){
			//Filter to exclude localities with no 3He aliquots
			localities = _.filter(model.toJSON(), function(l){
				count = 0;
				_.each(l.samples, function(s){
					count = count + s.aliquots3.length;
				});
				return count;
			});
			//Exclude localities with only 1 sample
			localities = _.filter(localities,function(l){
				return (l.samples.length > 1 );
			});
			_.each(localities,function(key,val){
				if(key.samples.length && Number.isInteger(key.site_truet_cor)){
					m = {
						id:key.id,
						nucl:3,
						lng:key.samples[0].lon_DD,
						lat:key.samples[0].lat_DD,
						age: key.site_truet_cor,
						alt:key.samples[0].elv_m,
						nbSamples:key.samples.length,
						icon: {type:'div',className:'heMarker',iconSize:[0.5*Math.sqrt(key.samples[0].elv_m),0.5*Math.sqrt(key.samples[0].elv_m)]},
						message:'<strong>'+key.site +' </strong><br>' +'Age: '+key.site_truet_cor/1000+ ' &plusmn; '+ key.site_del_truet/1000+ ' ka</br>'
						+ 'Elevation: '
						+Math.round(key.samples[0].elv_m)+' m' 
						+'<br>'+ key.samples.length+ ' samples'
					};
					markers.push(m);
				}
			});
			res.json(markers);
		});

		});
}
exports.getWorldMean = function(req,res){
	if(req.params.nucl){
		nucl = req.params.nucl;
		//Check nucleide param and create model
		if(nucl != '10' && nucl != '3')
			res.json({error:'Invalid Nucleide param. Must be 10 or 3'});
		if (nucl == '10')
			model = new worldMeanBe();
		else
			model = new worldMeanHe();
		model.where("id",1).fetch().then(function(model){
			if(model)
				res.json(model.serialize());
			else
				res.json([]);
		}).catch(function(err){
			console.log(err);
		});
	}
};
exports.getRegionalMean = function(req,res){
	if(req.params.nucl){
		nucl = req.params.nucl;
		//Check nucleide param and create model
		if(nucl != '10' && nucl != '3')
			res.json({error:'Invalid Nucleide param. Must be 10 or 3'});
		if (nucl == '10')
			model = new regionalMeanBe();
		else
			model = new regionalMeanHe();
		model.fetchAll().then(function(model){
			if(model)
				res.json(model.serialize());
			else
				res.json([]);
		}).catch(function(err){
			console.log(err);
		});
	}
};
exports.getSamplesMean = function(req,res){
	if(req.params.nucl){
		nucl = req.params.nucl;

		//Check nucleide param and create model
		if(nucl != '10be' && nucl != '3he')
			res.json({error:'Invalid Nucleide param. Must be 10be or 3he'});
		if (nucl == '10be')
			model = new sampleMeanBe();
		else
			model = new sampleMeanHe();
		model.fetchAll().then(function(model){
			res.json(model.serialize());
		}).catch(function(err){
			console.log(err);
		});
	}
};
exports.getSampleMeanById = function(req,res){
	sampleId= req.params.sampleId;
	new sampleMeanBe({sample_id :sampleId})
	.fetch()
	.then(function(model){
		if(model)
			res.json(model.serialize());
		else
			res.json({});
	}).catch(function(err){
		console.log(err);
	});
};
exports.getLocalitiesMean = function(req,res){
	if(req.params.nucl){
		nucl = req.params.nucl;

		//Check nucleide param and create model
		if(nucl != '10be' && nucl != '3he')
			res.json({error:'Invalid Nucleide param. Must be 10be or 3he'});
		if (nucl == '10be')
			model = new siteMeanBe();
		else
			model = new siteMeanHe();
		model.fetchAll().then(function(model){
			res.json(model.serialize());
		}).catch(function(err){
			console.log(err);
		});
	}
};
exports.getLocalityMeanById = function(req,res){
	sampleId= req.params.sampleId;
	new sampleMeanBe({sample_id :sampleId})
	.fetch()
	.then(function(model){
		if(model)
			res.json(model.serialize());
		else
			res.json({});
	}).catch(function(err){
		console.log(err);
	});
};


//Function to save or update a new mean value for a sample
exports.pushSampleMean = function(sampleId,sampleName,nucl,scal,atm,gdb,meanRes){
	opt={method:'insert'};
	//Check nucleide param and create model
	if(nucl != '10' && nucl != '3')
		throw({message:'Invalid Nucleide param. Must be 10 or 3', name:'Wrong Nucl param'});
	if (nucl == '10')
		Model = sampleMeanBe;
	else
		Model = sampleMeanHe;
	model = new Model({sample_id:sampleId,sample_name:sampleName});
	//Check if sample with given id is already in DB
	model.where('sample_id',sampleId).count().then(function(count){
		if(count > 0){
			opt = {method:'update'};
		}
	}).then(function(){
		model.set(fieldName(scal,atm,gdb),meanRes.toString());
		model.save(null, opt)
		.then(console.log('Sample n°'+sampleId  + ' updated on field ' + fieldName(scal,atm,gdb) + " with value " + meanRes))
		.catch(function(err){
			console.log(err);
			console.log(opt);
		});	
	});
};
//Function to save or update a new world mean value
exports.pushWorldMean = function(nucl,field,meanRes){
	opt={method:'insert'};
	// opt={method:'update'};
	//Check nucleide param and create model
	if(nucl != '10' && nucl != '3')
		throw({message:'Invalid Nucleide param. Must be 10 or 3', name:'Wrong Nucl param'});
	if (nucl == '10')
		Model = worldMeanBe;
	else
		Model = worldMeanHe;
	model = new Model({id:1});
	//Check if sample with given id is already in DB
	model.count().then(function(count){
		if(count > 0){
			opt = {method:'update'};
		}
	}).then(function(){
		model.set(field,meanRes.toString()).set('id',1)
		.save(null, opt)
		.then(console.log('World Mean updated on field ' + field + " with value " + meanRes))
		.catch(function(err){
			console.log(err);
			console.log(model.serialize());
			console.log(opt);
		});	
	});
};
//Function to save or update a new regional mean value
exports.pushRegionalMean = function(nucl,regionalMean,next){
	id=regionalMean.regional_id;
	name=regionalMean.regional_name;
	opt={method:'insert'};
	// console.log("Push regional Mean : ", nucl,field,g.name,meanRes);
	//Check nucleide param and create model
	if(nucl != '10' && nucl != '3')
		throw({message:'Invalid Nucleide param. Must be 10 or 3', name:'Wrong Nucl param'});
	if (nucl == '10')
		Model = regionalMeanBe;
	else
		Model = regionalMeanHe;
	model = new Model();
	//Check if sample with given id is already in DB
	model.where('regional_id',id).count().then(function(count){
		if(count > 0){
			opt = {method:'update'};
		}
	}).then(function(){
			if (nucl == '10')
				Model = regionalMeanBe;
			else
				Model = regionalMeanHe;
			model = new Model(regionalMean);
			// model.set(regionalMean);
			// console.log(model.toJSON());
			model.save(null, opt)
			// .then(console.log('Regional Mean'+ g.name +' updated on field ' + field + " with value " + meanRes))
			.then(function(){
				if(next)
					next();
			})
			.catch(function(err){
				console.log("Failed to save n°"+id,err);
				console.log(model.serialize());
				console.log(opt);
				// process.exit();
				
			});	
		});
};
//Function to save or update a new mean value for a locality
exports.pushLocalityMean = function(localityId,siteName,nucl,scal,atm,gdb,meanRes){
	opt={method:'insert'};
	//Check nucleide param and create model
	if(nucl != '10' && nucl != '3')
		throw({message:'Invalid Nucleide param. Must be 10 or 3', name:'Wrong Nucl param'});
	if (nucl == '10')
		Model = siteMeanBe;
	else
		Model = siteMeanHe;
	model = new Model({site_id:localityId,site_name:siteName});
	//Check if locality with given id is already in DB
	model.where('site_id',localityId).count().then(function(count){
		if(count > 0){
			opt = {method:'update'};
		}
	}).then(function(){
		model.set(fieldName(scal,atm,gdb),meanRes.toString());
		model.save(null, opt)
		// .then(console.log('locality n°'+localityId + ' updated on field ' + fieldName(scal,atm,gdb) + " with value " + meanRes))
		.catch(function(err){
			console.log(err);
			// console.log(model.serialize());
			console.log(opt);
		});	
	});
};
//Function to save or update a new region_grp id and name
exports.pushRegions_grp = function(groupeId,groupeName){
    opt={method:'insert'};
    //Create model
    Model = regionsGroup;
    model = new Model({id:groupeId,name:groupeName});
    //Check if groupe with given id is already in DB
    model.where('id',groupeId).count().then(function(count){
        if(count > 0){
            opt = {method:'update'};
        }
    }).then(function(){
        model.save(null, opt)
            .then(console.log('Groupe Id:'+groupeId  + ' ; name:' + groupeName))
            .catch(function(err)
            {
                console.log(err);
                console.log(opt);
            });
    });
};
//Function to save or update a new region id, gropue_id and name
exports.pushRegion = function(regionId,groupeId,regionName){
    opt={method:'insert'};
    //Create model
    Model = Region;
    model = new Model({id:regionId,group_id:groupeId,name:regionName});
    //Check if groupe with given id is already in DB
    model.where('id',regionId).count().then(function(count){
        if(count > 0){
            opt = {method:'update'};
        }
    }).then(function(){
        model.save(null, opt)
            .then(console.log('regionId:'+regionId+'Groupe Id:'+groupeId  + ' ; name:' + regionName))
            .catch(function(err)
            {
                console.log(err);
                console.log(opt);
            });
    });
};

// Generates a db Field name for Mean value
// for int params
// Scal 1 LAL, 2 LSD
// Atm 0 ERA, 1 STD
// GDB 1 Muscheler, 2 Glopis, 3 LSD
// example : LSDERAL
var fieldName = function(scal,atm,gdb){
	var name ="";
	scalStr	=['LAL','LSD'];
	atmStr	=['ERA','STD'];
	gdbStr	=['M','G', 'L'];
	name = name + scalStr[parseInt(scal)-1] + atmStr[parseInt(atm)] + gdbStr[parseInt(gdb)-1];
	return name;
};
exports.fieldName = fieldName;
var fields =[ 
'LSDSTDM','LSDSTDG','LSDSTDL','LSDERAM',
'LSDERAG','LSDERAL','LALSTDM','LALSTDG',
'LALSTDL','LALERAM','LALERAG','LALERAL'
];
exports.fields = fields;

// exports.newSampleMeanBe = function(req, res){
// 	opt={};
// 	mean = new sampleMeanBe({sample_id:1, sample_name:'testing', LSDSTDM:'0',LSDSTDG:'0',
// 		LSDSTDL:'0',LSDERAM:'0',LSDERAG:'0',LSDERAL:'0',LALSTDM:'0',LALSTDG:'0',
// 		LALSTDL:'0',LALERAM:'0',LALERAG:'0',LALERAL:'0'});
// 	//Check if sample with given id is already in DB
// 	if(mean.isNew())
// 		opt = {method:'insert'};

// 	mean.save(null, opt).then(console.log('Model Saved'))
// 	.catch(function(err){
// 		console.log(err);
// 	});
// };

exports.getRegionsGroups = function(req,res){
	new regionsGroup()
	.fetchAll({withRelated: ["regions"]})
	.then(function(m){
		if(m)
			res.send(m.toJSON());
	})
	.catch(function(err){
		res.send("failed");
	});
};





exports.createTables =function(){
	createSamplesTables();
	createSitesTables();
	createRegionalTables();
	createWorldTables();
	createRegionsMatchesTables();
};

createSamplesTables = function(){
	knex.schema.createTableIfNotExists('Be_sample_mean',function(table){
		table.integer('sample_id').primary();
		table.string('sample_name');
		_.each(fields, function(val, key){
			// console.log(val);
			table.text(val);
		})
	}).createTableIfNotExists('He_sample_mean',function(table){
		table.integer('sample_id').primary();
		table.string('sample_name');
		_.each(fields, function(val, key){
			// console.log(val);
			table.text(val);
		})
	}).catch(function(err){
		console.log(err);
	}).then(function(){
		console.log('Samples Tables Created');
	});	
};
createSitesTables = function(){
	knex.schema.createTableIfNotExists('Be_site_mean',function(table){
		table.integer('site_id').primary();
		table.string('site_name');
		_.each(fields, function(val, key){
			// console.log(val);
			table.text(val);
		})
	}).createTableIfNotExists('He_site_mean',function(table){
		table.integer('site_id').primary();
		table.string('site_name');
		_.each(fields, function(val, key){
			// console.log(val);
			table.text(val);
		})
	}).catch(function(err){
		console.log(err);
	}).then(function(){
		console.log('Sites Tables Created');
	});	
};
createRegionalTables = function(){
	knex.schema.createTableIfNotExists('Be_regional_mean',function(table){
		table.integer('regional_id').primary();
		table.string('regional_name');
		_.each(fields, function(val, key){
			// console.log(val);
			table.text(val);
		})
	}).createTableIfNotExists('He_regional_mean',function(table){
		table.integer('regional_id').primary();
		table.string('regional_name');
		_.each(fields, function(val, key){
			// console.log(val);
			table.text(val);
		})
	}).catch(function(err){
		console.log(err);
	}).then(function(){
		console.log('Regional Tables Created');
	});	
};
createWorldTables = function(){
	knex.schema.createTableIfNotExists('Be_world_mean',function(table){
		table.integer('id').primary();
		_.each(fields, function(val, key){
			table.text(val);
		})
	}).createTableIfNotExists('He_world_mean',function(table){
		table.integer('id').primary();
		_.each(fields, function(val, key){
			table.text(val);
		})
	}).catch(function(err){
		console.log(err);
	}).then(function(){
		console.log('World Tables Created');
	});	
};

createRegionsMatchesTables = function(){
	knex.schema
	.createTableIfNotExists('regions_grp', function(table){
		table.integer('id').primary();
		table.text('name');
	})
	.createTableIfNotExists('regions',function(table){
		table.integer('id').primary();
		table.integer('group_id').references('regions_grp.id');
		table.text('name');
	})
	.catch(function(err){
		console.log(err);
	})
	.then(function(){
		console.log('Regions Matches (Iced-D => CREP) tables created');
	})
}

