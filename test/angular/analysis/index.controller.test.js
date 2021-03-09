describe('AnalysisIndexController', function() {
    var createController, $controller, $rootScope, $scope, $httpBackend;

    beforeEach(module('linguine'));

    beforeEach(inject(function($injector) {

        $controller = $injector.get('$controller');

        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope.$new();
        $httpBackend = $injector.get('$httpBackend');

        createController = function() {
            return $controller('AnalysisIndexController', {
                $scope: $scope
            });
        }
    }));

    it('should be able to find the right corpus', function(done) {
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
        $httpBackend.whenGET('api/analysis').respond(200, []);

        createController();
        $httpBackend.flush();
        var corpus = $scope.findCorpus(1);
        expect(corpus).to.equal($scope.corpora[0]);
        done();
    });

    it('should delete erroneous analyses', function(done) {
        var date = new Date();
        date.setHours(date.getHours() - 13);
        analyses = [{
                _id: 1,
                user_id: 1,
                analyses: "Error Analyses",
                corpora_ids: [1],
                cleanup_ids: [],
                result: [],
                tokenizer: "",
                eta: 30,
                complete: false,
                time_created: date,
                analyses: "error"

            },
            {
                _id: 2,
                user_id: 2,
                analyses: "Term Frequency Analyses",
                corpora_ids: [10],
                cleanup_ids: [],
                result: [],
                tokenizer: "",
                eta: 30,
                complete: true,
                time_created: Date(),
                analyses: "length-stats"

            }
        ];

        $scope.analyses = analyses;
        $httpBackend.whenGET('api/analysis').respond(200, analyses);
        $httpBackend.whenGET('api/corpora').respond(200, []);
        $httpBackend.whenDELETE('api/analysis/1').respond(204, {});

        createController();
        $scope.errorDelete();
        $httpBackend.flush();
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
        done();
    });
});