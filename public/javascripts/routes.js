define(["render", "router"], function(render){

    render.router({

        mode: "hash",

        layout: function(view, state, next){
            require(["w/layout"], function (layout) {
                render(view, layout);
                next();
            });
        },

        routes: {
            "/": function (view, state) {
                require(["pageWelcome"], function (pageWelcome) {
                    render(view, pageWelcome);
                });
            },
            "/dropdown": function (view, state) {
                require(["demodropdown"], function () {
                    view.demodropdown({
                        route: state
                    });
                });
            },
            "/modal": function (view, state) {
                require(["demomodal"], function () {
                    view.demomodal({
                        route: state
                    });
                });
            },
            "/popup": function (view, state) {
                require(["demopopup"], function () {
                    view.demopopup({
                        route: state
                    });
                });
            },
            "/picker": function (view, state) {
                require(["demopicker"], function () {
                    view.demopicker({
                        route: state
                    });
                });
            },
            "/forms": function (view, state) {
                require(["pageForms"], function (pageForms) {
                    render(view, pageForms);
                });
            },
            "/buttons": function (view, state) {
                view.html(444);
                //view.buttons();
            },
            "/icons": function (view, state) {
                view.html(555);
                //view.icons();
            }
        }
    });

});