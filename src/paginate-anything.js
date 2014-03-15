(function() {
  'use strict';

  angular.module('begriffs.paginate-anything', []).

    directive('pagination', function () {
      return {
        restrict: 'E',
        scope: {
          url: '=',
          headers: '&',
          collection: '=',

          page: '=?',
          perPage: '=?',
          perPagePresets: '=?',
          linkGroupSize: '=?',

          // directive -> app communication only
          numPages: '=?',
          numItems: '=?'
        },
        templateUrl: function(element, attr) {
          return attr.templateUrl || 'tpl/paginate-anything.html';
        },
        replace: true,
        controller: ['$scope', '$http', function($scope, $http) {

          $scope.paginated      = false;
          $scope.perPagePresets = [25, 50, 100, 200];
          $scope.serverLimit    = Infinity; // it's not known yet
          var lgs = $scope.linkGroupSize;
          $scope.linkGroupSize  = typeof(lgs) === 'number' ? lgs : 3;

          $scope.Math = window.Math; // for the template

          $scope.gotoPage = function (i) {
            if(i < 0 || i >= $scope.numPages) {
              return;
            }

            var pp = $scope.perPage || 100;
            $scope.page = i;
            requestRange({
              from: i * pp,
              to: (i+1) * pp - 1
            });
          };

          $scope.linkGroupFirst = function() {
            var rightDebt = Math.max( 0,
              $scope.linkGroupSize - ($scope.numPages - 1 - ($scope.page + 2))
            );
            return Math.max( 0,
              $scope.page - ($scope.linkGroupSize + rightDebt)
            );
          };

          $scope.linkGroupLast = function() {
            var leftDebt = Math.max( 0,
              $scope.linkGroupSize - ($scope.page - 2)
            );
            return Math.min( $scope.numPages-1,
              $scope.page + ($scope.linkGroupSize + leftDebt)
            );
          };

          $scope.isFinite = function() {
            return $scope.numPages < Infinity;
          };

          function requestRange(request) {
            $http({
              method: 'GET',
              url: $scope.url,
              headers: angular.extend(
                {}, $scope.headers,
                { 'Range-Unit': 'items', Range: [request.from, request.to].join('-') }
              )
            }).success(function (data, status, headers) {
              $scope.collection = data;

              var response = parseRange(headers('Content-Range'));

              $scope.numItems = response ? response.total : data.length;

              if(response && length(response) < response.total) {
                $scope.paginated = true;

                if(
                  (request.to  < response.total - 1) ||
                  (response.to < response.total - 1 &&
                                 response.total < request.to)
                ) {
                  $scope.perPage = length(response);
                  $scope.serverLimit = length(response);
                }
                $scope.numPages = Math.ceil(response.total / $scope.perPage);
              }
            });
          }

          $scope.gotoPage($scope.page || 0);

          $scope.$watch('page', function(newPage, oldPage) {
            if(newPage !== oldPage) {
              $scope.gotoPage(newPage);
            }
          });

          $scope.$watch('perPage', function(newPp, oldPp) {
            if(typeof(oldPp) === 'number' && newPp !== oldPp) {
              var middle = ($scope.page + 0.49) * oldPp;
              $scope.gotoPage(Math.floor(Math.min($scope.numItems - 1, middle) / newPp));
            }
          });

          $scope.$watch('serverLimit', function(newLimit, oldLimit) {
            if(newLimit !== oldLimit) {
              var level, limit = newLimit, presets = [], val;
              for(level = 0; level < 4; level++) {
                val = 5 * Math.round(limit / 5);
                if(presets[0] !== val) {
                  presets.unshift(val);
                }
                limit = limit / 2;
              }
              $scope.perPagePresets = presets;
            }
          });

        }],
      };
    }).

    filter('makeRange', function() {
      // http://stackoverflow.com/a/14932395/3102996
      return function(input) {
        var lowBound, highBound;
        switch (input.length) {
          case 1:
            lowBound = 0;
            highBound = parseInt(input[0]) - 1;
            break;
          case 2:
            lowBound = parseInt(input[0]);
            highBound = parseInt(input[1]);
            break;
          default:
            return input;
        }
        var result = [];
        for (var i = lowBound; i <= highBound; i++) { result.push(i); }
        return result;
      };
    });


  function parseRange(hdr) {
    var m = hdr && hdr.match(/^(\d+)-(\d+)\/(\d+|\*)$/);
    if(!m) { return null; }
    return {
      from: +m[1],
      to: +m[2],
      total: m[3] === '*' ? Infinity : +m[3]
    };
  }

  function length(range) {
    return range.to - range.from + 1;
  }
}());
