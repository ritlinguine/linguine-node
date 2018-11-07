(function(){
 
  angular
  .module('linguine.analysis')
  .controller('AnalysisNewController', AnalysisNewController);

  function AnalysisNewController($http, $scope, $state, $rootScope, flash, usSpinnerService) {
    $scope.analysisNotSelected = true;
    $scope.needTokenizer = true; 
    $scope.analysis = {analysisName: ""};
    $scope.preprocAvailable = true;
    $scope.tabs = [{active: true}, {active: false}, {active: false}];

    /*
     * Analyses are the crux of the NLP workflow, so they should be 
     * chosen before anything else. Analysis can be run on either
     * a single corpus or an entire corpora. Rach analysis can also have
     * tokenization tasks and specific cleanup tasks bound to them, represented
     * by the tokenizerTypes and cleanupTypes objects.
     */
    $scope.analysisTypes = [
      {
        name: "Term Frequency Analysis",
        unfriendly_name: "wordcloudop",
        description: "This operation separates terms in a corpus and creates a word cloud with them, with the most frequent words being the largest.",
        multipleCorporaAllowed: false,
        tokenAllowed: true,
        tokenizerRequired: true
      },
      {
        name: "Disfluency Analysis (SPLAT)",
        unfriendly_name: "splat-disfluency",
        description: "This operation parses the text of the corpus and gathers some metrics for disfluencies, such as 'UH' and 'UM'.",
        multipleCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "N-gram Frequency Analysis (SPLAT)",
        unfriendly_name: "splat-ngrams",
        description: "This operation extracts the unigrams, bigrams, and trigrams from the corpus using the Natural Language ToolKit (NLTK).",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenierRequired: false
      },
      {
        name: "Complexity Analysis (SPLAT)",
        unfriendly_name: "splat-complexity",
        description: "This operation calculates four different types of complexity: content density, idea density, Flesch readability, and Flesch-Kincaid grade level.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenierRequired: false
      },
      {
        name: "Part of Speech Frequencies (SPLAT)",
        unfriendly_name: "splat-pos",
        description: "This operation performs a part of speech analysis on each word provided in the corpus. Each word will receive an identifier which represents the appropriate part of speech for the given word. It then displays a table of the frequencies of each (Penn Treebank) POS tag.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Pronoun Frequency Analysis (SPLAT)",
        unfriendly_name: "splat-pronouns",
        description: "This operation counts all of the pronouns within the corpus and displays them.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Syllable Frequencies (SPLAT)",
        unfriendly_name: "splat-syllables",
        description: "This operation uses the cmudict to lookup syllable counts for each word in the corpus. For each unique syllable count found, words with that many syllables will be grouped together and displayed in a table. If a word is not found in the cmudict, the python library difflib is used to find the closest matching word in the cmudict, and the syllable count for that closest match is used.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Syntactic Parse Trees w/ Part of Speech Tags (Stanford CoreNLP)",
        unfriendly_name: "nlp-pos",
        description: "This operation performs a part of speech analysis on each word provided in the corpus. Each word will receive an identifier which represents the appropriate part of speech for the given word. ",
        multipleCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Coreference Resolution (Stanford CoreNLP)",
        unfriendly_name: "nlp-coref",
        description: "This operation determines entities in the given corpus and show where each entity is mentioned.",
        multipleCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Named Entity Recognition (Stanford CoreNLP)",
        unfriendly_name: "nlp-ner",
        description: "This operation will classify each word in the corpus based on its status as a place, organization, location, or expression of time. If a term does not match as a named entity, it will recieve a status of '0' ",
        tokenAllowed: false,
        multipleCorporaAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Sentiment (Stanford CoreNLP)",
        unfriendly_name: "nlp-sentiment",
        description: "This operation will measure the sentiment of the corpus, sentences, and tokens using models provided by Stanford Core NLP.",
        tokenAllowed: false,
        multipleCorporaAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Relation Extraction (Stanford CoreNLP)",
        unfriendly_name: "nlp-relation",
        description: "This operation will attempt to find relationship triples between words based on Stanford Core NLP models in the OpenIE libraries.",
        tokenAllowed: false,
        multipleCorporaAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Character N-gram Frequency Analysis (SPLAT)",
        unfriendly_name: "char-ngrams",
        description: "This operation extracts the character unigrams, bigrams, and trigrams from the corpus using the Natural Language ToolKit (NLTK).",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Word and Sentence Length Analysis",
        unfriendly_name: "length-stats",
        description: "This operation simple statistics for a text, such as characters per word and words per sentence.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Topic Modeling (10 Topics) (Gensim)",
        unfriendly_name: "topic-model-10",
        description: "This operation creates a topic model using an LDA with 10 topics. It expects multiple \"documents\", which need to be separated by an empty line in the processed corpus.",
        multiCorporaAllowed: true,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Topic Modeling (30 Topics) (Gensim)",
        unfriendly_name: "topic-model-30",
        description: "This operation creates a topic model using an LDA with 30 topics. It expects multiple \"documents\", which need to be separated by an empty line in the processed corpus.",
        multiCorporaAllowed: true,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Word Vectors (Gensim)",
        unfriendly_name: "word-vector",
        description: "This operation carries out calculations on GloVe word vectors.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Morphology Induction (Linguistica 5)",
        unfriendly_name: "unsup-morph",
        description: "This operation determines likely patterns for suffixed words in a corpus. This requires a larger corpus; several paragraphs of text is not sufficient.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      },
      {
        name: "Bigram Array (SPLAT)",
        unfriendly_name: "bigram-array",
        description: "This operation displays a bigram array showing co-occurrences of characters.",
        multiCorporaAllowed: false,
        tokenAllowed: false,
        tokenizerRequired: false
      }
    ];
    $scope.analysisTypes.sort(function(a, b) {
        var nameA = a.name.toUpperCase(); // ignore upper and lowercase
        var nameB = b.name.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
    
    /*
     * Object to keep track of all cleanup tasks that
     * are available to pass back to the Python server. The keys
     * are the unfriendly names of each cleanup task so that they
     * can be bound to each analysis in the cleanupTypes object
     */
    var cleanups = {
      "stem_porter": {
        name: "Stem (Porter)",
        unfriendly_name: "stem_porter",
        description: "Stem words using the NLTK Porter Stemmer. Converts inflected words in the corpus to their base form. This is a good general purpose stemmer to use."
      },
      "removecapsgreedy": {
        name: "Remove Capitalization (Naive)",
        unfriendly_name: "removecapsgreedy",
        description: "Convert all uppercase letters to lowercase letters."
      },
      "removecapsnnp": {
        name: "Remove Capitalization (NNP)",
        unfriendly_name: "removecapsnnp",
        description: "Convert uppercase letters to lowercase letters while leaving proper nouns capitalized, using TextBlob's Part-of-Speech tagger to identify proper nouns."
      },
      "removepunct": {
        name: "Remove Punctuation",
        unfriendly_name: "removepunct",
        description: "Remove all punctuation, using NLTK's Regexp tokenizer to scan the text for patterns of punctuation marks."
      },
      "stop_words": {
        name: "Remove Stop Words",
        unfriendly_name: "stop_words",
        description: "Removes NLTK's compiled list of stop words like 'and', 'or', 'but', etc."
      },
      "removesilence": {
        name: "Remove Silent Pauses",
        unfriendly_name: "removesilence",
        description: "Removes the tokens that represent silent pauses in speech: {SL} and {sl}."
      },
      "remove_quotes": {
        name: "Remove Quotes",
        unfriendly_name: "removequotes",
        description: "Removes quotations: ', \", ‘, ’, “, ”."
      },
      "remove_hashtags": {
        name: "Remove Hashtags",
        unfriendly_name: "removehashtags",
        description: "Removes the hashtag character ('#')."
      }
    };

    /*
     * for each unfriendly_name of an analysis, there is a set of cleanup tasks
     * that are deemed applicable.
     * This object is used to list all cleanup tasks relevant to each analysis on the view.
     *
     * Key[analysisUnfriendlyName] => value [cleanupUnfriendlyName1, unfriendlyName2, ... n]
     */
    $scope.cleanupTypes = {
      "pos_tag": [cleanups.stem_porter, cleanups.removecapsnnp, cleanups.removepunct, cleanups.stop_words, cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "wordcloudop": [cleanups.stem_porter, cleanups.removecapsgreedy, cleanups.removecapsnnp, cleanups.removepunct, cleanups.stop_words, cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "nlp-pos": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "splat-disfluency": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "splat-ngrams": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "splat-complexity": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "splat-pos": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "splat-syllables": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "splat-pronouns": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "nlp-ner": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "nlp-coref": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "nlp-sentiment": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "nlp-relation": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "char-ngrams": [cleanups.removepunct, cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "length-stats": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "topic-model-10": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "topic-model-30": [cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
      "word-vector": [],
      "unsup-morph": [],
      "bigram-array": [cleanups.removepunct, cleanups.removesilence, cleanups.remove_quotes, cleanups.remove_hashtags],
    };

    $scope.tokenizerTypes = [
      {
        name: "Word Tokenize (Penn Treebank)",
        unfriendly_name: "word_tokenize_treebank",
        description: "Separates the text in each corpus into individual word tokens, using NLTK's Penn Treebank tokenizer. This is a good general purpose tokenizer to use."
      },
    ];

    $http.get('api/corpora')
    .success(function (data) {
      // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description
      data.sort(function(a, b) {
        var nameA = a.title.toUpperCase(); // ignore upper and lowercase
        var nameB = b.title.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      $scope.corpora = data;
    });
    
    /*
     * Determine if the selected analysis can either accept
     * a single corpora or multiple, and handle
     * the selection appropriately. 
     */ 
    $scope.onCorpusClick = function (e) {
      var activeCount = 0;
      var activeCorpora = [];
      
      //Keep track of the corpora that are currently active
      $scope.corpora.forEach(function(corpora) {
        if(corpora.active){
          activeCount++; 
          activeCorpora.push(corpora);
        }
      });
      
      //User selects a corpora when one is already selected
      //and analysis can only accept 1 corpora
      if(!e.corpus.active && activeCount == 1  && !$scope.selectedAnalysis.multipleCorporaAllowed) {
        e.corpus.active = true;
        //Disable previous corpora
        activeCorpora[0].active = false; 
      }
      //Any other case, user can de-select or select multiple
      else {
        e.corpus.active = !e.corpus.active;
      }
    };

    $scope.onAnalysisClick = function (e) {
      $scope.selectedAnalysis = e.analysis;
      $scope.analysis.analysisName = e.analysis.name;

      //re-enable the preprocessing tab once an analysis is clicked
      $scope.analysisNotSelected = false;
    };

    $scope.onCleanupClick = function(e) {
      e.cleanup.active = !e.cleanup.active;
    };

    $scope.onTokenizerClick = function(e) {
      $scope.selectedTokenizer = e.tokenizer;
      $scope.needTokenizer = false;
    };
    
    $scope.checkIfNoPreprocessingAvailable = function() {
      var analysisName = $scope.selectedAnalysis.unfriendly_name;
      var noCleanupTypes = $scope.cleanupTypes[analysisName].length == 0; 

      if(noCleanupTypes && !$scope.selectedAnalysis.tokenAllowed) {
          flash.info.setMessage("No preprocessing options are available for " +            $scope.selectedAnalysis.name);
          $rootScope.$emit("event:angularFlash");
      }
    }

    $scope.onPreprocessingTabClick = function(e) {
      if(!$scope.selectedAnalysis) {
        flash.danger.setMessage('Please select an analysis before selecting preprocessing options.');
        $rootScope.$emit("event:angularFlash");
      }
      $scope.checkIfNoPreprocessingAvailable();
      $scope.tabs[0].active = false;$scope.tabs[1].active = false;$scope.tabs[2].active = true;
    };

    $scope.onCorporaTabClick = function(e) {
      //Reset the corpora selected if we've chosen an analysis
      //that can only accept one corpora
      var activeCount = 0;
      $scope.corpora.forEach(function(corpus) {
        if(corpus.active === true) {
          activeCount++; 
        }
      });

      if(activeCount > 1) {
        //flush the list of selected corpora 
        $scope.corpora.forEach(function(corpus) {
          if(corpus.active) {
            corpus.active = false; 
          }
        });
        //Display a message to the user that corpora has been cleared
        flash.info.setMessage($scope.selectedAnalysis.name + "Cannot be used with multiple" + 
        " corpora. Please choose a new corpora.");

        $rootScope.$emit("event:angularFlash");
        
      }
      
      if(!$scope.selectedAnalysis) {
        flash.danger.setMessage('Please select an analysis before selecting corpora.');
        $rootScope.$emit("event:angularFlash");
      }
      $scope.tabs[0].active = false;$scope.tabs[1].active = true;$scope.tabs[2].active = false;
    };

    $scope.onAnalysisTabClick = function(e) {
      $scope.tabs[0].active = true;$scope.tabs[1].active = false;$scope.tabs[2].active = false;
    };

    $scope.onPreviousButtonClick = function(e) {
      if ($scope.tabs[1].active) {
        $scope.onAnalysisTabClick(e);
      } else if ($scope.tabs[2].active) {
        $scope.onCorporaTabClick(e);
      }
    };

    $scope.onNextButtonClick = function(e) {
      if (!(($scope.tabs[0].active && $scope.analysisNotSelected) || $scope.tabs[2].active)) {
        if ($scope.tabs[0].active) {
          $scope.onCorporaTabClick(e);
        } else {
          $scope.onPreprocessingTabClick(e);
        }
      }
    };

    $scope.onCreateAnalysis = function () {
     
      if($scope.needTokenizer && $scope.selectedAnalysis.tokenizerRequired) {
        flash.info.setMessage('The selected analysis requires a tokenizer to complete.');
        $rootScope.$emit("event:angularFlash");
        return;
      }
      
      var numActive = 0;
      $scope.corpora.forEach(function(corpora) {
        if(corpora.active){numActive++;}
      });

      if(numActive == 0) {
        flash.info.setMessage('Please select a corpora before continuing.');
        $rootScope.$emit("event:angularFlash");
        return;
      }

      try {
        usSpinnerService.spin('analysisProcSpinner');
        theDate = new Date();
        var payload = {
          corpora_ids: _.pluck(_.where($scope.corpora, 'active'), '_id'),
          cleanup: _.map(_.where($scope.cleanupTypes[$scope.selectedAnalysis.unfriendly_name], 'active'), function (cleanupType) {
            return cleanupType.unfriendly_name;
          }),
          operation: $scope.selectedAnalysis.unfriendly_name,
          tokenizer: $scope.selectedTokenizer? $scope.selectedTokenizer.unfriendly_name: "",
          library: "",
          transaction_id: "",
          analysis_name: $scope.analysis.analysisName,
          time_created: new Date().getTime(),
          user_id: ""
        };

        $http.post('api/analysis', payload)
        .success(function (data) {
          console.log(data);
          usSpinnerService.stop('analysisProcSpinner');
          $state.go('linguine.analysis.index');
        })
        .error(function (data) {
          usSpinnerService.stop('analysisProcSpinner');
          flash.danger.setMessage('An error occurred while trying to create your analysis.');
          $rootScope.$emit("event:angularFlash");
        });
      } catch (error) {
        usSpinnerService.stop('analysisProcSpinner');
        flash.danger.setMessage('There was a problem with your request.  Please review the options you have selected and try again.');
        $rootScope.$emit("event:angularFlash");
      }
    };
  }
})();
