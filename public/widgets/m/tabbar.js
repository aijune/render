define(["render"], function (render) {

    render.widget("tabbar", {

        options: {
            fixed: false,
            active: 0,
            items: []
        },

        renders: {
            main: function (o, w) {
                if(o.fixed){
                    return ["this.m-tabbar-placeholder", [
                        ["div.m-tabbar.m-hairline-top.m-tabbar-fixed", [
                            ["render[name=item]", o.items]
                        ]]
                    ]];
                }
                else{
                    return ["div.m-tabbar.m-hairline-top", [
                        ["render[name=item]", o.items]
                    ]];
                }
            },
            item: function (item, i, o, w) {
                return ["div.m-tabbar-item", {
                    class: (o.active === i) && "m-tabbar-item-active",
                    onclick: [w._click, item, i]
                }, [
                    !!item.icon && ["div.m-tabbar-item-icon", [
                        ["i", {class: item.icon}],
                        !!item.badge && ["div.m-info", item.badge],
                        !!item.dot && !item.badge && ["div.m-info.m-info-dot"]
                    ]],
                    !!item.text && ["div.m-tabbar-item-text", item.text]
                ]];
            }
        },

        _click: function (item, i, e, raw) {
            this._update({active: i}, function (o) {
                if (o.onchange) {
                    o.onchange(e, {item: item, index: i});
                }
            });
        }
    });

});