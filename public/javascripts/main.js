define(["render", "w/badge"], function (render) {

    render("#layout", {

        renders: {
            main: function (o, w) {
                return [
                    ["widget[name=badge]", {
                        type: "primary",
                        pill: true,
                        content: 45
                    }, ],
                    ["widget[name=badge]", {
                        tag: "a",
                        href: "#",
                        type: "primary",
                        pill: true,
                        content: 45
                    }]
                ];
            }
        }

    });


});
