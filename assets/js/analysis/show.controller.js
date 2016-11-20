(function(){

  angular
  .module('linguine.analysis')
  .config(['$compileProvider', function ($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|blob):/);
  }])
  .controller('AnalysisShowController', AnalysisShowController);

  function AnalysisShowController ($http, $scope, $state, $stateParams, $window) {

    $scope.sentenceIndex = 0;
    $scope.corefEntities = [];

    $scope.setSentence = function(index) {
        if(index != $scope.sentenceIndex) {
            $scope.sentenceIndex = index;
            $scope.sentenceData = $scope.analysis.result.sentences[$scope.sentenceIndex];
            $scope.sentimentTreeData = $scope.analysis.result.sentences[$scope.sentenceIndex].sentiment_json;
            $scope.depsTreeData = $scope.analysis.result.sentences[$scope.sentenceIndex].deps_json;
            $scope.visualize();
        }
    };

    $scope.back = function () {
      $window.history.back();
    };

    $http.get('api/analysis/' + $stateParams.id)
    .success(function (data) {
      $scope.analysis = data;
      var blob = new Blob([JSON.stringify(data.result)], {type: 'text/plain'});
      var url = $window.URL || $window.webkitURL;
      
      /* 
       * When data for an analysis is successfully otained, 
       * first render the default JSON view, then it's 
       * cooresponding visualization(s)
      */
      $scope.fileUrl = url.createObjectURL(blob);
      $scope.defaultView();
      $scope.visualize();

    });

    $http.get('api/corpora')
    .success(function (data) {
      $scope.corpora = data;
    });

    $scope.delete = function () {
      $http.delete('api/analysis/' + $stateParams.id)
      .success(function (data) {
        $state.go('linguine.analysis.index')
      })
      .error(function (data) {
        flash.danger.setMessage("An error occured.");
      })
    };

    $scope.confirmDelete = function() {
        if($window.confirm("Are you sure you want to delete this analysis?"))
        {
            $scope.delete();
        }
    };
      
    $scope.findCorpus = function (id) {
      return _.find($scope.corpora, {'_id': id});
    };

    $scope.joinTokens = function(tokens) {
      var tokenString = '';
      var tokenStringLength = tokens.length < 20? tokens.length : 20;

      for(var i = 0; i < tokenStringLength; i++) {
        tokenString += ' ' + tokens[i].token;     
      }

      tokenString += tokens.length >= 20? '...' : '';
      return tokenString;
    }

    $scope.showTimeCreated = function(analysis) {
      var d = new Date(analysis.time_created); 
      return d.toLocaleDateString() + " " + d.toLocaleTimeString()
    };

    /*Renders the 'default' JSON viewer with the result of a given
     * analysis that is bound to scope. This function will truncate 
     * analysis data depending on the 'analysis' that is performed
     */
    $scope.defaultView = function() {
      if($scope.analysis.analysis.includes('splat')) {
        $scope.results = JSON.parse(truncateSplatResponse($scope.analysis.result));
      }

      else {
        $scope.results = angular.copy($scope.analysis.result);
          
        $scope.sentenceData = $scope.analysis.result.sentences[$scope.sentenceIndex];
        $scope.sentimentTreeData = $scope.analysis.result.sentences[$scope.sentenceIndex].sentiment_json;
        $scope.depsTreeData = $scope.analysis.result.sentences[$scope.sentenceIndex].deps_json;

        for(var i = 0; i < $scope.results.length; i++) {
          $scope.results[i].deps_json = []; 
          $scope.results[i].sentiment_json = []; 
        }
      }

      // create the editor
      var container = document.getElementById("jsoneditor");
      var editor = new JSONEditor(container);
      editor.set($scope.results);

      //The JSON viewer 'expand all' operation is too intensive on large analyses
      var expandBtn = document.getElementsByClassName('expand-all')[0];
      expandBtn.parentNode.removeChild(expandBtn);

    };

    function truncateSplatResponse(jsonData) {
      console.log('Heres some data', jsonData);
      return jsonData;
    }

    $scope.getText = function(id)
    {
       var temp = {};
       var defer = $q.defer();
       $http.get('api/corpora/' + id).success(function(data){
          temp = data.contents;
          defer.resolve(data.contents);

       });
       return defer.promise;
    };
    $scope.visualizeTfidf = function() {
      var diameter = 100,
        format = d3.format(".3"),
          color = d3.scale.category20c()
          shift = 0.1;

          var bubble = d3.layout.pack().sort(null).size([diameter, diameter]).padding(1.5),
            svg = d3.select("#graph").append("svg").attr("class", "bubble").attr("viewBox", "0 0 100 100");

            var node = svg.selectAll(".node")
            .data(bubble.nodes(classes())
                  .filter(function(d) { return !d.children; }))
                  .enter().append("g")
                  .attr("class", "node")
                  .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

                  node.append("title")
                  .text(function(d) { return d.className + ": " + format(d.value - shift); });

                  node.append("circle")
                  .attr("r", function(d) { return d.r; })
                  // Should really do this:
                  // .style("fill", function(d) { return color(d.packageName); });
                  .style("fill", "#F36E21");

                  node.append("text")
                  .attr("dy", ".3em")
                  .style("text-anchor", "middle")
                  .attr("fill", "white")
                  .attr("font-size", function (d) {
                    return ((0.2 * d.className.length) + (0.5 * d.r)) + "px";
                  })
                  .text(function(d) { return d.className; });

                  // Returns a flattened hierarchy containing all leaf nodes under the root.
                  function classes() {
                    var classes = [];
                    $scope.analysis.result.sentences.forEach(function (node) {
                      var scalar;
                      scalar = Math.log(Math.abs(node.importance))*-1;

                      classes.push({packageName: "", className: node.term, value: scalar + shift});
                    });
                    return {children: classes};
                  }

                  d3.select(self.frameElement).style("height", diameter + "px");
    };

    $scope.visualizeWordcloud = function() {

        // parses the list of words from the analysis results
        function getWords() {
            var count = 0;
            var classes = [];
            $scope.analysis.result.sentences.forEach(function (node) {

                classes.push({text: node.term, frequency: node.frequency});
                count++;
            });
            return {children: classes};
        }

        /* Initialize tooltip */

        var fill = d3.scale.category20(); // color scheme for words
        var words = getWords().children;

        // setup for the word cloud
        d3.layout.cloud().size([1000, 600])// width, height
            .words(words)
            .rotate(function() {
                return (~~(Math.random() * 6) - 3) * 30;
            })
            .font("Impact")
            .fontSize(function(d) {
                return 8* Math.sqrt(d.frequency);
            })
            .on("end", draw)
            .start();


        // draw the word cloud out
        function draw(words) {
            var cloud = d3.select("#graph").style('overflow', 'scroll').style('width', '1140px').style('height', '600px')
                        .append("svg")
                        .attr("class", "cloud")
                        .attr("viewBox", "0 0 500 400")
                        .attr("width", '110%')
                        .attr("height", '130%')
                        .append("g")
                        .attr("transform", "translate(150,150)")
                        // individual text
                        .selectAll("text")
                        .data(words)
                        .enter().append("text")
                        .attr("class", "word")
                        .style("font-size", function(d) {
                            return d.size + "px";
                        })
                        .style("font-family", "Impact")
                        .style("fill", function(d, i) {
                            return fill(i);
                        })
                        .attr("text-anchor", "middle")
                        .attr("transform", function(d) {
                            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                        })
                        .text(function(d) {
                            return d.text;
                        })
                        //append a tooltip
                        .append("title")
                        .text(function(d) { return d.text + ": " + d.frequency; })

          d3.select(self.frameElement).style("height", 50 + "px");
        }
    };

    $scope.visualizeParseTree = function(isSentimentAnalysis) {

      d3.select(".svg-container").remove();
        
        var dataToConvert = angular.copy(isSentimentAnalysis ? $scope.sentimentTreeData : $scope.depsTreeData);

        data = convertData(dataToConvert);
        renderTree();

        //Converts results from flat to hierarchical
        function convertData(words) {
 
            var rootNode = { 'id': 0, 'value': 'root', 'pos': 'root' };
            words.push(rootNode);
    
            var dataMap = words.reduce(function(map, node) {
                map[node.id] = node;
                return map;
            }, {});
    
            var treeData = [];
            words.forEach(function(node) {
    
                var head = dataMap[node.head];
       
                if (head)
                    (head.children || (head.children = [])).push(node);
                else
                    treeData.push(node);
            });
    
            return treeData;
        }

        //Builds canvas and creates root
        function renderTree() {
            var tree = d3.layout.tree().nodeSize([50, 50]);
    
            tree.separation(function (a, b) {
                var w1 = a.value.length;
                var w2 = b.value.length;
    
                var scale = 0.13;
    
                return Math.ceil((w1 * scale) + (w2 * scale) / 2);
            });

            /*
                 The #graph (or #sentgraph) div is acting as a container for the .svg-container div (which holds the tree).
                 To make it scrollable, 2 things that must happen:
                   1. the #graph div must have overflow set to scroll
                   2. the svg-container div must have width & height greater than the width & height of #graph
                 Note: right now the width/height percentages are arbitrary and I need to figure out a better way
            */

            var svg = d3.select("#graph").style('overflow', 'scroll').style('width', '  width:1140px').style('height', '1200px')
              .append('svg')
              .attr('class', 'svg-container')
              .style('width', '200%')
              .style('height', '150%');

            var canvas = svg.append('g')
              .attr('class', 'canvas');
    
            canvas.append('g')
              .attr('transform', 'translate(500 , 10) scale(.75)');
    
            var root = data[0];
    
            update(root, tree, svg);
    
            return this;
        }

        //Draws the tree from the root
        function update(source, tree, svg) {
    
            var diagonal = d3.svg.diagonal()
              .projection(function (d) {
                return [d.x, d.y];
              });
    
            var nodes = tree(source).reverse(),
              links = tree.links(nodes);
    
            nodes.forEach(function (d) {
              d.y = d.depth * 100;
            });
    
            var node = svg.select('.canvas g')
              .selectAll('g.node')
              .data(nodes, function (d, i) {
                  return d.id || (d.id = ++i);
              });
    
            var nodeEnter = node.enter()
              .append('g')
              .attr('class', 'node')
              .attr('transform', function (d) {
                  return 'translate(' + source.x + ', ' + source.y + ')';
              });
    
            nodeEnter.append('circle')
              .attr('r', 10)
              .style('stroke', '#000')
              .style('stroke-width', '3px')
              .style('fill', '#FFF');
    
            nodeEnter.append('text')
              .attr('y', function (d, i) {
                return (d.pos == 'root') ? -30 : 15;
              })
              .attr('dy', '14px')
              .attr('text-anchor', 'middle')
              .text(function (d) {
                  return d.value;
               })
              .style('fill', function (d, i) {
                  return (d.pos == 'root') ? '#CCC' : '#333';
              })
              .style('font-size', '18px')
              .style('fill-opacity', 1);
            if(!isSentimentAnalysis){
            nodeEnter.append('text')
              .attr('y', function (d, i) {
                  return (d.pos == 'root') ? 0 : -30;
              })
              .attr('dy', '12px')
              .attr('text-anchor', 'middle')
              .attr('class', 'label')
              .style('font-size', '12px')
              .style('font-weight', 500)
              .style('fill', '#666')
              .text(function (d) {
                  return d.tag;
              });
            }else{
                nodeEnter.append('text')
              .attr('y', function (d, i) {
                  return (d.pos == 'root') ? 0 : -30;
              })
              .attr('dy', '12px')
              .attr('text-anchor', 'middle')
              .attr('class', 'label')
              .style('font-size', '35px')
              .style('font-weight', 500)
              .style('fill', '#666')
              .text(function (d) {
                  switch(d.tag){
                    case 0:
                      return "- -";
                    case 1:
                      return "-";
                    case 3:
                      return "+";
                    case 4:
                      return "+ +";
                    default:
                      return "";
                  };
              });
            }
    
            var nodeUpdate = node.transition()
              .duration(500)
              .attr('transform', function (d) {
                  return 'translate(' + d.x + ', ' + d.y + ')';
              });
    
            var link = svg.select('.canvas g')
              .selectAll('path.link')
              .data(links, function (d) {
                return d.target.id;
              });
    
            link.enter()
              .insert('path', 'g')
              .attr('class', 'link')
              .style('stroke', '#CCC')
              .style('stroke-width', '2px')
              .style('fill', 'none')
              .attr('d', function (d) {
                  var o = {
                      x: source.x,
                      y: source.y
                  };
    
                  return diagonal({
                      source: o,
                      target: o
                  });
              });
    
            link.transition()
              .duration(500)
              .attr('d', diagonal);
    
            nodes.forEach(function (d, i) {
              d.x0 = d.x;
              d.y0 = d.y;
            });
        }
    };

    $scope.visualizeSentimentText = function()
    {
        // clear any existing text & sentiment data when dropdown is changed
        d3.select(".sentiment-text").remove();
        d3.select(".VeryNegative").remove();
        d3.select(".Negative").remove();
        d3.select(".Neutral").remove();
        d3.select(".Positive").remove();
        d3.select(".VeryPositive").remove();

        // get the selected sentence & update the visual. Default sentence is index 0 of result
        var results = $scope.sentenceData;
        updateSentence(results);

        function updateSentence(results)
        {
            var sentDiv = document.getElementById("senttext");
            if(sentDiv != null)
            {
                var textNode =  document.createElement('div');
                textNode.setAttribute("class", "sentiment-text");
                var tokens = [];
                results.tokens.forEach(function(word){
                    tokens.push(word);
                });
                var sentimentTitle = document.createElement('span');
                sentimentTitle.setAttribute("title", results.parse);
                sentimentTitle.innerHTML = "Sentence Sentiment: " + results.sentiment + "<br />";

                if(results.sentiment == "Very negative")
                {
                    sentimentTitle.setAttribute("class", "VeryNegative");
                }
                else if(results.sentiment == "Very positive")
                {
                    sentimentTitle.setAttribute("class", "VeryPositive");
                }
                else
                {
                    sentimentTitle.setAttribute("class", results.sentiment);
                }

                tokens.forEach(function(word){
                    var wordspace = document.createElement('span');
                    wordspace.setAttribute("title", word.token + "- Sentiment: " + word.sentiment + ", Value: " + word.sentimentValue);
                    wordspace.innerHTML += word.token + " ";
                    textNode.appendChild(wordspace);
                });
                sentDiv.appendChild(sentimentTitle);
                sentDiv.appendChild( textNode );
            }
        }
    };

  $scope.visualizeNER = function() {
    $scope.renderPlainText('ner');
  }

  $scope.renderPlainText = function(type) {
			var canvas = document.getElementById('plaintext-canvas');
   		if(canvas){canvas.remove(); }

      // Create a new div under the #graph div
      var textDiv = document.getElementById("graph");
      var textNode =  document.createElement('div');
      textNode.setAttribute("class", "ner-text");
      textNode.setAttribute("id", "plaintext-canvas");

      var tokens = {};
      $scope.analysis.result.sentences.forEach(function(obj, sentenceIndex){
					tokens[sentenceIndex] = {}; 
          obj.tokens.forEach(function(word, tokenIndex){
					  tokens[sentenceIndex][tokenIndex] = word;
          })
      });

      Object.keys(tokens).forEach(function(sk){
				 Object.keys(tokens[sk]).forEach(function(wk) {
					 var corefCount = 0;
					 var word = tokens[sk][wk];
					 var wordspace = document.createElement('span');

					 if(type == 'ner') { wordspace.setAttribute("title", word.token + ": " + word.ner); }
					 wordspace.innerHTML += word.token + " ";

					 if(type == 'ner' && word.ner !== "O")
					 {
							 wordspace.style.fontWeight = 'bold';
							 wordspace.setAttribute("class", word.ner.toLowerCase());
           }

           if(type == 'relation') {
             var relationTitle = '';

             $scope.analysis.result.sentences[sk].relations.forEach(function(relation) {
               var startInd = relation.subject.start;
               var endInd = relation.object.end - 1;
               
               if(wk >= startInd && wk <= endInd) {
                 wordspace.style.fontWeight = 'bold';
                 wordspace.style.textDecoration = 'underline';

                 var relationTriple = relation.subject.lemma + ' (' + relation.relation.lemma + ') ' + relation.object.lemma;
                 relationTitle += relationTriple + '\n'; 
               }
             });

             wordspace.setAttribute('title', relationTitle);
           }

					 if(type == 'coref' && 
					 $scope.selectedEntity.sentence == sk &&
			     wk >= $scope.selectedEntity.startInd && 
					 wk <= $scope.selectedEntity.endInd) {
							 wordspace.style.fontWeight = 'bold';
					 		 wordspace.setAttribute("title", word.token + ": " + JSON.stringify($scope.analysis.result.entities[sk].mentions[corefCount], null, 2));
							 wordspace.setAttribute("class", 'organization');
							 corefCount++;
					 }

						textNode.appendChild(wordspace);
			    });
      });
      textDiv.appendChild( textNode );
  }

  $scope.visualizeCoref = function() {
    var sentences = $scope.analysis.result.sentences;
    $scope.analysis.result.entities.forEach(function(entity) {
      entity.mentions.forEach(function(mention) {

        //Grab every token that has been mentioned by a given entity 
        var tokenString = sentences[mention.sentence]
        .tokens.slice(mention.tokspan_in_sentence[0], mention.tokspan_in_sentence[1] + 1);

        //Grab the text from every token and append together
        //to populate the dropdwn list
        var tokenText = tokenString.reduce(function(prev, cur) {
          return prev.token? prev.token + ' ' + cur.token : prev + ' ' + cur.token;
        });

        $scope.corefEntities.push({
				  'text': tokenText,
					'sentence': mention.sentence, 
					'startInd': mention.tokspan_in_sentence[0],
					'endInd': mention.tokspan_in_sentence[1]
				});

      });
    });

    $scope.selectedEntity = $scope.corefEntities[0];

    //Render text in document to highlight with entities
    $scope.renderPlainText('coref');
  }

  $scope.setEntity = function(index) {
		$scope.selectedEntity = $scope.corefEntities[index];
		$scope.renderPlainText('coref');
  }

  $scope.visualizeRelation = function() {
    $scope.renderPlainText('relation');
  }

  function sortObjectByKey(obj) {
    var keys = Object.keys(obj);
    var sorted_obj = [];

    // Sort keys
    keys.sort();

    // Create new array based on Sorted Keys
    for(var i = 0; i < keys.length; i++) {
      k = keys[i];
      sorted_obj.push({'key': k, 'val': obj[k]});
    }
    return sorted_obj;
  }

  function visualizeSplatSyllables() {
    console.log('syllables');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:"Lucida Console", Monaco, monospace;font-size:20px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:"Lucida Console", Monaco, monospace;font-size:15px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-yw4l{vertical-align:top}';
    var table = '<table class=' + style + '" style="table-layout: fixed !important;">';
    table += '<tr style="border-bottom: 1px solid black;"><th class="tg-031e" style="white-space: nowrap !important;">Syllable count</th><th class="tg-yw4l">&nbsp;&nbsp;&nbsp;&nbsp;</th><th class="tg-031e">Word types (capitalization maintained)</th></tr>';
    for(var item in $scope.results[0]["syllables"]) {
      table += '<tr style="border-bottom: 1px solid black;"><td class="tg-031e" style="color: red !important; text-align: center;"><b>' + item + '</b></td><td class="tg-yw4l">&nbsp;&nbsp;&nbsp;&nbsp;</td><td class="tg-031e"><b>' + $scope.results[0]["syllables"][item].join(" ").match(/[\s\S]{1,300}/g).join("<br>") + '</b></td></tr>';
    }
    table += '</table>';
    document.getElementById('graph').innerHTML = '<br>' + table
  }

  function visualizeSplatNgrams() {
    console.log('ngrams');
    console.log($scope.results);
    // Start building the tables
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;border:none;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;} .tg .tg-yw4l{vertical-align:top}';
    var super_table = '<div style="width: 100%; font-weight: bold;"><br><table class="' + style + '"><tr><th colspan="3"></th></tr><tr><td valign="top" style="padding: 30px 30px 30px 30px">';
    var u_table = '<table class="' + style + '"><tr style="border-bottom: 1px solid black"><th class="tg-031e" colspan="2">Unigram Frequencies</th></tr>';
    var b_table = '<table class="' + style + '"><tr style="border-bottom: 1px solid black"><th class="tg-031e" colspan="2">Bigram Frequencies</th></tr>';
    var t_table = '<table class="' + style + '"><tr style="border-bottom: 1px solid black"><th class="tg-031e" colspan="2">Trigram Frequencies</th></tr>';

    // New variables for less typing
    var unigram_freqs = sortObjectByKey($scope.results[0]['unigrams']);
    var bigram_freqs = sortObjectByKey($scope.results[0]['bigrams']);
    var trigram_freqs = sortObjectByKey($scope.results[0]['trigrams']);

    // Build unigram table
    for(var i = 0; i < unigram_freqs.length; i++) {
      u_table += '<tr><td class="tg-031e" style="color: red;">' + unigram_freqs[i].val + '&nbsp;&nbsp;</td><td class="tg-031e">' + unigram_freqs[i].key.replace(/(\s+sl\s+|^(sl)$)/i, "{sl}") + '</td></tr>';
    }
    u_table += '</table>';
    // Build bigram table
    for(var i = 0; i < bigram_freqs.length; i++) {
      b_table += '<tr><td class="tg-031e" style="color: red;">' + bigram_freqs[i].val + '&nbsp;&nbsp;&nbsp;&nbsp;</td><td class="tg-031e">' + bigram_freqs[i].key.replace(/(\s+sl\s+|^(sl)$|^(sl)|(sl)$)/i, " {sl} ") + '</td></tr>';
    }
    b_table += '</table>';
    // Build trigram table
    for(var i = 0; i < trigram_freqs.length; i++) {
      t_table += '<tr><td class="tg-031e" style="color: red;">' + trigram_freqs[i].val + '&nbsp;&nbsp;&nbsp;&nbsp;</td><td class="tg-031e">' + trigram_freqs[i].key.replace(/(\s+sl\s+|^(sl)$|^(sl)|(sl)$)/i, " {sl} ") + '</td></tr>';
    }
    t_table += '</table>';
    // Build and display super table
    super_table += u_table + '</td><td valign="top" style="padding: 30px 30px 30px 30px">' + b_table + '</td><td valign="top" style="padding: 30px 30px 30px 30px">' + t_table + '</td></tr></table></div><br>';
    document.getElementById('graph').innerHTML = '<span style="font-size: 20px;">' + super_table + '</span>';
  }

  function visualizeSplatPOSFrequencies() {
    console.log('pos_counts');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-yw4l{vertical-align:top}';
    var table = '<table class=' + style + '">';
    table += '<tr style="border-bottom: 1pt solid black;"><th class="tg-031e" style="text-align: center;">Tag</th><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th><th class="tg-031e" style="text-align: center;">Frequency</th><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th><th class="tg-yw4l">Word types (capitalization maintained)</th></tr>';
    for(var item in $scope.results[0]['pos_tags']) {
      table += '<tr style="border-bottom: 1pt solid black;"><td style="color: darkgreen; text-align: center;"><b>' + item + '</b></td><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td style="color: red; text-align: center;"><b>' + $scope.results[0]["pos_counts"][item] + '</b></td><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td><b>' + $scope.results[0]["pos_tags"][item].join("\t").match(/[\s\S]{1,300}/g).join("<br>") + '</b></td></tr>';
    }
    table += '</table>';
    var info = '<br><div style="text-align: left;"><b><a href="https://www.ling.upenn.edu/courses/Fall_2003/ling001/penn_treebank_pos.html" target="_blank">Click here</a> to see an explanation of the tags listed below. <em>SBAR</em> is used to denote unexpected syntactic structures. <em>PRN</em> is used to denote a parenthesized structure.</b></div>';
    document.getElementById('graph').innerHTML = info + '<br>' + table;
  }

  function visualizeSplatComplexity() {
    console.log('complexity');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-j2zy{background-color:#FCFBE3;vertical-align:top} .tg .tg-yw4l{vertical-align:top}';
    var table = '<br><table class=' + style + '">';
    table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Complexity Metric</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Value</th></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" title="Content density is the ratio of open-class words (nouns, verbs, adjectives, adverbs) to closed-class words (pronouns, determiners, etc.)." style="color: darkgreen !important;"><b>Content Density:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["content_density"]).toFixed(3) + '</td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" title="Idea density is the number of expressed prepositions (as, at, by, in, for, etc.) divided by the number of words." style="color: darkgreen !important;"><b>Idea Density:</b><a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["idea_density"]).toFixed(3) + '</td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Flesch-Kincaid_readability_tests#Flesch_reading_ease" target="_blank" title="Scores typically range from least complex (120) to most complex (0), but negative scores (extremely complex) are also possible." style="color: darkgreen !important;"><b>Flesch Readability:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["flesch_score"]).toFixed(3) + '</td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Flesch-Kincaid_readability_tests#Flesch-Kincaid_grade_level" target="_blank" title="In theory, the lowest possible score (lowest grade level) is -3.4. In theory, there is no upper bound." style="color:darkgreen !important;"><b>Flesch-Kincaid Score:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["kincaid_score"]).toFixed(3) + '</td></tr>';
    table += '</table>';
    document.getElementById('graph').innerHTML = table;
  }

  function visualizeSplatDisfluency() {
    console.log('disfluency');
    console.log($scope.results);
    var final_text = ""
    // For each sentence in the text...
    var num = 0;
    var rep_count = 0;
    for(var sent in $scope.results[0]["sentences"]) {
      var temp_sent = '';
      var split_sent = sent.split(" ");
      // For each word in the current sentence...
      while(num < split_sent.length) {
        word = split_sent[num];
        // If there are repeated words, suround them in square brackets and color them to match the colors above.
        if( (num+1 < split_sent.length) && (word.toLowerCase() == split_sent[num+1].toLowerCase()) ) {
          rep_count++;
          temp_sent += '<b style="color: limegreen;"> [ </b> ';
          if(word.toLowerCase() == "um") { temp_sent += '<b style="color: red;">' + word + ' ' + word + ' </b>'; }
          else if(word.toLowerCase() == "uh") { temp_sent += '<b style="color: orangered;">' + word + ' ' + word + ' </b>'; }
          else if(word.toLowerCase() == "ah") { temp_sent += '<b style="color: blue;">' + word + ' ' + word + ' </b>'; }
          else if(word.toLowerCase() == "er") { temp_sent += '<b style="color: dodgerblue;">' + word + ' ' + word + ' </b>'; }
          else if(word.toLowerCase() == "hm") { temp_sent += '<b style="color: maroon;">' + word + ' ' + word + ' </b>'; }
          else if(word.toLowerCase() == "{sl}") { temp_sent += '<b style="color: purple;">' + word + ' ' + word + ' </b>'; }
          else if(word.slice(-1) == "-") { temp_sent += '<b style="color: darkgreen;">' + word + ' ' + word + ' </b>'; }
          else { temp_sent += word + ' ' + word; }
          temp_sent += '<b style="color: limegreen;"> ] </b>';
          num++;
        }
        // If there are no repeated words, color them to match the colors above.
        else if(word.toLowerCase() == "um") { temp_sent += '<b style="color: red;">' + word + ' </b>'; }
        else if(word.toLowerCase() == "uh") { temp_sent += '<b style="color: orangered;">' + word + ' </b>'; }
        else if(word.toLowerCase() == "ah") { temp_sent += '<b style="color: blue;">' + word + ' </b>'; }
        else if(word.toLowerCase() == "er") { temp_sent += '<b style="color: dodgerblue;">' + word + ' </b>'; }
        else if(word.toLowerCase() == "hm") { temp_sent += '<b style="color: maroon;">' + word + ' </b>'; }
        else if(word.toLowerCase() == "{sl}") { temp_sent += '<b style="color: purple;">' + word + ' </b>'; }
        else if(word.slice(-1) == "-") { temp_sent += '<b style="color: darkgreen;">' + word + ' </b>'; }
        else { temp_sent += word + ' '; }
        num++;
      }
      num = 0;
      final_text += temp_sent + '<br>';
    }

    // Colorcode the eight different disfluency types and put them in a table with their frequencies.
    var display_text = '<div style="width: 100%;"><br><table style="width: 100%;"><tr><td colspan="8" align="left">';
    display_text += '<b style="color: black;">Average Disfluencies per Sentence: ' + $scope.results[0]["average_disfluencies_per_sentence"] + '</b></td></tr><tr><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: red;">UM: ' + $scope.results[0]["total_disfluencies"]["UM"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: orangered;">UH: ' + $scope.results[0]["total_disfluencies"]["UH"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: blue;">AH: ' + $scope.results[0]["total_disfluencies"]["AH"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: dodgerblue;">ER: ' + $scope.results[0]["total_disfluencies"]["ER"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: maroon;">HM: ' + $scope.results[0]["total_disfluencies"]["HM"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: purple;">SILENT PAUSES: ' + $scope.results[0]["total_disfluencies"]["SILENT PAUSE"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: darkgreen;">BREAKS: ' + $scope.results[0]["total_disfluencies"]["BREAK"] + '</b></td><td align="center" style="width: auto; position: relative;">';
    display_text += '<b style="color: limegreen;">REPETITIONS: ' + rep_count + '</b></td></tr></table></div><br>';

    // Display the visualization.
    document.getElementById("graph").innerHTML = '<span style="font-size: 20px;"' + display_text + final_text + '</span>';
  }

  $scope.visualize = function(){
      switch($scope.analysis.analysis) {
        case "tfidf":
          $scope.visualizeTfidf();
          break;
        case "wordcloudop":
          $scope.visualizeWordcloud();
          break;
        case "nlp-pos":
          $scope.visualizeParseTree(false);
          break;
        case "nlp-sentiment":
          $scope.visualizeParseTree(true);
          $scope.visualizeSentimentText();
          break;
        case "nlp-ner":
          $scope.visualizeNER($scope.text);
          break;
        case "nlp-coref":
          $scope.visualizeCoref();
          break;
        case "nlp-relation":
          $scope.visualizeRelation();
          break;
        case "splat-complexity":
          visualizeSplatComplexity();
          break;
        case "splat-disfluency":
          visualizeSplatDisfluency();
          break;
        case "splat-ngrams":
          visualizeSplatNgrams();
          break;
        case "splat-pos":
          visualizeSplatPOSFrequencies();
          break;
        case "splat-syllables":
          visualizeSplatSyllables();
          break;
        default:
          break;
    }
  };
  }
})();
