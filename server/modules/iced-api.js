//Require database instance
var bookshelf = require('../modules/iced-conf');
bookshelf.plugin('virtuals');
var _ = require('lodash');

// var publications = require('publications');

//Publication Model
var Publication = bookshelf.Model.extend({
	tableName : 'publications',
	idAttribute : 'id',

	samples : function(){
		return this.belongsToMany(Sample, 'sample_publication_match', 'publications_unique_id', 'samples_unique_id');
	}
});

var PublicationMatch = bookshelf.Model.extend({
	tableName : 'sample_publication_match',
	idAttribute : 'id',

	publication : function(){
		return this.hasOne(Publication, 'id', 'publications_unique_id');
	},

	sample : function(){
		return this.hasMany(Sample, 'id','samples_unique_id');
	}

});

var getPubliMatch = function(){
	new PublicationMatch()
	.fetchAll({
		withRelated: 'sample'
	})
	.then(function(model){
		console.log(model.toJSON());
		var publiMatch = model.toJSON();
		return publiMatch;
	});
};
var Locality = bookshelf.Model.extend({
	tableName: 'localities',
	idAttribute: 'short_name',
	samples: function(){
		return this.hasMany(Sample,'site');
	},
	virtuals:{
		//correct site age (+50 years)
		site_truet_cor :function(){
			age = this.get('site_truet');
			if(age)
				return  age + 50;
			else
				return age;
		},

		//set virtual for joining publications for each sample to
		// locality data
		// publications: getPubliMatch()
		

	}
});
exports.Locality = Locality;

var Sample = bookshelf.Model.extend({
	tableName: 'samples',
	idAttribute: 'sample_name',
	site: function(){
		return this.belongsTo(Locality,'short_name');
	},
	aliquots10: function(){
		return this.hasMany(Aliquot10,'sample_name');
	},
	aliquots3: function(){
		return this.hasMany(Aliquot3,'sample_name');
	},
	// publications: function(){
	// 	return this.Many(Publication, 'sample_publication_match', 'samples_unique_id', 'publications_unique_id');
	// }
	publications : function(){ 
		return this.hasMany(Publication,'id').through(PublicationMatch,'id','samples_unique_id','id','id');
	}
});

var Aliquot10 = bookshelf.Model.extend({
	tableName: 'Be10_Al26_quartz',
	sample: function(){
		return this.belongsTo(Sample,'sample_name');
	}
});
var Aliquot3 = bookshelf.Model.extend({
	tableName: 'He3_pxol',
	sample: function(){
		return this.belongsTo(Sample,'sample_name');
	}
});


exports.getSampleById = function(req,res){
	//Create res data
	var sampleRes;

	new Sample({'id':req.params.id})
	.fetch({
		withRelated: ['aliquots3','aliquots10']
	})
	.then(function(model){
		if(model){
			sampleRes = model;
			new Locality({short_name : model.get('site')})
			.fetch().then(function(model){
					// console.log('Site : ' , model);
					sampleRes.set( "parentSite", model);
					res.json(sampleRes);
				});
		}
		else
			res.json({});
	});
};
exports.getSamples = function(req,res){
	new Sample()
	.fetchAll({
		withRelated: ['aliquots3','aliquots10','publications']
	})
	.then(function(model){
		res.json(model);
	});
};
exports.getSamples10Be = function(req,res){
	new Sample()
	.fetchAll({
		withRelated: ['aliquots10',publications, {

		}]
	})
	.then(function(model){ 
		res.json(
			//Filter to exclude samples with no 10Be aliquots
			_.filter(model.toJSON(), function(s){
				return s.aliquots10.length;
			})
			);
	});
};
exports.getSamples3He = function(req,res){
	new Sample()
	.fetchAll({
		withRelated: ['aliquots3',publications, {

		}]
	})
	.then(function(model){ 
		res.json(
			//Filter to exclude samples with no 3He aliquots
			_.filter(model.toJSON(), function(s){
				return s.aliquots3.length;
			})
			);
	});
};

exports.getLocalityById = function(req,res){
	new Locality({'id':req.params.id})
	.fetch({
		withRelated: ['samples']
	})
	.then(function(model){
		if(model)
			res.json(model);
		else
			res.json({});

	});
};

exports.getLocalities = function(req,res){
	new Locality()
	.fetchAll({
		withRelated: ["samples","samples.aliquots10","samples.aliquots10"]
	})
	.then(function(model){
		res.json(model);
	});
};

exports.getLocalities10Be = function(req,res){
	new Locality()
	.fetchAll({
		withRelated: ["samples","samples.aliquots10"]
	})
	.then(function(model){
		res.json(
			//Filter to exclude localities with no 10Be aliquots
			_.filter(model.toJSON(), function(l){
				count = 0;
				_.each(l.samples, function(s){
					count = count + s.aliquots10.length;
				});
				return count;
			})
			);
	});
};

exports.getLocalities3He = function(req,res){
	new Locality()
	.fetchAll({
		withRelated: ["samples","samples.aliquots3"]
	})
	.then(function(model){
		res.json(
			//Filter to exclude localities with no 3he aliquots
			_.filter(model.toJSON(), function(l){
				count = 0;
				_.each(l.samples, function(s){
					count = count + s.aliquots3.length;
				});
				return count;
			})
			);
	});
};

exports.getAllPubliMatch = function(req,res){
	new PublicationMatch()
	.fetchAll({
		withRelated: ['sample', 'publication']
	})
	.then(function(model){
		// console.log(model.toJSON());
		res.json(model);
	});
};

// give Array[] of samples Ids
//return Array[] of publications ids
exports.getSamplesPubliIds = getSamplesPubliIds =  function(samplesIds,callback,end){
	console.log("samples : ", samplesIds);
	i=1;
	publicationsIds = [];
	_.each(samplesIds, function(sample){
		new PublicationMatch({'samples_unique_id':sample})
		.fetch(['publication'])
		.then(function(model){
			if(model){
				publi = model.toJSON();
				// console.log(publi);
				// _.each(publi, function(p){
				// 	console.log(p);
				publicationsIds.push(publi.publications_unique_id);
				// });
				if(i==samplesIds.length){
					// console.log(_.uniq(publicationsIds));
					return callback(_.uniq(publicationsIds),end);
				}
			}
			i++;
		});
	});
};

//wrapping of getSamplesPubliIds to send json res

exports.getPubliForSamples = function(req,res){

};
//give Array[] of localities ids
// return Array[] of samples that belongs to them
exports.getLocalitiesSamplesIds =  getLocalitiesSamplesIds = function (localitiesIds,callback, end){
	console.log("localities : ", localitiesIds);
	c=1;
	samplesIds = [];
	_.each(localitiesIds, function(loc){
		new Locality({'id':loc})
		.fetch({
			withRelated: ['samples']
		})
		.then(function(model){
			if(model){
				samples = model.toJSON()['samples'];
				_.each(samples, function(s){
					// console.log(s.id);
					samplesIds.push(s.id);
				});
				if(c==localitiesIds.length){
					// console.log(samplesIds);
					callback(_.uniq(samplesIds),getPubliStr,end);
				}
			}
			c++;
		});
	});
};

//Array of publi
getPubliStr = function(publi,end){
	publications = [];
	console.log("publications",publi);
	j=1;
	_.each(publi,function(p){
		new Publication({id:p})
		.fetch()
		.then(function(model){
			if(model){
	      // console.log("publi",model.toJSON());
	      publications.push(model.toJSON());
	      if(j==publi.length)
      	// console.log(publications);
      end(publications);
  }
  j++;
});
	});
};

exports.getLocalitiesPublications = function(localitiesIds,callback){
	getLocalitiesSamplesIds(localitiesIds,getSamplesPubliIds,callback);
};