describe('CorporaIndexController', function() {
    var createController, $controller, $scope, $rootScope, $httpBackend;

    beforeEach(module('linguine'));
    beforeEach(inject(function($injector) {
        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope.$new;
        $httpBackend = $injector.get('$httpBackend');
        $controller = $injector.get('$controller');
        createController = function() {
            return $controller('CorporaIndexController', {
                $scope: $scope
            });
        }
    }));

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('corpora', function() {
        it('should get the corpora', function(done) {
            $httpBackend.whenGET('api/corpora').respond(200, [{
                    title: 'Thing',
                    fileName: 'thing.txt',
                    tags: ['something', 'or', 'other'],
                },
                {
                    title: 'Other Thing',
                    fileName: 'other_thing.txt',
                    tags: ['something', 'or', 'other'],
                },
            ]);

            $httpBackend.whenGET('api/corpora/quota').respond(200, []);

            createController();
            $httpBackend.flush();
            expect($scope.corpora).to.have.length(2);
            done();
        });

        it('should remove the tag from the corpora', function(done) {
            $scope.corpora = [{
                _id: 1,
                title: 'Thing',
                fileName: 'thing.txt',
                tags: ['something', 'or', 'other'],
            }];

            $httpBackend.whenGET('api/corpora/quota').respond(200, []);

            createController();
            $httpBackend.expectPUT('api/corpora/1/removeTag', { "tagName": "or" }).respond(200, '');
            $scope.removeTag(1, 'or');
            $httpBackend.whenGET('api/corpora').respond(200, [{
                _id: 1,
                title: 'Thing',
                fileName: 'thing.txt',
                tags: ['something', 'other'],
            }]);
            $httpBackend.flush();
            expect($scope.corpora[0]['tags']).to.have.length(2);
            done();
        });
    });
});