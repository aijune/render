define(["render"], function (render) {

    $ = render.$;

    return render.widget("page", {

        options: {

        },

        renders: {
            main: function(o, w){
                return ["this.page", [
                    ["render[name=title]"],
                    ["render[name=content]"]
                ]];
            },
            title: function (o, w) {
                return ["div.layout-title",
                    ["slot[name=title]", function (s, o, w) {
                        return s.text || s.children;
                    }],
                    ["slot[name=btngroup]", function (s, o, w) {
                        return ["div.btn-group", {
                            onclick: [w._click, s.data]
                        }, [
                            s.children
                        ]];
                    }]
                ];
            },
            content: function (o, w) {
                return ["div.layout-content", {
                    style: {
                        minHeight: w._minHeight
                    }
                }, [
                    ["slot[name=content]", function (s, o, w) {
                        return s.children;
                    }]
                ]];
            }
        },

        _click: function (data, e) {
            if(data.onclick){
                data.onclick(data, e, $(e.target).raw());
            }
        },

        _minHeight: function () {
            return $(window).height() - $(".layout-header").outerHeight() - $(".layout-title").outerHeight();
        }

    });

});
