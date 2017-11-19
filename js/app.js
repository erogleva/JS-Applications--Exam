$(() => {
    //App start
    if(sessionStorage.getItem('authtoken') === null){
        userLoggedOut();
        showView('viewWelcome');
    } else {
        userLoggedIn();
        displayCatalog();
    }

    //Navigation
    $("#linkCatalog").on('click', function(){
        displayCatalog();

    });

    $("#linkMyPosts").on('click', function(){
        showView('viewMyPosts');
        loadMyPosts();
    });

    $("#linkSubmit").on('click', function () {
        showSubmitForm();
    });
    
    function showView(viewName) {
        $('div.content > section').hide();
        $('#' + viewName).show();
    }

    function showSubmitForm() {
        $('#submitForm').trigger('reset');
        showView('viewSubmit');
    }

    //User registration
    $("#registerForm").submit(registerUser);
    function registerUser(ev) {
        ev.preventDefault();
        let registerUsername = $('#registerUsername');
        let registerPassword = $('#registerPasswd');
        let registerRepeatedPasswd = $("#registerRepeatedPasswd");

        let usernameVal = registerUsername.val();
        let passwordVal = registerPassword.val();
        let repeatedpasswordVal = registerRepeatedPasswd.val();

        if(passwordVal !== repeatedpasswordVal){
            showError('Passwords do not match!');
        } else if (!/[A-Za-z]{3,}/.test(usernameVal)) {
            showError('Username should be at least 3 characters long and contain only english letters!')
        } else if (!/[A-Za-z0-9]{6,}/.test(passwordVal)){
            showError('Password should be at least at least 6 characters long and should contain only english alphabet letters and digits')
        } else {
            auth.register(usernameVal, passwordVal)
                .then((userInfo) => {
                    saveSession(userInfo);
                    registerUsername.val("");
                    registerPassword.val("");
                    registerRepeatedPasswd.val("");
                    showView('viewCatalog');
                    userLoggedIn();
                    showInfo('User registration successful.');
                }).catch(handleError);
        }
    }
    
    //User login
    $("#loginForm").submit(loginUser);
    function loginUser(ev) {
        ev.preventDefault();
        let inputUsername = $('#loginUsername');
        let inputPassword = $('#loginPasswd');

        let usernameVal = inputUsername.val();
        let passwdVal = inputPassword.val();

        auth.login(usernameVal, passwdVal)
            .then((userInfo) => {
                saveSession(userInfo);
                inputUsername.val('');
                inputPassword.val('');
                showInfo('Login successful.');
                displayCatalog();
                userLoggedIn();
            }).catch(handleError);
    }
    
    //User logout
    $("#linkLogout").on('click', function () {
        auth.logout()
            .then(() => {
                sessionStorage.clear();
                showInfo('Logout successful.');
                userLoggedOut();
            }).catch(handleError); 
    });

    // Catalog
    function displayCatalog() {
        showView('viewCatalog');

        requester.get('appdata', 'posts?query={}&sort={"_kmd.ect": -1}', 'kinvey')
            .then((posts) => {
                let container = $("#viewCatalog").find(".posts");
                displayPosts(posts, container);
            }).
            catch(handleError);
    }

    //Create new post
    $("#submitForm").submit(createPost);
    function createPost(ev) {
        ev.preventDefault();

        let postUrl = $("#postUrl");
        let postTitle = $("#postTitle");
        let postComment = $("#postComment");
        let postImg = $("#postImage");
        let postAuthor = sessionStorage.getItem('username');

        let postData = {
            "author": postAuthor,
            "title": postTitle.val(),
            "description": postComment.val(),
            "url": postUrl.val(),
            "imageUrl":postImg.val()
        };

        if(postUrl.val().substring(0, 4) !== 'http'){
            showError('Url should start with "http"');
        } else if(postUrl.val() == ''){
            showError('Url is required!')
        } else if(postTitle.val() == ''){
            showError('Title is required!')
        } else {
            requester.post('appdata', 'posts', 'kinvey', postData).
            then(() => {
                showInfo('Post created successfully');
                displayCatalog();
                postUrl.val('');
                postTitle.val('');
                postComment.val('');
                postImg.val();
            }).
            catch(handleError);
        }
    }

    //Edit post
    function editPost() {
        showView('viewEdit');
        let postId = $(this).parents("article").attr('data-id');

        let editDescription = $("#editPostDescription");
        let editTitle = $("#editPostTitle");
        let editImg = $("#editPostImg");
        let editUrl = $("#editPostUrl");

        requester.get('appdata', `posts/${postId}`, 'kinvey').
        then((post) => {
            let link = post['url'];
            let imageUrl = post['imageUrl'];
            let title = post['title'];
            let description = post['description'];

            editDescription.val(description);
            editTitle.val(title);
            editImg.val(imageUrl);
            editUrl.val(link);
            })
            .catch(handleError);

        $("#editPostForm").submit(editPostAction);

        function editPostAction() {

            let postAuthor = sessionStorage.getItem('username');

            let postData = {
                "author": postAuthor,
                "title": editTitle.val(),
                "description": editDescription.val(),
                "url": editUrl.val(),
                "imageUrl":editImg.val()
            };

            if(editUrl.val().substring(0, 4) !== 'http'){
                showError('Url should start with "http"');
            } else if(editUrl.val() == ''){
                showError('Url is required!')
            } else if(editTitle.val() == ''){
                showError('Title is required!')
            } else {
                requester.update('appdata', `posts/${postId}`, 'kinvey', postData).then((post) => {
                    showInfo(`Post ${post['title']} updated successfully`);
                    displayCatalog();

                }).
                catch(handleError);
            }

        }



    }

    //Delete post
    function deletePost() {
        let postId = $(this).parents("article").attr('data-id');
        requester.remove('appdata', `posts/${postId}`, 'kinvey').
        then(()=>{
               showInfo('Post deleted successfully');
               displayCatalog();
            }
        ).catch(handleError);
    }

    //Load post comments
    function loadComments(postId) {
        showView("viewComments");
        let postDiv = $("#singlePostDisplay").attr("data-id", postId);
        postDiv.empty();

        requester.get('appdata', `posts/${postId}`, 'kinvey').then((post) => {
            let isAuthor = false;

            let postUrl = post['url'];
            let postTitle = post['title'];
            let postImgUrl = post['imageUrl'];
            let postDescription;

            if(post['description'] == ""){
                postDescription = "No description"
            } else {
                postDescription = post['description']
            }

            let days = calcTime(post['_kmd']['lmt']);

            let author = post['author'];

            if(author == sessionStorage.getItem('username')){
                isAuthor = true;
            }

            postDiv.append($("<div>").addClass("col thumbnail").
            append($("<a>").attr("href", postUrl)).append($(`<img src=${postImgUrl}>`)).
            append($("<div>").addClass("post-content").
            append($("<div>").addClass("title").append($("<a>").attr("href", postUrl).text(postTitle))))).
            append($("<div>").addClass("details").append($("<p>").text(postDescription)).append($("<div>").addClass("info").text(`submitted ${days} days ago by ${author}`)));

            if(isAuthor){
                if(isAuthor){
                    postDiv.append($("<div>").addClass("controls").append($("<ul>").
                    append($("<li>").addClass("action").
                    append($("<a>").addClass("editLink").attr("href", "#").text('edit').on('click', editPost))).
                    append($("<li>").addClass("action").
                    append($("<a>").addClass("deleteLink").attr("href", "#").text('delete').on('click', deletePost)))));
                }
            }

            postDiv.append($("<div>").addClass("clear"));


            $("#commentForm").parent().attr("data-id", postId);
            $("#commentForm").submit(sendComment);

            $("#viewComments").find("article").remove();

            requester.get('appdata', `comments?query={"postId":"${postId}"}&sort={"_kmd.ect": -1}`, 'kinvey').then((comments) => {
                 if(comments.length == 0){
                     let div = $("<article>").addClass("post post-content").append($("<p>").text('No comments yet!'));
                     $("#viewComments").append(div);
                 } else {
                     for (let comment of comments){
                         let content = comment['content'];
                         let author = comment['author'];
                         let date = calcTime(comment["_kmd"]["lmt"]);
                         let commentArticle = $("<article>").addClass("post post-content").append($("<p>").text(content)).append();

                         let infoDiv = $("<div>").addClass("info").text(`submitted ${date} days ago by ${author}`);

                         if(author == sessionStorage.getItem('username')){
                             infoDiv.append($())
                         }

                         $("#viewComments").append(commentArticle);
                     }
                 }
                }).catch(handleError);
        });

    }
    

    //Load post by user
    function loadMyPosts() {
        let username = sessionStorage.getItem('username');
        console.log(username);

        requester.get('appdata', `posts?query={"author":"${username}"}&sort={"_kmd.ect": -1}`, 'kinvey').then((posts) => {
            let container = $("#viewMyPosts").find(".posts");

            displayPosts(posts, container);
        }).
        catch(handleError);
    }

    //Helper functions
    function saveSession(userInfo) {
        let userAuth = userInfo._kmd.authtoken;
        sessionStorage.setItem('authtoken', userAuth);
        let userId = userInfo._id;
        sessionStorage.setItem('userId', userId);
        let username = userInfo.username;
        sessionStorage.setItem('username', username);
    }

    function userLoggedIn() {
        let username = sessionStorage.getItem('username');
        let profile = $("#profile");
        profile.find("span").text(username);
        profile.show();
        $("#menu").show();
    }
    
    function userLoggedOut() {
        $("#profile").hide();
        $("#menu").hide();
        showView('viewWelcome');
    }

    function handleError(reason) {
        showError(reason.responseJSON.description);
    }

    function showInfo(message) {
        let infoBox = $('#infoBox');
        infoBox.text(message);
        infoBox.show();
        setTimeout(() => infoBox.fadeOut(), 3000);
    }
    
    function showError(message) {
        let errorBox = $('#errorBox');
        errorBox.text(message);
        errorBox.show();
        setTimeout(() => errorBox.fadeOut(), 3000);
    }

    $(document).on({
        ajaxStart: () => $("#loadingBox").show(),
        ajaxStop: () => $('#loadingBox').fadeOut()
    });

    function calcTime(dateIsoFormat) {
        let diff = new Date - (new Date(dateIsoFormat));
        diff = Math.floor(diff / 60000);
        if (diff < 1) return 'less than a minute';
        if (diff < 60) return diff + ' minute' + pluralize(diff);
        diff = Math.floor(diff / 60);
        if (diff < 24) return diff + ' hour' + pluralize(diff);
        diff = Math.floor(diff / 24);
        if (diff < 30) return diff + ' day' + pluralize(diff);
        diff = Math.floor(diff / 30);
        if (diff < 12) return diff + ' month' + pluralize(diff);
        diff = Math.floor(diff / 12);
        return diff + ' year' + pluralize(diff);
        function pluralize(value) { if (value !== 1) return 's';
        else return '';
        }
    }

    function displayPosts(posts, container) {
        container.empty();
        let postRank = 1;

        if(posts.length == 0){
            container.text("No posts in the database")
        } else {

            for(let post of posts){
                let rank = postRank;
                postRank++;
                let link = post['url'];
                let imageUrl = post['imageUrl'];
                let title = post['title'];
                let days = calcTime(post['_kmd']['lmt']);
                let author = post['author'];
                let articleId = post['_id'];

                let isAuthor = false;

                if(author == sessionStorage.getItem('username')){
                    isAuthor = true;
                }

                let postArticle = $("<article>").addClass("post").attr('data-id', articleId).
                append($("<div>").addClass("col-rank").append(`<span>${rank}</span>`)).
                append($("<div>").addClass("col thumbnail").append($("<a>").attr("href", `${link}`).append($(`<img src=${imageUrl}>`)))).                   append($("<div>").addClass("post-content").append($("<div>").addClass("title").append($(`<a href="${link}">
                ${title}
                </a>`))).
                append($("<div>").addClass("details").
                append($(`<div class="info">
                                submitted ${days} ago by ${author}
                            </div>`)).
                append($("<div>").addClass("controls").
                append($("<ul>").
                append($("<li>").addClass("action").
                append($("<a>").addClass("commentsLink").attr("href", "#").text('comments').on('click', function() {
                    let postId = $(this).parents("article").attr('data-id');
                    loadComments(postId);
                })))))));

                if(isAuthor){
                    postArticle.find("ul").
                    append($("<li>").addClass("action").
                    append($("<a>").addClass("editLink").attr("href", "#").text('edit').on('click', editPost))).
                    append($("<li>").addClass("action").
                    append($("<a>").addClass("deleteLink").attr("href", "#").text('delete').on('click', deletePost)));
                }

                container.append(postArticle);
        }

        }
    }

    function sendComment(ev) {
        ev.preventDefault();
        let commentText = $("#commentText");
        let postId = $(this).parent().attr("data-id");

        let commentData = {
            "content": commentText.val(),
            "author": sessionStorage.getItem('username'),
            "postId": postId
        };

        requester.post('appdata', 'comments', 'kinvey', commentData).then(()=> {
                commentText.val('');
                showInfo('Comment posted sucessfully');
                loadComments(postId);
        }).
        catch(handleError);
    }
});