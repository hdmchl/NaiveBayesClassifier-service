// BASE SETUP
// =============================================================================
var express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	PORT = process.env.PORT || 8080,
	uuid = require('node-uuid'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId,
	NaiveBayesClassifier = require('naivebayesclassifier'),
	ClassifierSchema = new Schema({ _id: { type: String, default: uuid.v1}, classifier: {} }),
	Classifier = mongoose.model('Classifier', ClassifierSchema);

// CONFIGURE EXPRESS
// =============================================================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CONNECT TO DATABASE
// =============================================================================
mongoose.connect('mongodb://192.168.99.100:32769');

// DEFINE ROUTES
// =============================================================================
app.get('/classifiers', function(req, res) {
	//return a list of classifiers
});

app.post('/classifiers', function (req, res) {
	var classifier = new Classifier({ classifier: new NaiveBayesClassifier() });

	classifier.save(function (err) {
		if (!err) {
			res.status(200).json(classifier);
		} else {
			console.log('Error saving', err);
			res.sendStatus(500);
		}
	});
});

app.get('/classifiers/:id', function (req, res) {
	Classifier.findById(req.params.id, function (err, classifier) {
		if (!err && classifier) {
			console.log(classifier)
			res.status(200).json(NaiveBayesClassifier.withClassifier(classifier.classifier));
		} else {
			console.log('Error retrieving classifier: ' + req.params.id, err);
			res.sendStatus(500);
		}
	});
});

app.post('/classifiers/:id/learn',function (req, res, next) {
	// expects an array of phrases: [ {text: "", category: ""} ]
	// or single object {text: "", category: ""}
	var items = !!req.body && (req.body instanceof Array) ? req.body : [req.body];

	Classifier.findById(req.params.id, function (err, classifier) {
		if (!err && classifier) {
			classifier.classifier = NaiveBayesClassifier.withClassifier(classifier.classifier);

			for (var i=0; i<items.length; i+=1) {
				if (items[i] && 
					items[i].hasOwnProperty('text') && typeof items[i].text === 'string' && 
					items[i].hasOwnProperty('category') && typeof items[i].category === 'string') {

					try {
						classifier.classifier.learn(items[i].text, items[i].category);
					} catch (err) {
						console.log(err)
						res.status(500).json({ message: 'Error thrown while training algorithm.', error: err });
						return;
					}
				} else {
					res.status(500).json({ message: 'item is missing properties' + items[i] });
					return;
				}
			}

			classifier.save(function (err) {
				if (!err) {
					res.status(200).json(classifier.classifier.docFrequencyCount);
				} else {
					console.log('Error saving', err);
					res.sendStatus(500);
				}
			});
		} else {
			console.log('Error retrieving classifier: ' + req.params.id, err);
			res.sendStatus(500);
		}
	});
});

app.post('/classifiers/:id/categorize', function(req, res, next) {
	// expects an array of text objects: [ {text: ""} ]
	// or single object {text: ""}
	var items = !!req.body && (req.body instanceof Array) ? req.body : [req.body];

	Classifier.findById(req.params.id, function (err, classifier) {
		if (!err && classifier) {
			classifier.classifier = NaiveBayesClassifier.withClassifier(classifier.classifier);

			if (classifier.classifier.totalNumberOfDocuments === 0) {
				res.status(404).json({ message: 'I am yet to be trained. Please use `/learn` to teach me stuff.' });
				return;
			}

			var response = [];
			for (var i=0; i<items.length; i+=1) {
				if (items[i] && 
					items[i].hasOwnProperty('text') && typeof items[i].text === 'string') {

					try {
						var category = classifier.classifier.categorize(items[i].text);
						category.text = items[i].text;
						response.push(category);
					} catch (err) {
						console.log(err)
						res.status(500).json({ message: 'Error thrown while classifying.', error: err });
						return;
					}
				} else {
					res.status(500).json({ message: 'item is missing properties' + items[i] });
					return;
				}
			}
		} else {
			console.log('Error retrieving classifier: ' + req.params.id, err);
			res.sendStatus(500);
		}

		res.status(200).json(response);
	});
});

// START THE SERVER
// =============================================================================
app.listen(PORT);
console.log('Server running on port ' + PORT);