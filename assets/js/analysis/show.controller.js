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
    $scope.corefEntitiesTable = [];

    $scope.setSentence = function(index) {
        if(index != $scope.sentenceIndex) {
            $scope.sentenceIndex = index;
            $scope.sentenceData = $scope.analysis.result.sentences[$scope.sentenceIndex];
            $scope.treeData = $scope.analysis.result.sentences[$scope.sentenceIndex].tree_json;
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

      console.log($scope.analysis);

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
      if($scope.analysis.analysis.includes('splat') || $scope.analysis.analysis === 'char-ngrams'
        ||  $scope.analysis.analysis === 'length-stats' ||  $scope.analysis.analysis.includes('topic-model')
        ||  $scope.analysis.analysis === 'word-vector' ||  $scope.analysis.analysis === 'unsup-morph'
        ||  $scope.analysis.analysis === 'bigram-array' || $scope.analysis.analysis === 'speech-token-stats') {
        if (typeof $scope.analysis.result == "string") {
          $scope.results = JSON.parse(truncateSplatResponse($scope.analysis.result));
        }
        else if  (typeof $scope.analysis.result == "object") {
          $scope.results = angular.copy($scope.analysis.result);
        }
      }

      else {
        $scope.results = angular.copy($scope.analysis.result);
          
        $scope.sentenceData = $scope.analysis.result.sentences[$scope.sentenceIndex];
        $scope.treeData = $scope.analysis.result.sentences[$scope.sentenceIndex].tree_json;

        for(var i = 0; i < $scope.results.length; i++) {
          $scope.results[i].tree_json = [];
        }
      }

      console.log($scope.results);
      console.log("treeData = ", $scope.treeData);

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
        var layout = d3.layout.cloud().size([1000, 600])// width, height
            .words(words)
            .rotate(function() {
                return (~~(Math.random() * 6) - 3) * 30;
            })
            .font("Impact")
            .fontSize(function(d) {
                return 8* Math.sqrt(d.frequency);
            })
            .on("end", draw);
            layout.start();


        // draw the word cloud out
        function draw(words) {
            var cloud = d3.select("#graph").style('overflow', 'scroll').style('width', '1140px').style('height', '600px')
                        .append("svg")
                        .attr("width", layout.size()[0])
                        .attr("height", layout.size()[1])
                        .append("g")
                        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
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

    $scope.visualizeParseTree = function(sentiment) {

      d3.select(".svg-container").remove();
        console.log( $scope.treeData );
        var dataToConvert = angular.copy($scope.treeData );

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
            if(!sentiment){
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
                    wordspace.setAttribute("title", word.token + ": " + word.sentiment);
                    wordspace.innerHTML += word.token + " ";
                    textNode.appendChild(wordspace);
                });
                sentDiv.appendChild(sentimentTitle);
                sentDiv.appendChild( textNode );
            }
        }
    };

//  $scope.visualizeNER = function() {
//    console.log($scope);
//    $scope.renderPlainText('ner');
//  }
  $scope.visualizeNER = function() {
    var canvas = document.getElementById('plaintext-canvas');
    if(canvas) { canvas.remove(); }

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
             
        wordspace.setAttribute("title", word.token + ": " + word.ner);
        wordspace.innerHTML += word.token + " ";
            
        if(word.ner !== "O") {
          wordspace.style.fontWeight = 'bold';
          wordspace.setAttribute("class", word.ner.toLowerCase());
        }
        textNode.appendChild(wordspace);
      })
    })
    textDiv.appendChild( textNode );
  }

  $scope.renderPlainText = function(type) {
    var canvas = document.getElementById('plaintext-canvas');
    if(canvas){canvas.remove(); }

    // Create a new div under the #graph div
    var sentDiv = document.getElementById("senttext");
    var textDiv = document.getElementById("graph");
    var textNode =  document.createElement('div');
    var allCorefNode = document.createElement('div');
    textNode.setAttribute("class", "ner-text");
    textNode.setAttribute("id", "plaintext-canvas");
    allCorefNode.setAttribute("class", "ner-text");
    allCorefNode.setAttribute("id", "plaintext-canvas");
    var corefText = document.createElement('div');
    var allCorefText = document.createElement('div');

    var tokens = {};
    $scope.analysis.result.sentences.forEach(function(obj, sentenceIndex){
      tokens[sentenceIndex] = {};
      obj.tokens.forEach(function(word, tokenIndex){ tokens[sentenceIndex][tokenIndex] = word; })
    });

    Object.keys(tokens).forEach(function(sk) {
      var wordcount = 0;
    	Object.keys(tokens[sk]).forEach(function(wk) {
	      var corefCount = 0;
    	  var word = tokens[sk][wk];
	      var wordspace = document.createElement('span');

    	  if(type == 'ner') {
          wordspace.setAttribute("title", word.token + ": " + word.ner);
          console.log(type);
        }
        //wordspace.innerHTML += word.token;

        if(wordcount < tokens[sk].length) {
          wordspace.innerHTML += (tokens[sk][wk+1].indexOf('.') == -1 || tokens[sk][wk+1].indexOf(',') == -1)? word.token + ' ' : word.token;
        }
        else {
          wordspace.innerHTML += word.token + ' ';
        }

	      if(type == 'ner' && word.ner !== "O") {
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

        if(type == 'coref') {
          var removeSpaces = function(parent) {
            // This is insanely verbose, but it removes spaces before punctuation in the coreference visualization.
            var spanElements = parent.getElementsByTagName('span');
            for(var s = 1; s < spanElements.length; s++) {
              var prev = spanElements[s-1];
              var curr = spanElements[s];
              if(curr.innerHTML.indexOf('.') != -1) { prev.innerHTML = prev.innerHTML.replace(/\s+$/g, ''); }
              else if(curr.innerHTML.indexOf(',') != -1) { prev.innerHTML = prev.innerHTML.replace(/\s+$/g, ''); }
              else if(curr.innerHTML.indexOf('!') != -1) { prev.innerHTML = prev.innerHTML.replace(/\s+$/g, ''); }
              else if(curr.innerHTML.indexOf('?') != -1) { prev.innerHTML = prev.innerHTML.replace(/\s+$/g, ''); }
            }
          };

          if($scope.selectedEntity.id == 0) {
            $scope.corefEntitiesTable.forEach( function(chain) {
              chain.entities.forEach( function(entity) {
                var mentionCount = 0;
                if (entity.entityID != 0) {
                  if (entity.sentence == sk && wk >= entity.startInd && wk < entity.endInd) {
                    //wordspace.style.backgroundColor = entity.color;
                    wordspace.style.fontWeight = 'bold';
                    //wordspace.setAttribute("class", 'organization');
                    wordspace.setAttribute("title", word.token + ": "
                      + JSON.stringify($scope.analysis.result.entities[sk].mentions[mentionCount], null, 2));
                    mentionCount++;
                    corefCount++;

                    if (wk == entity.startInd) {
                      wordspace.innerHTML = ' [ ' + wordspace.innerHTML;
                    }

                    if (wk == entity.endInd - 1) {
                      var subscript = document.createElement('span');
                      subscript.setAttribute("class", 'organization');
                      subscript.setAttribute("title", '[' + entity.entityID + '] ' + entity.text);
                      subscript.style.backgroundColor = entity.color;
                      subscript.innerHTML = ' <sub>{' + entity.entityID + '}</sub> ';
                      wordspace.innerHTML = ' ' + wordspace.innerHTML + ']' + subscript.outerHTML;
                    }
                  }
                }
              });
            });

            allCorefText.innerHTML += wordspace.innerHTML;
            allCorefNode.appendChild(wordspace);
            removeSpaces(allCorefNode);
          }
          else {
            $scope.selectedEntity.entities.forEach( function(entity) {
              if(entity.sentence == sk && wk >= entity.startInd && wk < entity.endInd) {
                //console.log($scope.selectedEntity.entityID);
                wordspace.style.fontWeight = 'bold';
                wordspace.setAttribute("title", word.token + ": "
                  + JSON.stringify($scope.analysis.result.entities[sk].mentions[corefCount], null, 2));
                wordspace.setAttribute("class", 'organization');
                wordspace.style.backgroundColor = entity.color;
                corefCount++;
                if(wk == entity.endInd - 1) {
                  wordspace.innerHTML += ' <sub title="' + '[' + entity.entityID + '] ' +
                    entity.text + '">{' + entity.entityID + '}</sub> ';
                }
              }
            });

            corefText.innerHTML += wordspace.innerHTML;
	          textNode.appendChild(wordspace);
	          removeSpaces(textNode);
          }
        }
        //console.log(textNode.getElementsByTagName('span'));
    	});
      wordcount += 1;

      //textDiv.appendChild( allCorefNode );
      //console.log($scope.selectedEntity.entityID);
      //console.log($scope.selectedEntity);
      //console.log($scope.selectedEntity.entityID);
      if (type == 'coref') {
        if($scope.selectedEntity.id == 0) { sentDiv.appendChild( allCorefNode ); }
        else { sentDiv.appendChild( textNode ); }
      } else {
        if($scope.selectedEntity.entityID == 0) { textDiv.appendChild( allCorefNode ); }
        else { textDiv.appendChild( textNode ); }
      }
      //textDiv.appendChild( allCorefNode );
      //allCorefText.appendChild( textNode );
      //console.log(textDiv);
      //console.log(corefText.innerHTML);
    });
  };

  var randColor = (function() {
    var golden_ratio_conjugate = 0.618033988749895; // 2 / (1 + sqrt(5))
    var h = Math.random();
    var hslToRgb = function (h, s, l) {
      var r, g, b;
      if(s == 0) { r = g = b = l; }
      else {
        function hue2rgb(p, q, t) {
          if(t < 0) { t += 1; }
          if(t > 1) { t -= 1; }
          if(t < 1/6) { return p + (q - p) * 6 * t; }
          if(t < 1/2) { return q; }
          if(t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
          return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return '#'+Math.round(r * 255).toString(16)+Math.round(g * 255).toString(16)+Math.round(b * 255).toString(16);
    };
    return function(){
      h += golden_ratio_conjugate;
      h %= 1;
      return hslToRgb(h, 0.5, 0.60);
    };
  })();

  var getColor = function(num) {
      // List from https://sashat.me/2017/01/11/list-of-20-simple-distinct-colors/
      distinct_colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
        '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#808080']
       if (num <= distinct_colors.length)
       {
         return distinct_colors[num - 1];
       } else {return randColor();}
  };

  $scope.visualizeCoref = function() {
    var sentences = $scope.analysis.result.sentences;
    var entityCount = 0;
    // For each entity...
    $scope.corefEntities.push({'text': "ALL", 'entityID': 0, 'sentence': 9999, 'startInd': 9999, 'endInd': 9999, 'color': 999999});
    $scope.analysis.result.entities.forEach(function(entity) {
      var color = getColor(entity.entityid);
      // For each mention...
      entity.mentions.forEach(function(mention) {

        //Grab every token that has been mentioned by a given entity
        var tokenString = sentences[mention.sentence].tokens.slice(mention.tokspan_in_sentence[0], mention.tokspan_in_sentence[1]);

        //Grab the text from every token and append together to populate the dropdown list
        if (tokenString.length === 1)
        {
          var tokenText = tokenString[0].token;
        } else {
          var tokenText = tokenString.reduce(function (prev, cur) {
            return prev.token ? prev.token + ' ' + cur.token : prev + ' ' + cur.token;
          });
        }

        arrayTokenText = tokenText.replace(/\s+([.,!?;;])/g, '$1').split(" ");
        if(arrayTokenText.length == -1) {
           tokenText = arrayTokenText.slice(0, -1).join(" ");
        }
        else {
           tokenText = arrayTokenText.join(" ");
        }

        $scope.corefEntities.push({'text': tokenText,
                                   'entityID': entityCount+1,
		                   'sentence': mention.sentence,
		                   'startInd': mention.tokspan_in_sentence[0],
		                   'endInd': mention.tokspan_in_sentence[1],
                                   'color': color});
      });
      //$scope.corefEntities.push({'text': entityText, 'entityID': entityCount, 'mentions': mentions});
      //console.log(entityText);
      //console.log($scope.corefEntities);
      entityCount++;
    });

    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-yw4l{vertical-align:top}';
    var table = '<table class=' + style + '">';
    table += '<tr style="border-bottom: 1pt solid black;"><th class="tg-031e" style="text-align: center;">ID</th><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th><th class="tg-yw4l">Text</th></tr>';

    $scope.corefEntities.forEach(function(item) {
      if ($scope.corefEntitiesTable[item.entityID] == undefined)
      {
        $scope.corefEntitiesTable[item.entityID] = {'color' : item.color,
        'text' : [], 'entities' : [], 'id' : item.entityID};
      }
      $scope.corefEntitiesTable[item.entityID].text.push(item.text);
      $scope.corefEntitiesTable[item.entityID].entities.push(item);
    });
    $scope.selectedEntity = $scope.corefEntitiesTable[0];

    for (var i in $scope.corefEntitiesTable){
      table += '<tr style="border-bottom: 1pt solid black;"><td style="background-color: black;color: ' + $scope.corefEntitiesTable[i].color + '; text-align: center;"><b>' + i + '</b></td>';
      table += '<td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td><b>' + $scope.corefEntitiesTable[i].text.join("<br>") + '</b></td></tr>';
    }
    table += '</table>';
    document.getElementById('graph').innerHTML += table;

    //Render text in document to highlight with entities
    $scope.renderPlainText('coref');
  }

  $scope.setEntity = function(index) {
    $scope.selectedEntity = $scope.corefEntitiesTable[index];
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
    var helptext = '<div><b>These syllable counts are <em>estimates</em>. They are calculated using the Carnegie Mellon Pronouncing Dictionary (<a href="http://www.speech.cs.cmu.edu/cgi-bin/cmudict" target="_blank">cmudict</a>). Words that are not contained in the cmudict are assigned the syllable count of the <em><a href="https://docs.python.org/3/library/difflib.html#difflib.SequenceMatcher" target="_blank">closest</a></em> word that is in the cmudict.</b></div>'
    document.getElementById('graph').innerHTML = '<br>' + helptext + '<br>' + table
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
      b_table += '<tr><td class="tg-031e" style="color: red;">' + bigram_freqs[i].val + '&nbsp;&nbsp;&nbsp;&nbsp;</td><td class="tg-031e">' + bigram_freqs[i].key.replace(/(\s+sl\s+|^(sl)$|^(sl\s+)|(sl\s+)$)/i, " {sl} ") + '</td></tr>';
    }
    b_table += '</table>';
    // Build trigram table
    for(var i = 0; i < trigram_freqs.length; i++) {
      t_table += '<tr><td class="tg-031e" style="color: red;">' + trigram_freqs[i].val + '&nbsp;&nbsp;&nbsp;&nbsp;</td><td class="tg-031e">' + trigram_freqs[i].key.replace(/(\s+sl\s+|^(sl)$|^(sl\s+)|(sl\s+)$)/i, " {sl} ") + '</td></tr>';
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
    var info = '<br><div style="text-align: left;"><b><a href="http://www.clips.ua.ac.be/pages/mbsp-tags" target="_blank">Click here</a> to see an explanation of the tags listed below. These descriptions have also been copied here (the second table) for your convenience.</div>';
    var helptable = '<br><table style="font-weight:bold;"><tbody><tr style="border-bottom:1px solid black;"><th>Tag</th><th>Description</th><th>Example</th></tr><tr style="border-bottom:1px solid black;"><td>CC</td><td>conjunction, coordinating</td><td><em>and, or, but</em></td></tr><tr style="border-bottom:1px solid black;"><td>CD</td><td>cardinal number</td><td><em>five, three, 13%</em></td></tr><tr style="border-bottom:1px solid black;"><td>DT</td><td>determiner</td><td><em>the, a, these</em></td></tr><tr style="border-bottom:1px solid black;"><td>EX</td><td>existential there</td><td><em><span style="text-decoration: underline;">there</span> were six boys</em></td></tr><tr style="border-bottom:1px solid black;"><td>FW</td><td>foreign word</td><td><em>mais</em></td></tr><tr style="border-bottom:1px solid black;"><td>IN</td><td>conjunction, subordinating or preposition&nbsp;&nbsp;&nbsp;&nbsp;</td><td><em>of, on, before, unless</em></td></tr><tr style="border-bottom:1px solid black;"><td>JJ</td><td>adjective</td><td><em>nice, easy </em></td></tr><tr style="border-bottom:1px solid black;"><td>JJR</td><td>adjective, comparative</td><td><em>nicer, easier</em></td></tr><tr style="border-bottom:1px solid black;"><td>JJS</td><td>adjective, superlative</td><td><em>nicest, easiest</em></td></tr><tr style="border-bottom:1px solid black;"><td>LS</td><td>list item marker</td><td><em>&nbsp;</em></td></tr><tr style="border-bottom:1px solid black;"><td>MD</td><td>verb, modal auxillary</td><td><em>may, should</em></td></tr><tr style="border-bottom:1px solid black;"><td>NN</td><td>noun, singular or mass</td><td><em>tiger, chair, laughter</em></td></tr><tr style="border-bottom:1px solid black;"><td>NNS</td><td>noun, plural</td><td><em>tigers, chairs, insects</em></td></tr><tr style="border-bottom:1px solid black;"><td>NNP</td><td>noun, proper singular</td><td><em>Germany, God, Alice</em></td></tr><tr style="border-bottom:1px solid black;"><td>NNPS&nbsp;&nbsp;&nbsp;&nbsp;</td><td>noun, proper plural</td><td><em>we met two <span style="text-decoration: underline;">Christmases</span> ago</em></td></tr><tr style="border-bottom:1px solid black;"><td>PDT</td><td>predeterminer</td><td><em><span style="text-decoration: underline;">both</span> his children</em></td></tr><tr style="border-bottom:1px solid black;"><td>POS</td><td>possessive ending</td><td><em>\'s</em></td></tr><tr style="border-bottom:1px solid black;"><td>PRP</td><td>pronoun, personal</td><td><em>me, you, it</em></td></tr><tr style="border-bottom:1px solid black;"><td>PRP$</td><td>pronoun, possessive</td><td><em>my, your, our</em></td></tr><tr style="border-bottom:1px solid black;"><td>RB</td><td>adverb</td><td><em>extremely, loudly, hard&nbsp;</em></td></tr><tr style="border-bottom:1px solid black;"><td>RBR</td><td>adverb, comparative</td><td><em>better</em></td></tr><tr style="border-bottom:1px solid black;"><td>RBS</td><td>adverb, superlative</td><td><em>best</em></td></tr><tr style="border-bottom:1px solid black;"><td>RP</td><td>adverb, particle</td><td><em>about, off, up</em></td></tr><tr style="border-bottom:1px solid black;"><td>SYM</td><td>symbol</td><td><em>%</em></td></tr><tr style="border-bottom:1px solid black;"><td>TO</td><td>infinitival to</td><td><em>what <span style="text-decoration: underline;">to</span> do?</em></td></tr><tr style="border-bottom:1px solid black;"><td>UH</td><td>interjection</td><td><em>oh, oops, gosh</em></td></tr><tr style="border-bottom:1px solid black;"><td>VB</td><td>verb, base form</td><td><em>think</em></td></tr><tr style="border-bottom:1px solid black;"><td>VBZ</td><td>verb, 3rd person singular present</td><td><em>she <span style="text-decoration: underline;">thinks </span><br></em></td></tr><tr style="border-bottom:1px solid black;"><td>VBP</td><td>verb, non-3rd person singular present</td><td><em>I <span style="text-decoration: underline;">think </span><br></em></td></tr><tr style="border-bottom:1px solid black;"><td>VBD</td><td>verb, past tense</td><td><em>they <span style="text-decoration: underline;">thought </span><br></em></td></tr><tr style="border-bottom:1px solid black;"><td>VBN</td><td>verb, past participle</td><td><em>a <span style="text-decoration: underline;">sunken</span> ship</em></td></tr><tr style="border-bottom:1px solid black;"><td>VBG</td><td>verb, gerund or present participle</td><td><em><span style="text-decoration: underline;">thinking</span> is fun</em></td></tr><tr style="border-bottom:1px solid black;"><td>WDT</td><td><em>wh</em>-determiner</td><td><em>which, whatever, whichever</em></td></tr><tr style="border-bottom:1px solid black;"><td>WP</td><td><em>wh</em>-pronoun, personal</td><td><em>what, who, whom</em></td></tr><tr style="border-bottom:1px solid black;"><td>WP$</td><td><em>wh</em>-pronoun, possessive</td><td><em>whose, whosever</em></td></tr><tr style="border-bottom:1px solid black;"><td>WRB</td><td><em>wh</em>-adverb</td><td><em>where, when</em></td></tr><tr style="border-bottom:1px solid black;"><td>.</td><td>punctuation mark, sentence closer</td><td><em>. ; ? *</em></td></tr><tr style="border-bottom:1px solid black;"><td>,</td><td>punctuation mark, comma</td><td><em>,</em></td></tr><tr style="border-bottom:1px solid black;"><td>:</td><td>punctuation mark, colon</td><td><em>:</em></td></tr><tr style="border-bottom:1px solid black;"><td>(</td><td>contextual separator, left paren</td><td><em>(</em></td></tr><tr style="border-bottom:1px solid black;"><td>)</td><td>contextual separator, right paren</td><td><em>)</em></td></tr><tr style="border-bottom:1px solid black;"><td>SBAR</td><td>unexpected structures</td><td></td></tr><tr style="border-bottom:1px solid black;"><td>PRN</td><td>parenthesized structures</td><td></td></tr></tbody></table>'
    document.getElementById('graph').innerHTML = info + '<br>' + table + helptable;
  }

  function visualizeSplatPronouns() {
    console.log('pronouns');
    console.log($scope.results);
    var first = $scope.results[0]["first-person"];
    var first_keys = [];
    var second = $scope.results[0]["second-person"];
    var second_keys = [];
    var third = $scope.results[0]["third-person"];
    var third_keys = [];
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-yw4l{vertical-align:top}';
    var table = '<table class=' + style + ' style="font-weight:bold;">';
    table += '<tr style="border-bottom:1pt solid black;"><th>Pronoun&nbsp;&nbsp;</th><th>&nbsp;&nbsp;Frequency&nbsp;&nbsp;</th><th>&nbsp;&nbsp;Type</th></tr>';
    for(var pro in first) {
      var val = first[pro];
      if(val[0] > 0) {
        first_keys.push(pro);
        table += '<tr style="border-bottom:1pt solid black;"><td style="color:blue;">' + pro + '</td><td style="color:red;text-align:center;">' + val[0] + '</td><td>&nbsp;&nbsp;' + val[2] + ', ' + val[3] + '</td></tr>';
      }
    }
    for(var pro in second) {
      var val = second[pro];
      if(val[0] > 0) {
        second_keys.push(pro);
        table += '<tr style="border-bottom:1pt solid black;"><td style="color:green;">' + pro + '</td><td style="color:red;text-align:center;">' + val[0] + '</td><td>&nbsp;&nbsp;' + val[2] + ', ' + val[3] + '</td></tr>';
      }
    }
    for(var pro in third) {
      var val = third[pro];
      if(val[0] > 0) {
        third_keys.push(pro);
        table += '<tr style="border-bottom:1pt solid black;"><td style="color:purple;">' + pro + '</td><td style="color:red;text-align:center;">' + val[0] + '</td><td>&nbsp;&nbsp;' + val[2] + ', ' + val[3] + '</td></tr>';
      }
    }
    table += '</table>';
    var final_text = "";
    var num = 0;
    for(var sent in $scope.results[0]["sentences"]) {
      var temp_sent = '';
      var split_sent = $scope.results[0]["sentences"][sent].split(" ");
      // For each word in the current sentence...
      while(num < split_sent.length) {
        word = split_sent[num];
        if(first_keys.indexOf(word.toUpperCase()) >= 0) { temp_sent += '<b style="color:blue;font-size:16px;">' + word + ' </b>'; }
        else if(second_keys.indexOf(word.toUpperCase()) >= 0) { temp_sent += '<b style="color:green;font-size:16px;">' + word + ' </b>'; }
        else if(third_keys.indexOf(word.toUpperCase()) >= 0) { temp_sent += '<b style="color:purple;font-size:16px;">' + word + ' </b>'; }
        else { temp_sent += word + ' ' }
        num++;
      }
      num = 0;
      final_text += temp_sent + '<br>';
    }
    var help_text = '<br><div style="font-weight:bold;font-size:20px;"><span style="color:blue;">1st-Person</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:green;">2nd-Person</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:purple;">3rd-Person</span></div><br>'
    document.getElementById('graph').innerHTML = '<table style="width:100%;"><tr><td valign="top" style="width:35%;">' + help_text + table + '</td><td style="width:1%;"></td><td><br><span style="font-weight:bold;">' + final_text + '</span></td></tr></table>';
  }

  function visualizeSplatComplexity() {
    console.log('complexity');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-j2zy{background-color:#FCFBE3;vertical-align:top} .tg .tg-yw4l{vertical-align:top}';
    var table = '<br><table style="float:left;" class=' + style + '">';
    table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Complexity Metric</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Value</th><th></th></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" title="Content density is the ratio of open-class words (nouns, verbs, adjectives, adverbs) to closed-class words (pronouns, determiners, etc.)." style="color: darkgreen !important;"><b>Content Density:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["content_density"]).toFixed(3) + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" title="Idea density is the number of expressed propositions to the total number of words." style="color: darkgreen !important;"><b>Idea Density:</b><a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["idea_density"]).toFixed(3) + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Flesch-Kincaid_readability_tests#Flesch_reading_ease" target="_blank" title="Scores typically range from least complex (120) to most complex (0), but negative scores (extremely complex) are also possible." style="color: darkgreen !important;"><b>Flesch Readability:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["flesch_score"]).toFixed(3) + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Flesch-Kincaid_readability_tests#Flesch-Kincaid_grade_level" target="_blank" title="In theory, the lowest possible score (lowest grade level) is -3.4. In theory, there is no upper bound." style="color:darkgreen !important;"><b>Flesch-Kincaid Grade Level:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["kincaid_score"]).toFixed(3) + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" title="This is the ratio of types (number of unique words) to tokens (number of total words). Scores will be greater than 0 and less than or equal to 1, with higher numbers suggesting higher complexity." style="color:darkgreen !important;"><b>Type-Token Ratio:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0]["type_token_ratio"]).toFixed(3) + '</td><td>&nbsp;&nbsp;&nbsp;&nbsp;(' + $scope.results[0]["types"]  + ' / ' + $scope.results[0]["tokens"]  + ')</td></tr>';
    table += '</table>';
    var helptext = '<br><div><b>Hover over each metric below for descriptions. The table below (on the right) describes what the scores for Flesch readability indicate. Flesch-Kincaid grade level directly corresponds to a grade level; a Flesch-Kincaid grade level score of 2 indicates that the text should be easily understood by a second grader.</b></div>';
    var helptable = '<table style="float:left;margin-left:100px;"><tbody><tr style="border-bottom:1px solid black;"><th>Score</th><th>Grade Level</th></tr><tr style="border-bottom:1px solid black;"><td>&gt; 100.0</td><td>&lt; 5th Grade</td></tr><tr style="border-bottom:1px solid black;"><td>100.00-90.00&nbsp;&nbsp;&nbsp;&nbsp;</td><td>5th Grade</td></tr><tr style="border-bottom:1px solid black;"><td>90.0–80.0</td><td>6th Grade</td></tr><tr style="border-bottom:1px solid black;"><td>80.0–70.0</td><td>7th Grade</td></tr><tr style="border-bottom:1px solid black;"><td>70.0–60.0</td><td>8th-9th Grade</td></tr><tr style="border-bottom:1px solid black;"><td>60.0–50.0</td><td>10th-12th Grade</td></tr><tr style="border-bottom:1px solid black;"><td>50.0–30.0</td><td>College Undergraduate</td></tr><tr style="border-bottom:1px solid black;"><td>30.0–0.0</td><td>College Graduate</td></tr></tbody></table>'
    document.getElementById('graph').innerHTML = helptext + table + helptable;
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
          else if(word.toLowerCase().replace(/(\.*$|\?*$|,*$\!*$)/g, '') == "{sl}") { temp_sent += '<b style="color: purple;">' + word + ' ' + word + ' </b>'; }
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
        else if(word.toLowerCase().replace(/(\.*$|\?*$|,*$\!*$)/g, '') == "{sl}") { temp_sent += '<b style="color: purple;">' + word + ' </b>'; }
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

    final_text = final_text.replace(/(\.*$|\?*$|,*$|!*$)/g, '<span style="color: black !important;">' + '$1' + '</span>');

    // Display the visualization.
    document.getElementById("graph").innerHTML = '<span style="font-size: 20px;"' + display_text + final_text + '</span>';
  }

  function visualizeLengthStatistics() {
    console.log('length-statistics');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-j2zy{background-color:#FCFBE3;vertical-align:top} .tg .tg-yw4l{vertical-align:top}';

    var instructions = "<p>To make this analysis language-agnostic, it assumes that sentences are separated by standard ending punctuation (.?!) and words are separated by whitespace.</p>";
    document.getElementById('graph').innerHTML += instructions;

    function drawTable(contents, title){
      var formattedTitle = '<br><h3 class=' + style + '">' + title + ':</h3>';
      var table = '<table class=' + style + '">';
      table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Calculation</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Value</th><th></th></tr>';
      table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Mean" target="_blank" style="color:darkgreen !important;" title="The sum of values divided by the number of values"><b>Mean:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat(contents["mean"]).toFixed(3) + '</td><td></td></tr>';
      table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Median" target="_blank" style="color:darkgreen !important;" title="The middle value when values are sorted"><b>Median:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat(contents["median"]).toFixed(3) + '</td><td></td></tr>';
      table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Standard_deviation" target="_blank" style="color:darkgreen !important;" title="The amount of variance from the mean for a set of values"><b>Standard Deviation:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat(contents["std"]).toFixed(3) + '</td><td></td></tr>';
      table += '</table>';
      document.getElementById('graph').innerHTML += formattedTitle + table;
    }

    drawTable($scope.results[0]["words"], "Characters per Word");
    drawTable($scope.results[0]["sentences"], "Words per Sentence");
  }

  function visualizeTopicModel() {
    console.log('topic-model');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-j2zy{background-color:#FCFBE3;vertical-align:top} .tg .tg-yw4l{vertical-align:top}';
    for (var item in $scope.results) {
      var title = '<br><h3 class=' + style + '">Topic ' + item + ':</h3>';
      var table = '<table class=' + style + '">';
      table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Probability</th><th></th></tr>';
      for (var word in $scope.results[item]) {
        table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item][word].word + '</td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[item][word].probability).toFixed(8) + '</td><td></td></tr>';
      }
      table += '</table>';
      document.getElementById('graph').innerHTML = document.getElementById('graph').innerHTML + title + table;
    }
  }

  function visualizeWordVector() {
    console.log('word-vector');
    console.log($scope.results);
    var instructions = "<p>To use this analysis, create a text file (.txt) with one of the following commands per line, starting with the specific command followed by its arguments. Empty lines will be safely ignored. If you do not use this format, the analysis will fail to run.</p>";
    instructions += "<p>There are two available commands:</p>";
    instructions += "<dl>";
    instructions += "<dt>Similarity Score</dt><dd>The similarity score command has two arguments, which are the two words the similarity is being calculated for. For example, use <kbd>sim_score universities colleges</kbd> to find the similarity between <em>universities</em> and <em>colleges</em>. The score ranges from 0 to 1, with 0 the least similar and 1 the most similar.</dd>";
    instructions += "<dt>Similarity Equation</dt><dd>The similarity equation command has one or more arguments, which are the words used in the equation. Each word is prefixed by its operation (+ or -). For example, use <kbd>sim_math +woman +king -man</kbd> to find the result of <em>woman + king - man</em>. The top ten most likely answers are displayed. The scores range from 0 to 1, with 0 the least likely solution and 1 the most likely solution.</dd>";
    instructions += "<dt>Similar Words</dt><dd>The similar words command has one argument, which is the word used. For example, use <kbd>most_sim linguine</kbd> to find the most similar words to <em>linguine</em>. The top ten most similar words are displayed. The scores range from 0 to 1, with 0 the least similar and 1 the most similar.</dd>";
    instructions += "<dt>Doesn't Match</dt><dd>The doesn't match command has one or more arguments, which are the words used. For example, use <kbd>doesnt_match breakfast cereal dinner lunch</kbd> to find the word in the set that does not belong. The not-belonging word is displayed.</dd>";
    instructions += "</dl>";
    instructions += "<p>For a better understanding of word vectors, <a href='https://www.tensorflow.org/tutorials/representation/word2vec'>Vector Representations of Words | TensorFlow</a> has some useful information and diagrams.</p>";
    document.getElementById('graph').innerHTML = document.getElementById('graph').innerHTML + instructions;
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-j2zy{background-color:#FCFBE3;vertical-align:top} .tg .tg-yw4l{vertical-align:top}';
    for (var item in $scope.results) {
      if ($scope.results[item].type === "doesnt_match"){
        var title = '<br><h3 class=' + style + '">Command ' + (parseInt(item) + 1) + ' - Doesn\'t Match:</h3>';
        var table0 = '<table class=' + style + '">';
        table0 += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word</th><th></th></tr>';
        for (var word in $scope.results[item].words) {
          table0 += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].words[word] + '</td><td></td></tr>';
        }
        table0 += '</table><br>';
        var table = '<table class=' + style + '">';
        table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Doesn\'t Match Word</th><th></th></tr>';
        table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].answer + '</td><td></td></tr>';
        table += '</table><br>';
        document.getElementById('graph').innerHTML = document.getElementById('graph').innerHTML + title + table0 + table;
      } else if ($scope.results[item].type === "most_sim"){
        var title = '<br><h3 class=' + style + '">Command ' + (parseInt(item) + 1) + ' - Similar Words:</h3>';
        var table0 = '<table class=' + style + '">';
        table0 += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word</th><th></th></tr>';
        table0 += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].word + '</td><td></td></tr>';
        table0 += '</table><br>';
        var table = '<table class=' + style + '">';
        table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Score</th><th></th></tr>';
        for (var ans in $scope.results[item].answer) {
          table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].answer[ans].word + '</td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[item].answer[ans].score).toFixed(8) + '</td><td></td></tr>';
        }
        table += '</table>';
        document.getElementById('graph').innerHTML = document.getElementById('graph').innerHTML + title + table0 + table;
      } else if ($scope.results[item].type === "sim_score"){
        var title = '<br><h3 class=' + style + '">Command ' + (parseInt(item) + 1) + ' - Similarity Score:</h3>';
        var table = '<table class=' + style + '">';
        table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word 1</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Word 2</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Score</th><th></th></tr>';
        table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].word1 + '</td><td>&nbsp;&nbsp;</td><td style="color:darkgreen;">' + $scope.results[item].word2 + '</td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[item].score).toFixed(8) + '</td><td></td></tr>';
        table += '</table>';
        document.getElementById('graph').innerHTML = document.getElementById('graph').innerHTML + title + table;
      } else if ($scope.results[item].type === "sim_math"){
        var title = '<br><h3 class=' + style + '">Command ' + (parseInt(item) + 1) + ' - Similarity Equation:</h3>';
        var table0 = '<table class=' + style + '">';
        table0 += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Operation</th><th></th></tr>';
        for (var word in $scope.results[item].pos) {
          table0 += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].pos[word] + '</td><td>&nbsp;&nbsp;</td><td align="right">+</td><td></td></tr>';
        }
        for (var word in $scope.results[item].neg) {
          table0 += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].neg[word] + '</td><td>&nbsp;&nbsp;</td><td align="right">-</td><td></td></tr>';
        }
        table0 += '</table><br>';
        var table = '<table class=' + style + '">';
        table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Word</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Score</th><th></th></tr>';
        for (var ans in $scope.results[item].answer) {
          table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;">' + $scope.results[item].answer[ans].word + '</td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[item].answer[ans].score).toFixed(8) + '</td><td></td></tr>';
        }
        table += '</table>';
        document.getElementById('graph').innerHTML = document.getElementById('graph').innerHTML + title + table0 + table;
      } else if ($scope.results[item].type === "error") {
        var title = '<br><h3 class=' + style + '">Command ' + (parseInt(item) + 1) + ' - Unrecognized:</h3>';
        var description = 'The command <kbd>' + $scope.results[item].command + '</kbd> could not be processed.';
        document.getElementById('graph').innerHTML += title + description;
      }
    }
  }

  function visualizeUnsupMorph() {
    console.log('unsup-morph');
    console.log($scope.results);

    var instructions = "<p>The NULL suffix shown for some rows represents the plain stem form (so-called <a href='https://en.wikipedia.org/wiki/Null_morpheme'>zero suffix</a>).</p>";
    instructions += "<p>The categories are ranked, starting with the most confident suffix pattern. A random sample of associated stems are provided with each category, with up to 15 being displayed.</p>";
    document.getElementById('graph').innerHTML += instructions;

    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-yw4l{vertical-align:top}';
    var table = '<table class=' + style + '">';
    table += '<tr style="border-bottom: 1pt solid black;"><th class="tg-031e" style="text-align: center;">Suffixes</th><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th><th class="tg-yw4l">Stems (Sample)</th></tr>';

    for (var i in $scope.results[0]) {
      table += '<tr style="border-bottom: 1pt solid black;"><td style="text-align: center;"><b>' + $scope.results[0][i].affixes.join("<br>") + '</b></td>';
      table += '<td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td><b>' + $scope.results[0][i].roots.join("<br>") + '</b></td></tr>';
    }
    table += '</table>';
    document.getElementById('graph').innerHTML += table;
  }

  function visualizeBigramArray() {
    console.log('bigram-array');
    console.log($scope.results);

    var instructions = "<p>The left axis contains the first character in the bigram. The top axis contains the second character in the bigram.</p>";
    document.getElementById('graph').innerHTML += instructions;

    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:"Lucida Console", Monaco, monospace !important;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-yw4l{vertical-align:top}';
    var table = '<table class=' + style + '">';

    table += '<tr style="border-bottom: 1pt solid black;"><th class="tg-031e" style="text-align: center;"> </th><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th>'
    headerRows = [];
    $scope.results[0].chars.forEach(function (item) { headerRows.push('<th class="tg-031e" style="text-align: center;color:darkred;">' + item + '</th>')});
    table += headerRows.join('<th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th>');
    table += '</tr>';

    for (var i in $scope.results[0].chars) {
      first = $scope.results[0].chars[i]
      table += '<tr style="border-bottom: 1pt solid black;"><td style="text-align: center;color:darkred;"><b>' + first + '</b></td><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th>'
      row = [];
      $scope.results[0].chars.forEach(function (item) {
        var count = $scope.results[0].array[first][item];
        if (count > 0) count = '<b style="color:darkgreen;">' + count + '</b>';
        row.push('<td>' + count + '</td>');
      });
      table += row.join('<th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th>');
      table += '</tr>';
    }
    table += '</table>';
    document.getElementById('graph').innerHTML += table;
  }

  function visualizeSpeechTokenStats() {
    console.log('speech-token-stats');
    console.log($scope.results);
    var style = '.tg  {border-collapse:collapse;border-spacing:0;border-color:#aaa;} .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#333;background-color:#fff;border-top-width:1px;border-bottom-width:1px;} .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;border-color:#aaa;color:#fff;background-color:#f38630;border-top-width:1px;border-bottom-width:1px;} .tg .tg-j2zy{background-color:#FCFBE3;vertical-align:top} .tg .tg-yw4l{vertical-align:top}';

    var transcription = '<br><h3 class=' + style + '">' + 'Transcription' + ':</h3>';
    transcription += "<p>" + $scope.results[0].transcript + "</p>";
    document.getElementById('graph').innerHTML += transcription;

    var formattedTitle = '<br><h3 class=' + style + '">' + 'Statistics' + ':</h3>';
    var table = '<table class=' + style + '">';
    table += '<tr style="border-bottom: 1px solid black;"><th class="tg-y4wl">Calculation</th><th class="tg-y4wl">&nbsp;&nbsp;</th><th class="tg-y4wl">Value</th><th></th></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" target="_blank" style="color:darkgreen !important;" title="The count of bracketed non-word fillers (includes silence, noise, and untranscribable speech) in the transcript"><b>Number of non-word fillers:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + $scope.results[0].base_stats.num_fillers + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" target="_blank" style="color:darkgreen !important;" title="The count of words in the transcript"><b>Number of words:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + $scope.results[0].base_stats.num_words + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" target="_blank" style="color:darkgreen !important;" title="The total duration of the speech recording (might be different from non-word filler and word combined due to padding in the ASR system and overlapping in manual transcription)"><b>Total time:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + $scope.results[0].base_stats.total_time + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" target="_blank" style="color:darkgreen !important;" title="The total duration of non-word fillers in the speech recording"><b>Non-word filler time:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + $scope.results[0].base_stats.filler_time + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" target="_blank" style="color:darkgreen !important;" title="The total duration of words in the speech recording"><b>Word time:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + $scope.results[0].base_stats.word_time + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="https:\/\/en.wikipedia.org/wiki/Words_per_minute" target="_blank" style="color:darkgreen !important;" title="The number of words divided by the duration of the speech recording in minutes"><b>Words per minute:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0].base_stats.words_per_minute).toFixed(2) + '</td><td></td></tr>';
    table += '<tr style="border-bottom: 1px solid black;"><td style="color:darkgreen;"><a href="javascript:void(0);" target="_blank" style="color:darkgreen !important;" title="The number of syllables divided by the duration of the speech recording in minutes"><b>Syllables per minute:</b></a></td><td>&nbsp;&nbsp;</td><td align="right">' + parseFloat($scope.results[0].base_stats.syllables_per_minute).toFixed(2) + '</td><td></td></tr>';
    table += '</table>';
    document.getElementById('graph').innerHTML += formattedTitle + table;

    formattedTitle = '<br><h3 class=' + style + '">' + 'Longest Words' + ':</h3>';
    table = '<table class=' + style + '">';
    table += '<tr style="border-bottom: 1pt solid black;"><th class="tg-031e" style="text-align: center;">Word</th><th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th><th class="tg-yw4l">Length (seconds)</th></tr>';

    for (var i in $scope.results[0].longest_tokens) {
      table += '<tr style="border-bottom: 1pt solid black;"><td style="text-align: center;"><b>' + $scope.results[0].longest_tokens[i].word + '</b></td>';
      table += '<td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td><b>' + $scope.results[0].longest_tokens[i].length + '</b></td></tr>';
    }
    table += '</table>';
    document.getElementById('graph').innerHTML += formattedTitle + table;

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
        case "char-ngrams":
          visualizeSplatNgrams();
          break;
        case "splat-pos":
          visualizeSplatPOSFrequencies();
          break;
        case "splat-syllables":
          visualizeSplatSyllables();
          break;
        case "splat-pronouns":
          visualizeSplatPronouns();
          break;
        case "length-stats":
          visualizeLengthStatistics();
          break;
        case "topic-model-10":
        case "topic-model-30":
          visualizeTopicModel();
          break;
        case "word-vector":
          visualizeWordVector();
          break;
        case "unsup-morph":
          visualizeUnsupMorph();
          break;
        case "bigram-array":
          visualizeBigramArray();
          break;
        case "speech-token-stats":
          visualizeSpeechTokenStats();
          break;
        default:
          break;
    }
  };
  }
})();

