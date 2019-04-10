//ICE-D Database conf 

var icedConfig = {
	client: 'mysql',
	connection: {
		host: '173.194.241.211',
		user: 'CRPG_reader',
		password: 'helium-3',
		database: 'ICED_CAL',
		charset: 'utf8'

	}
};


var devConfig = {
	client: 'mysql',
	connection: {
		host: 'localhost',
		user: 'root',
		password: 'chlore36', //'helium-3',
		database: 'ICED_CAL',
		charset: 'utf8'

	}
};

var knex =  require('knex')(devConfig);

module.exports = require('bookshelf')(knex);
