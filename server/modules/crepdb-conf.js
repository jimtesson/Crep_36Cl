// *** Store Crep database configuration ***

// Store data for database client and database option
var devConfig = {
	client: 'mysql',
	connection: {
		host: '127.0.0.1',
		user: 'root',
		password: 'chlore36', //'helium-3',
		database: 'CREP',
		charset: 'utf8'

	}
};
// Passing devConfig object to included package knex
var knex =  require('knex')(devConfig);

// Passing knex object to included package bookshelf
module.exports.knex = knex;

// Export the bookshelf
module.exports.bookshelf = require('bookshelf')(knex);
