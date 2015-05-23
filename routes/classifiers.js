// EXPRESS SETUP
// =============================================================================
var express = require('express'),
	router = express.Router();

// UTILITIES
// =============================================================================
var uuid = require('node-uuid');
	errorMessage = require('./../utilities/errors');

// NAIVE BAYES CLASSIFIER
// =============================================================================
var NaiveBayesClassifier = require('naivebayesclassifier');

// MONGODB SETUP
// =============================================================================
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ClassifierSchema = new Schema({ 
		_id: { type: String, default: uuid.v1}, 
		name: { type: String, default: ''},
		createdAt: { type: Date, default: function() { return new Date(); } },
		classifier: {}
	}),
	Classifier = mongoose.model('Classifier', ClassifierSchema);

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://192.168.99.100:32768');

// ROUTING
// =============================================================================
router.route('/')
	.get(function (req, res) { //get all classifiers
		Classifier.find({}, function(err, classifiers) {
			if (!err && classifiers) {
				var response = [];
				classifiers.forEach(function(classifier) {
					response.push({
						_id: classifier._id,
						createdAt: classifier.createdAt,
						name: classifier.name
					});
				});
				res.status(200).json(response);
			} else {
				res.status(404).json(errorMessage(100));
			}
		});
	})
	.post(function (req, res) { //create new classifier
		try {
			var newClassifier = new NaiveBayesClassifier();
		} catch (err) {
			res.status(500).json(errorMessage(100, err));
			return;
		}

		var name = !!req.body && !!req.body.hasOwnProperty('name') ? req.body.name : '';

		var classifier = new Classifier({ 
			name: name,
			classifier: newClassifier
		});
		
		classifier.save(function (err) {
			if (!err) {
				res.status(200).json(classifier);
			} else {
				res.status(500).json(errorMessage(201));
			}
		});
	});

router.route('/:id')
	.get(function (req, res) {
		Classifier.findById(req.params.id, function (err, classifier) {
			if (!err && classifier) {
				try {
					classifier.classifier = NaiveBayesClassifier.withClassifier(classifier.classifier);
					res.status(200).json(classifier);
				} catch (err) {
					res.status(500).json(errorMessage(100, err));
				}
			} else {
				res.status(404).json(errorMessage(200));
			}
		});
	});

router.route('/:id/learn')
	.post(function (req, res, next) {
		// expects:
		// 	an array of phrases: [ {text: "", category: ""} ]
		// 	or single object {text: "", category: ""}
		var items = !!req.body && (req.body instanceof Array) ? req.body : [req.body];

		Classifier.findById(req.params.id, function (err, classifier) {
			if (!err && classifier) {
				try {
					classifier.classifier = NaiveBayesClassifier.withClassifier(classifier.classifier);
				} catch (err) {
					res.status(500).json(errorMessage(100, err));
					return;
				}

				items.forEach(function(item) {
					if (item && 
						item.hasOwnProperty('text') && typeof item.text === 'string' && 
						item.hasOwnProperty('category') && typeof item.category === 'string') {

						try {
							classifier.classifier.learn(item.text, item.category);
						} catch (err) {
							res.status(500).json(errorMessage(100, err));
							return;
						}
					} else {
						res.status(400).json(errorMessage(301));
						return;
					}
				})

				classifier.save(function (err) {
					if (!err) {
						res.status(200).json(classifier.classifier.docFrequencyCount);
					} else {
						res.status(500).json(errorMessage(201));
					}
				});
			} else {
				res.status(404).json(errorMessage(200));
			}
		});
	});

router.route('/:id/categorize')
	.post(function (req, res, next) {
		// expects:
		// 	an array of phrases with option request ids: [ {text: ""} ]
		// 	or single object {text: ""}
		var items = !!req.body && (req.body instanceof Array) ? req.body : [req.body];

		Classifier.findById(req.params.id, function (err, classifier) {
			var response = [];

			if (!err && classifier) {
				try {
					classifier.classifier = NaiveBayesClassifier.withClassifier(classifier.classifier);
				} catch (err) {
					res.status(500).json(errorMessage(100, err));
					return;
				}

				if (classifier.classifier.totalNumberOfDocuments === 0) {
					res.status(400).json(errorMessage(101));
					return;
				}

				try {
					items.forEach(function(item) {
						if (item && item.hasOwnProperty('text') && typeof item.text === 'string') {

							var category = classifier.classifier.categorize(item.text);
							category.text = item.text;
							response.push(category);
							
						} else {
							res.status(500).json(errorMessage(301));
							return;
						}
					});
				} catch (err) {
					res.status(500).json(errorMessage(100, err));
					return;
				}
			} else {
				res.status(404).json(errorMessage(200));
				return;
			}

			res.status(200).json(response);
		});
	});

module.exports = router;