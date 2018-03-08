'use strict';
angular.module('myApp.pageManagement', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
  $routeProvider
    .when('/pageManagement', {
        templateUrl: 'pageManagement/pageManagement.html',
        controller: 'pageManagementCtrl'
    })
    .when('/pageManagement/:id', {
        templateUrl: 'pageManagement/pageDetails.html',
        controller: 'pageManagementCtrl'
    })
}])
.controller('pageManagementCtrl', pageManagementCtrl);
 function pageManagementCtrl($rootScope, $scope, $http, $timeout, $q) {
     var baseUrl = 'https://graph.facebook.com/v2.12/';
     var userAccessToken = 'EAAGFXteeOAMBABRiF2PwJb5XdKf9aPGzRAujXPg9oxQVWG4wmEI2ZChLOTSeWzpM97qIQV1f0bBx9m3SA0kG2ZAeIF21kZCU78wu5LXwsPCFLp4P5nVcuw3DGeFlvEq4zQvobj9wWHmtDUafXPrDc9APqVuy5GfQYwGiqZA3P4OFJANdnjJDfYzX8v1CHDPpJ2pxculrVgZDZD'
    $scope.pageInfo = new PageInfo();
    getPages();


    $scope.selected = null;
    $scope.newPost = new PagePostRequest();
    $scope.expandUnpublished = true;
    $scope.expandPublished = true;
    $scope.expandTotalPosts = false;

    $scope.expandWritePost = false;
    $scope.pagesLoaded = false;
    $scope.message = {text: "", clazz: ""}

    var pageAccessToken = null;
    var appToken = '428117367601155|3-bVaWlmhAcgyUW8L1lPGpzjON0';

    //*** POST requests ***//

    //write a published post
    $scope.createPost = function(){
        //set date with hours and minutes
        $scope.newPost.scheduledTime.date.setHours($scope.newPost.scheduledTime.hour);
        $scope.newPost.scheduledTime.date.setMinutes($scope.newPost.scheduledTime.min);

        if(!validatePost()){
            return;
        }

        var createPostUrl = baseUrl+$scope.selected.id
        +'/feed?published='+$scope.newPost.publish
        +'&message='+$scope.newPost.message
        +"&access_token="+$scope.selected.access_token;

        if(!$scope.newPost.publish){
            createPostUrl+"&scheduled_publish_time="+Math.floor($scope.newPost.scheduledTime.date.getTime()/1000)
        }

        $http.post(createPostUrl)
            .then(function(postResponse){
                if(postResponse){
                    var newWritePost = new PagePost(postResponse.data.id);
                    newWritePost.message = $scope.newPost.message;
                    newWritePost.isPublished = $scope.newPost.isPublished;
                    newWritePost.reached = 0;
                    newWritePost.createdTime = new Date();

                    $scope.pageInfo.pages[$scope.selected.id].addPost(newWritePost);

                    $scope.newPost.finishMessage.text = 'Posted!';
                    $timeout(function(){ return clearForm()}, 3000);
                }
            }, function(error){
                $scope.newPost.finishMessage.text = error.data.error.message;
                $scope.newPost.finishMessage.clazz = 'text-danger';
                $timeout(function(){return clearForm()}, 3000);
            })

    }




    //*** GET requests ***//

    //gets the page details
    $scope.getPageDetails = function(){
        if($scope.selected == null){
            setMessage('Please select a page', 'bad');
            return;
        } else {
            var pageDetailUrl = baseUrl+$scope.selected.id+'?fields=published_posts.limit(100){is_published,created_time,message,insights.metric(post_impressions_unique)},scheduled_posts.limit(100){is_published,created_time,message,insights.metric(post_impressions_unique)}'
            $http.get(pageDetailUrl, {params: {'access_token': $scope.selected.access_token}})
                .then(function(res){
                    console.log("get page details repsonse");
                    console.dir(res);


                    var publishedPosts = res.data.published_posts ? res.data.published_posts.data : [];
                    var scheduledPosts = res.data.scheduled_posts ? res.data.scheduled_posts.data : [];

                    //combine posts
                    var posts = publishedPosts.concat(scheduledPosts);
                    if(posts.length  > 0){
                        var postList = getPostList(posts);
                        //only do this to initialize the posts list
                        var map = $scope.pageInfo.pages[$scope.selected.id];

                        if(map.arePostsEmpty()){
                           initializePostList(postList);
                        }
                    }
                }, function(error){
                    setMessage(error.data.message, 'bad');
                    return;
                });

            $scope.showPageDetails = true;
        }
    }


    /*** HELPER FUNCTIONS ***/

    //used to initialize post list for page
    var initializePostList = function(posts){
        posts.sort(function(a,b){return a.createdTime-b.createdTime})

        posts.forEach(function(p){
            $scope.pageInfo.pages[$scope.selected.id].addPost(p);
        });
        console.log("done initializing post list: "+posts.length+" posts");
    }

    //formats each post to a PagePost
    var getPostList = function(posts){
        console.log('getPostList()');
        var postList = [];

        posts.forEach(function(post){
            var newPost = new PagePost(post.id);

            newPost.createdTime = post.created_time;
            newPost.message = post.message;
            newPost.isPublished = post.is_published;

            //if the insights aren't showing up, generate a new user token
            //make sure you have all of the following permissions:
            //1) manage_pages
            //2) pages_show_list
            //3) publish_pages
            //4)read_insights ***
            newPost.reached = post.insights ? post.insights.data[0].values[0].value : 0;
            postList.push(newPost);
        })

        return postList;
    }


    var setMessage = function(message, type){
        $scope.message.text = message;
        $scope.message.clazz = type == 'bad' ? 'text-danger' : 'text-success';

        //clear message after 2 seconds
        $timeout(function(){
            $scope.message.text = "";
            $scope.message.clazz = "";
        }, 2000)
    }

      var validatePost = function(){
            var isValid = false;

            console.log("this tieh new post ");
            console.dir($scope.newPost)
            if($scope.newPost.scheduled){
                var todayOrig = new Date();
                var dateOrig = $scope.newPost.scheduledTime.date;

                var today = Date.parse(new Date().toString());
                var date = Date.parse(dateOrig.toString())

                //date is supposed to be in the future, so we subtract today from date
                var diff = date-today;
                var minutes = diff/1000/60

                if(diff < 0){
                    setMessage("Posts can only be scheduled for the future!", 'bad');
                } else if(minutes < 10){
                    setMessage("Posts have to be scheduled for greater than 10 minutes from now!", 'bad');
                 }  else if(dateOrig.getMonth()-todayOrig.getMonth() > 6){
                    setMessage("Posts have to be scheduled for less than 6 months from now!", 'bad');
                 }
             } else if($scope.newPost.message.length == 0){
                setMessage("A message is required", 'bad');
             } else {
                isValid = true;
             }

            console.log("new post fields are valid? : "+isValid);
            return isValid;
        }

    //populates the initial page dropdown
    function getPages(){
        console.log("getPages()")
        $http.get(baseUrl+'me/accounts', {params: {"access_token": userAccessToken }})
            .then(function(res){
                if(res.data){
                    res.data.data.forEach(function(p){
                        var page = new Page(p.id, p.access_token, p.name, p.category);
                        $scope.pageInfo.addPage(page);
                    })
                    $scope.pagesLoaded = true;
                }
            }, function(error){
                setMessage(error.data.error.message, 'bad');
                return;
            }
        )
    }

    //clears the new post form
    var clearForm = function(){
        $scope.newPost = new PagePostRequest();
    }


    /* custom data types */

    //pages container
    function PageInfo(){
        //pages map, key is id, value is the rest
        this.pages = {};
    }

    PageInfo.prototype.addPage = function(page){
        if(this.pages[page.id] == null){
            this.pages[page.id] = page
        }
    }

    //the page object
    function Page(id, access_token, name, category){
        this.id = id;
        this.access_token = access_token;
        this.name = name;
        this.category = category;
        this.posts = {
            pubCount: 0,
            unpubCount: 0,
            published: {},
            unpublished: {}
        };
    }

    Page.prototype.addPost = function(post){
       var newPost = new PagePost(post.id);

       newPost.message = post.message;
       newPost.isPublished = post.is_published;
       newPost.createdTime = post.created_time;
       newPost.reached = post.reached;

       if(post.isPublished && this.posts.published[post.id] == null){
           this.posts.pubCount++;
           this.posts.published[post.id] = post;
       } else if(!post.isPublished && this.posts.unpublished[post.id] == null) {
           this.posts.unpubCount++;
           this.posts.unpublished[post.id] = post;
       }
    }

    Page.prototype.arePostsEmpty = function(){
        return Object.keys(this.posts.published).length == 0 && Object.keys(this.posts.unpublished).length == 0;
    }

    //the page post object
    function PagePost(id){
        this.id = id;
        this.message = "";
        this.isPublished = true;
        this.createdTime = new Date();
        this.reached = 0;
    }

    function PagePostRequest(id){
        var today = new Date();
        var hour = today.getHours();
        var min = today.getMinutes()+11;

        this.id = id;
        this.message = "";
        this.publish = true;
        this.scheduled = !this.publish;
        this.scheduledTime = {date: today, hour: hour.toString(), min: min.toString()}
        this.finishMessage = {text: "", clazz: "text-success"};
    }
}
