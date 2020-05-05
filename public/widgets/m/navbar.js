define(["render"], function (render) {

    render.widget("navbar", {

        options: {
            fixed: false,
            title: "",
            left: {
                icon: "",
                text: "",
                click: null
            },
            right: {
                icon: "",
                text: "",
                click: null
            }
        },

        renders: {
            main: function (o, w) {
                if(o.fixed){
                    return ["this.m-navbar-placeholder", [
                        ["div.m-navbar.m-hairline-bottom.m-navbar-fixed", [
                            ["render[name=content]"]
                        ]]
                    ]];
                }
                else{
                    return ["div.m-navbar.m-hairline-bottom", [
                        ["render[name=content]"]
                    ]];
                }
            },
            content: function (o, w) {
                return [
                    ["render[name=left]", o.left],
                    ["div.m-navbar-title.m-ellipsis", o.title],
                    ["render[name=right]", o.right]
                ];
            },
            left: function (left, o, w) {
                return ["div.m-navbar-left", {onclick: [w._click, left]}, [
                    !!left.icon && ["i.m-navbar-left-icon", {class: left.icon === true ? "m-icon m-icon-arrow-left" : left.icon}],
                    !!left.text && ["span.m-navbar-text", left.text]
                ]];
            },
            right: function (right, o, w) {
                return ["div.m-navbar-right", {onclick: [w._click, right]}, [
                    !!right.text && ["span.m-navbar-text", right.text],
                    !!right.icon && ["i.m-navbar-right-icon", {class: right.icon}]
                ]];
            }
        },

        _click: function (item, e, raw) {
            if(item.onclick){
                item.onclick(e, {item: item});
            }
        }
    });

});