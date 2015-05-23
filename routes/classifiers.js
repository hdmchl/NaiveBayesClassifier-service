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
/**
 * @api {get} /classifiers Request array of available classifiers
 * @apiName getClassifiers
 * @apiGroup Classifiers
 * @apiSampleRequest /classifiers
 * @apiVersion 0.1.0
 *
 * @apiSuccess {String} _id unique Classifier id
 * @apiSuccess {Date} createdAt Creation date
 * @apiSuccess {String} name Friendly name
 *
 * @apiSuccessExample Example Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "_id": "555f104961af2d9b4bf7dae1",
 *         "createdAt": "2015-05-23T02:56:01.722Z",
 *         "name": "My awesome SPAM classifier"
 *       },
 *       ...
 *     ]
 * 
 */
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
/**
 * @api {post} /classifiers Create a new classifier
 * @apiName newClassifier
 * @apiGroup Classifiers
 * @apiSampleRequest /classifiers
 * @apiVersion 0.1.0
 *
 * @apiParam {String} [name] Friendly name for classifier. Will be blank if not specified.
 * @apiParamExample {json} Request-Example:
 *     {
 *       "name": "My awesome SPAM classifier"
 *     }
 *
 * @apiSuccess {String} _id unique Classifier id
 * @apiSuccess {Date} createdAt Creation date
 * @apiSuccess {String} name Friendly name
 *
 * @apiSuccessExample Example Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "__v": 0,
 *       "classifier":{
 *         "VERSION": "0.1.1",
 *         "options":{},
 *         "vocabulary":{},
 *         "vocabularySize": 0,
 *         "categories":{},
 *         "docFrequencyCount":{},
 *         "totalNumberOfDocuments": 0,
 *         "wordFrequencyCount":{},
 *         "wordCount":{}
 *       },
 *       "createdAt": "2015-05-23T03:16:51.814Z",
 *       "name": "My awesome classifier",
 *       "_id": "28086150-00fa-11e5-b131-91339ddb28b0"
 *     }
 * 
 */
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
/**
 * @api {get} /classifiers/:id Request a classifier
 * @apiName getClassifier
 * @apiGroup Classifiers
 * @apiSampleRequest /classifiers/<CLASSIFIER_ID>
 * @apiVersion 0.1.0
 *
 * @apiSuccess {Number} __v Object version number
 * @apiSuccess {Object} classifier NaiveBayesClassifier object
 * @apiSuccess {Date} createdAt Creation date
 * @apiSuccess {String} name Friendly name
 * @apiSuccess {String} _id Unique ID
 *
 * @apiSuccessExample Example Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "__v": 0,
 *       "classifier":{
 *         "VERSION": "0.1.1",
 *         "options":{},
 *         "vocabulary":{},
 *         "vocabularySize": 0,
 *         "categories":{},
 *         "docFrequencyCount":{},
 *         "totalNumberOfDocuments": 0,
 *         "wordFrequencyCount":{},
 *         "wordCount":{}
 *       },
 *       "createdAt": "2015-05-23T03:16:51.814Z",
 *       "name": "My awesome classifier",
 *       "_id": "28086150-00fa-11e5-b131-91339ddb28b0"
 *     }
 * 
 */
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
/**
 * @api {post} /classifiers/:id/learn Teach a classifier
 * @apiName classifierLearn
 * @apiGroup Classifiers
 * @apiSampleRequest /classifiers/<CLASSIFIER_ID>/learn
 * @apiVersion 0.1.0
 *
 * @apiDescription Teach your classifier what `category` some `text` belongs to. 
 *  The more you teach your classifier, the more reliable it becomes. 
 *  It will use what it has learned to identify new documents that it hasn't 
 *  seen before. This endpoint accepts a single object or an array of objects.
 *
 * @apiParam {String} text Text that will be tokenized and used for learning
 * @apiParam {String} category Name of the `category` that the attached `text` belongs to
 * @apiParamExample {json} Request-Example:
 *     {
 *       "text": "amazing, awesome movie!! Yeah!!",
 *       "category": "positive"
 *     }
 *
 * @apiSuccess {Number} category Number of documents of that category type, that have been learnt
 *
 * @apiSuccessExample Example Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "positive": 1
 *     }
 * 
 */
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
/**
 * @api {post} /classifiers/:id/categorize Classify some text
 * @apiName classifierCategorize
 * @apiGroup Classifiers
 * @apiSampleRequest /classifiers/<CLASSIFIER_ID>/categorize
 * @apiVersion 0.1.0
 *
 * @apiDescription This will return the most likely `category` the classifier thinks some
 *  `text` belongs to and its probability. Its judgement is based on what you have taught 
 *  it with `.learn(text, category)`.
 *
 * @apiParam {String} text Text that will be tokenized and used for learning
 * @apiParamExample {json} Request-Example:
 *     {
 *       "text": "amazing, awesome movie!! Yeah!!"
 *     }
 *
 * @apiSuccess {Number} category Number of documents of that category type, that have been learnt
 *
 * @apiSuccessExample Example Success-Response:
 *     HTTP/1.1 200 OK
 *     { 
 *       "category": "positive",
 *       "probability": 0.768701215200234,
 *       "categories": { 
 *         "positive": 0.768701215200234,
 *         "negative": 0.15669449587155276,
 *         "neutral": 0.07460428892821327
 *       } 
 *     }
 * 
 */
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