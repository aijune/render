define(["render"], function (render) {

    render.widget("alert", {

        options: {
            type: "primary", //primary,secondary,success,info,warning,danger,light,dark
            closable: true,
            animate: {
                enter: "fadeIn",
                leave: "fadeOut"
            },

            closed: false
        },

        renders: {
            main: function (o, w) {
                return !o.closed && ["this.alert[role=alert]", {
                    class: [
                        "alert-" + o.type,
                        !!o.closable && "alert-closable",
                        {name: "animate__animated", init: !!o.animate && "add"},
                        {name: "animate__" + o.animate.enter, init: !!o.animate && "add"},
                        {name: "animate__" + o.animate.leave, destroy: !!o.animate && "add"}
                    ],
                    ondestroy: [w._remove, o]
                }, [
                    ["slot[name=default]", function (s, o, w) {
                        return s.text || s.children;
                    }],
                    !!o.closable && ["button.close[type=button][aria-label=Close]", {
                        onclick: w._close
                    }, [
                        ["span[aria-hidden=true]", "&times;"]
                    ]]
                ]];
            }
        },

        _close: function () {
            this._update({
                closed: true
            });
        },

        _remove: function (o, raw, rm) {
            !o.animate ? rm() :
                render.$(raw.node).one("animationend", function () {
                    rm();
                });
        }

    });

});