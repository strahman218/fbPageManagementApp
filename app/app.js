'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.pageManagement',
  'myApp.view2',
  'myApp.version'
]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');

  $routeProvider
  .when('/', {
    templateUrl: '/views/home.html',
    controller: ['$scope','$timeout', '$window', function($scope, $timeout, $window){
        $scope.goToPageManagement = function(){
            $window.location = '/#!/pageManagement';
        }
    }]
  })
  .otherwise({redirectTo: '/pageManagement'});
}]);
