describe('CorporaNewController', function() {
    var createController, $controller, $scope, $rootScope, $httpBackend, $upload, $state, flash;

    beforeEach(module('linguine'));
    beforeEach(inject(function($injector) {
        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope.$new();
        $httpBackend = $injector.get('$httpBackend');
        $controller = $injector.get('$controller');
        $upload = $injector.get('$upload');
        $state = $injector.get('$state');
        flash = $injector.get('flash');
        $httpBackend.whenGET('templates/home/index').respond(200, '');
        $httpBackend.whenGET('templates/corpora/index').respond(200, '');
        $httpBackend.whenGET('api/logged_in').respond(200, {
            loggedIn: true,
            user: {
                dce: 'jd1234',
                name: 'John Doe',
                _id: 1
            }
        });
        createController = function() {
            return $controller('CorporaNewController', {
                $scope: $scope,
                $upload: $upload,
                $state: $state,
                flash: flash
            });
        }
    }));

    describe('onCreateCorpus', function() {
        it('should work', function(done) {
            createController();
            $scope.corpus = {
                fileName: 'Thing',
                fileSize: 100,
                fileType: 'text'
            };

            $scope.files = [$scope.corpus];
            $scope.upload();
            $httpBackend.whenPOST('api/corpora').respond(201, {});
            $httpBackend.flush();
            // expect($state.current.name).to.equal('linguine.corpora.index');

            done();
        });

        it("should display error when no title", function(done) {
            createController();
            $scope.corpus = {
                fileName: 'Thing2',
                fileSize: 1002,
                fileType: 'text2'
            };

            $scope.files = [$scope.corpus];
            $scope.upload();
            expect(flash.danger.getMessage()).to.equal('Your corpus must have a title.');
            done();
        });

        it("should display an error when upload file greater than max limit", function(done) {
            createController();
            $scope.corpus = {
                fileName: 'Thing',
                fileSize: 1000000,
                fileType: 'text'
            };

            $scope.files = [$scope.corpus];
            $scope.corpus.title = "TestThing";
            $scope.upload();
            $httpBackend.expectPOST('api/corpora').respond(413, {});
            $httpBackend.expectGET('api/corpora/max_size').respond(200, { max_size_kb: 35 });
            $httpBackend.flush();
            expect(flash.danger.getMessage()).to.equal('The file size is too large! (over 35KB)');
            done();
        });

        it('show throw error', function(done) {
            createController();
            $scope.upload();
            expect(flash.danger.getMessage()).to.equal('You have not uploaded a corpus.');
            done();
        });
    });
});