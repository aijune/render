define(["render"], function (render) {

    render.widget("badge", {

        defaultTag: "span",

        options: {
            type: "primary",
            pill: false,
            content: ""
        },

        renders: {
            main: function (o, w) {
                var isA = o.tag === "a";
                return ["this.badge", {
                    class: [
                        "badge-" + o.type,
                        !!o.pill && "badge-pill",
                        isA && o.focus && "focus"
                    ],
                    href: isA && o.href,
                    target: isA && o.target
                }, o.content];
            }
        }

    });

});