define(["render", "history"], function (render) {

    var $ = render.$;

    var Router = function (o) {
        o = o || {};

        this.mode = o.mode || "history";
        this.error = o.error || function () {};
        this.layout = o.layout;
        this.routes = o.routes || {};
        this.view = $(".router-view");
        this.path = "";
        this.paths = [];
        this.prevPaths = [];
        this.count = -1;

        this._init();
    };

    Router.prototype = {

        constructor: Router,

        _init: function () {
            var that = this;

            render.history.init({
                html4Mode: this.mode === "hash" ? true : false
            });

            render.history.Adapter.bind(window, "statechange", function(){
                that.state = render.history.getState();
                that._match(that.state.hash, that);
            });

            render.history.pushState({}, null, "/");
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

        go: function (o) {
            if(this.mode !== "backend"){
                o.event && o.event.preventDefault();
                render.history.pushState(o.data || {}, o.title || "", o.url || "");
            }
        }
    };

    var router;

    render.router = function (o) {
        return router = new Router(o);
    };

    render.router.go = function (o) {
        router.go(o);
    };
});