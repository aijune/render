define(["render"], function (render) {

    var $ = render.$;

    var History = function (stack, index) {
        this.stack = stack || [];
        this.activeIndex = index || 0;
    }

    History.prototype = {

        constructor: History,

        getActive: function() {
            return this.stack[ this.activeIndex ];
        },

        getLast: function() {
            return this.stack[ this.previousIndex ];
        },

        getNext: function() {
            return this.stack[ this.activeIndex + 1 ];
        },

        getPrev: function() {
            return this.stack[ this.activeIndex - 1 ];
        },

        add: function( url, data ) {
            data = data || {};

            if ( this.getNext() ) {
                this.clearForward();
            }

            data.url = url;
            this.stack.push( data );
            this.activeIndex = this.stack.length - 1;
        },

        clearForward: function() {
            this.stack = this.stack.slice( 0, this.activeIndex + 1 );
        },

        find: function( url, stack, earlyReturn ) {
            stack = stack || this.stack;

            var entry, i, length = stack.length, index;

            for ( i = 0; i < length; i++ ) {
                entry = stack[i];

                if ( decodeURIComponent(url) === decodeURIComponent(entry.url)) {
                    index = i;

                    if ( earlyReturn ) {
                        return index;
                    }
                }
            }

            return index;
        },

        closest: function( url ) {
            var closest, a = this.activeIndex + 1;

            closest = this.find( url, this.stack.slice(0, a) );

            if ( closest === undefined ) {
                closest = this.find( url, this.stack.slice(a), true );
                closest = closest === undefined ? closest : closest + a;
            }

            return closest;
        },

        direct: function( opts ) {
            var newActiveIndex = this.closest( opts.url ), a = this.activeIndex;

            if ( newActiveIndex !== undefined ) {
                this.activeIndex = newActiveIndex;
                this.previousIndex = a;
            }

            if ( newActiveIndex === undefined && opts.error ) {
                opts.error( this.getActive() );
            }
            else if(opts.success){
                opts.success( this.getActive(), "back" );
            }
        }
    };


    var Router = function (options) {
        options = options || {};

        this.mode = options.mode || "hash";
        this.error = options.error || function () {};
        this.layout = options.layout;
        this.routes = options.routes || {};
        this.view = $(".router-view");
        this.path = "";
        this.paths = [];
        this.prevPaths = [];
        this.count = -1;

        this.history = new History();
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
                that._handleEvent(location.hash.substring(1));
            });

            $(function () {
                if(!location.hash || location.hash === "#"){
                    location.hash = "#/"
                }
                else{
                    that._match(location.hash.substring(1), that, {});
                }
            })
        },

        _history: function () {
            var that = this;

            $(window).on("popstate", function () {
                that._handleEvent(location.pathname);
            });

            $(function () {
                that._match(location.pathname, that, {});
            });
        },

        _handleEvent: function(url){
            var that = this;
            that.history.direct({
                url: url,
                success: function (state) {
                    that._match(url, that, state);
                },
                error: function (state) {
                    that.error.call(that, that.view, state);
                }
            });
        },

        _match: function (path, router, state) {
            var that = this;
            var handler, view, prevPath;

            this.count++;
            prevPath = this.prevPaths[this.count] || {};

            $.Deferred(function (dfd) {
                if($.isFunction(router.layout)){
                    if(router.path !== prevPath.path){
                        router.layout.call(that, router.view, state, function () {
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
                that.paths.push({
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
                    handler.call(that, view, state);
                }
                else if(handler && handler.routes){
                    handler.view = view || router.view;
                    return that._match(path.substring(handler.path.length), handler);
                }
                else{
                    that.error.call(that, that.view, state);
                }

                that.count = -1;
                that.prevPaths = this.paths;
                that.paths = [];
            });
        },

        go: function (url, title, state, event) {
            if(this.mode !== "static"){
                event && event.preventDefault();
                if(title){
                    document.title = title;
                }

                this.history.add(url, state);

                if(this.mode === "hash"){
                    location.hash = "#" + url;
                }
                else if(this.mode === "history"){
                    history.pushState({}, null, url);
                    this._match(url, this, state);
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