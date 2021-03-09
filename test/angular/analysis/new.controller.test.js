describe('AnalysisNewController', function() {
    var createController, $controller, $scope, $rootScope, $httpBackend, $state, flash;

    beforeEach(module('linguine'));
    beforeEach(inject(function($injector) {
        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope.$new();
        $httpBackend = $injector.get('$httpBackend');
        $controller = $injector.get('$controller');
        $state = $injector.get('$state');
        flash = $injector.get('flash');

        $httpBackend.whenGET('templates/home/index').respond(200, '');
        $httpBackend.whenGET('templates/analysis/index').respond(200, '');
        $httpBackend.whenGET('api/logged_in').respond(200, {
            loggedIn: true,
            user: {
                dce: 'jd1234',
                name: 'John Doe',
                _id: 1
            }
        });

        createController = function() {
            return $controller('AnalysisNewController', {
                $scope: $scope,
                $state: $state,
                flash: flash
            });
        }
    }));

    describe('analysis', function() {
        it('checkIfNoPreprocessingAvailable', function(done) {
            createController();

            $scope.analysisTypes = [{
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: true,
                tokenizerRequired: true
            }];

            $scope.cleanupTypes = {
                "test-operation": []
            };

            $scope.tokenizerTypes = [{
                name: "test Tokenizer",
                unfriendly_name: "test_tokenizer",
                description: "This is a test tokenizer"
            }];

            $httpBackend.whenGET('api/corpora').respond(200, [{
                    _id: 1,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags']
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word']
                }
            ]);

            $scope.selectedAnalysis = {
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: false,
                tokenizerRequired: true
            }
            $scope.onPreprocessingTabClick(this);
            expect(flash.info.getMessage()).to.equal('No preprocessing options are available for First Test Analysis');
            expect($scope.tabs[0].active).to.be.false;
            expect($scope.tabs[1].active).to.be.false;
            expect($scope.tabs[2].active).to.be.true;
            done();
        });

        it('onPreprocessingTabClick', function(done) {
            createController();

            $scope.onPreprocessingTabClick(this);
            expect(flash.danger.getMessage()).to.equal('Please select an analysis before selecting preprocessing options.');
            done();
        });

        it('onCorporaTabClick - activeCount > 1', function(done) {
            createController();
            $scope.corpora = [{
                    _id: 1,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags'],
                    active: true
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word'],
                    active: true
                }
            ];
            $scope.selectedAnalysis = {
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: false,
                tokenizerRequired: false
            }
            $scope.onCorporaTabClick(this);
            expect(flash.info.getMessage()).to.equal('First Test AnalysisCannot be used with multiple corpora. Please choose a new corpora.');
            expect($scope.tabs[0].active).to.be.false;
            expect($scope.tabs[1].active).to.be.true;
            expect($scope.tabs[2].active).to.be.false;
            done();
        });
    });

    describe('onCreateAnalysis', function() {
        it('should show error message when no tokenizer is selected', function(done) {
            createController();
            $scope.needTokenizer = true;
            $scope.selectedAnalysis = {
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: false,
                tokenizerRequired: true
            }
            $scope.onCreateAnalysis();
            expect(flash.info.getMessage()).to.equal('The selected analysis requires a tokenizer to complete.');
            done();
        });

        it('no corpora selected', function(done) {
            createController();
            $scope.corpora = [{
                    _id: 1,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags'],
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word'],
                }
            ];
            $scope.selectedAnalysis = {
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: false,
                tokenizerRequired: false
            }
            $scope.onCreateAnalysis();
            expect(flash.info.getMessage()).to.equal('Please select a corpora before continuing.');
            done();
        });

        it('sucessfully create an analysis', function(done) {
            createController();
            var cleanups = {
                "test_porter": {
                    name: "Test Porter",
                    unfriendly_name: "test_porter",
                    description: "test cleanup"
                }
            };

            $scope.cleanupTypes = {
                "test-operation": [cleanups.test_porter]
            };

            $scope.tokenizerTypes = [{
                name: "test Tokenizer",
                unfriendly_name: "test_tokenizer",
                description: "This is a test tokenizer"
            }];

            $scope.corpora = [{
                    _id: 1,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags'],
                    active: true
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word'],
                }
            ];

            $scope.selectedAnalysis = {
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: false,
                tokenizerRequired: false
            };

            $scope.analysis.analysisName = "First Test Analysis";

            var payload = {
                corpora_ids: 1,
                cleanup: "test_porter",
                operation: "test-operation",
                tokenizer: "test_tokenizer",
                library: "",
                transaction_id: "",
                analysis_name: "First Test Analysis",
                time_created: new Date().getTime(),
                user_id: 1
            };

            $httpBackend.whenGET('api/corpora').respond(200, [{
                    _id: 1,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags']
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word']
                }
            ]);

            $httpBackend.expectPOST('api/analysis').respond(200, payload);
            $scope.onCreateAnalysis();
            $httpBackend.flush();
            expect($state.current.name).to.equal('linguine.analysis.index');
            done();
        });

        it('error occurred while creating analysis', function(done) {
            createController();
            $scope.corpora = [{
                    _id: 1,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags'],
                    active: true
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: new Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word'],
                }
            ];

            $scope.selectedAnalysis = {
                name: 'First Test Analysis',
                unfriendly_name: "test-operation",
                description: "This is just a test analysis",
                multipleCorporaAllowed: false,
                tokenAllowed: false,
                tokenizerRequired: false
            };

            $scope.analysis.analysisName = "First Test Analysis";
            $httpBackend.whenGET('api/corpora').respond(200, [{
                    _id: 1,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'file_name.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'File Name',
                    contents: "Here are some contents brah",
                    tags: ['here', 'are', 'tags']
                },
                {
                    _id: 2,
                    user_id: 1,
                    createdAt: Date(),
                    fileName: 'something.txt',
                    fileSize: 100,
                    fileType: 'text',
                    title: 'Something',
                    contents: "Wow contents are cool",
                    tags: ['here', 'are', 'tags', 'word']
                }
            ]);

            $httpBackend.expectPOST('api/analysis').respond(400, {});
            $scope.onCreateAnalysis();
            $httpBackend.flush();
            expect(flash.danger.getMessage()).to.equal('An error occurred while trying to create your analysis.');
            expect($state.current.name).to.equal('linguine.index');
            done();
        });
    });

});