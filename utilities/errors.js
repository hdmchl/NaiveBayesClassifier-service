// ERROR HANDLING
// =============================================================================
module.exports = function (code, customError) {
	var errors = {
		//1xx NBC library error
		100: 'NaiveBayesClassifier failed',
		101: 'Classifier hasn\'t been trained',
		//2xx database error
		200: 'Could not find object in database',
		201: 'Error saving to database',
		//3xx server error
		301: 'Object is missing required properties'
	}

	console.error('ERROR', errors[code]);

	return {
		code: code,
		error: customError || errors[code]
	}
}