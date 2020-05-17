define(["render"], function (render) {

    var $ = render.$;

    var Router = function (options) {
        options = options || {};

        this.mode = options.mode || "hash";
        this.error = options.error || function () {};
        this.layout = options.layout;
        this.routes = options.routes || {};
        this.view = $(".router-view");
        this.path = "";
        this.state = {};
        this.paths = [];
        this.prevPaths = [];
        this.count = -1;

        this._init();
    };

    Router.prototype = {

        constructor: Router,

        _init: function () {

            if(this.mode === "hash"){
                this._hash();
            }
            else if(this.mode === "history"){
                this._history();
            }
        },

        _hash: function(){

            var that = this;

            $(window).on("hashchange", function () {
                that._match(location.hash.substring(1), that);
            });

            $(function () {
                if(!location.hash || location.hash === "#"){
                    location.hash = "#/"
                }
                else{
                    that._match(location.hash.substring(1), that);
                }
            })
        },

        _history: function () {

            var that = this;

            $(window).on("popstate", function () {
                that._match(location.pathname, that);
            });

            $(function () {
                that._match(location.pathname, that);
            });
        },

        _match: function (path, router) {
            var that = this;
            var handler, view, prevPath;

            this.count++;
            prevPath = this.prevPaths[this.count] || {};

            $.Deferred(function (dfd) {
                if($.isFunction(router.layout)){
                    if(router.path !== prevPath.path){
                        router.layout.call(this, router.view, this.state, function () {
                            view = router.view.find(".router-view");
                            dfd.resolveWith(that);
                        });
                    }
                    else{
                        view = prevPath.view;
                        dfd.resolveWith(that);
                    }
                }
                else{
                    view = router.view;
                    dfd.resolveWith(that);
                }
            }).done(function () {
                this.paths.push({
                    path: router.path,
                    view: view
                });

                $.each(router.routes, function (key, route) {
                    if(path === key){
                        handler = route;
                        return  false;
                    }
                    else if(path.indexOf(key) === 0){
                        handler = route;
                        handler.path = key;
                    }
                });

                if($.isFunction(handler)){
                    $.each(view.data(), function (key, value) {
                        if(/^widgets/.test(key)){
                            value.destroy();
                        }
                    });
                    handler.call(this, view, this.state);
                }
                else if(handler && handler.routes){
                    handler.view = view || router.view;
                    return this._match(path.substring(handler.path.length), handler);
                }
                else{
                    this.error.call(this, this.view, this.state);
                }

                this.count = -1;
                this.prevPaths = this.paths;
                this.paths = [];
            });
        },

        go: function (path, title, state, event) {
            if(this.mode !== "static"){
                event && event.preventDefault();
                if(title){
                    document.title = title;
                }

                if(this.mode === "hash"){
                    location.hash = "#" + path;
                }
                else if(this.mode === "history"){
                    history.pushState({}, null, path);
                }
            }
        }
    };

    var router;

    render.router = function (options) {
        return router = new Router(options);
    };

    render.router.go = function (path, title, state, event) {
        router.go(path, title, state, event);
    };
});