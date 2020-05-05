define(["render", "router"], function(render){
    render.router({
        mode: "hash",
        routes: {
            "./": function (view, state) {
                require(["home"], function (home) {
                    new home(view, {state: state});
                });
            }
        }
    });
});